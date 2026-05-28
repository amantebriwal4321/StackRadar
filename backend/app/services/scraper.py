"""
Data Ingestion Layer — fetches raw data from multiple sources.

Sources:
  - GitHub API (specific repo stats via GET /repos/{owner}/{repo})
  - HackerNews Firebase API (top stories)
  - Dev.to API (latest articles)
  - Reddit JSON API (posts from tech subreddits)
  - Tech News RSS feeds (TechCrunch, Ars Technica, The Verge)

Phase 1 improvements:
  - ETag caching (conditional requests — saves rate limit on unchanged repos)
  - Adaptive rate limiting (reads X-RateLimit-Remaining, backs off dynamically)
  - Shared httpx.AsyncClient (connection pooling across all GitHub calls)
  - Token validation on startup
"""

import httpx
import logging
import asyncio
import feedparser
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GITHUB — Targeted Repo Stats (Phase 1 Hardened)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ETag cache: {owner_repo: (etag_value, cached_response_dict)}
_etag_cache: Dict[str, Tuple[str, Dict[str, Any]]] = {}

# Rate budget tracker (updated per-request from response headers)
_rate_remaining: int = 5000
_rate_limit: int = 5000

# Validate token on module load
_gh_token = settings.GITHUB_TOKEN
if _gh_token:
    logger.info(f"GitHub token loaded: {_gh_token[:8]}*** (len={len(_gh_token)})")
else:
    logger.warning("⚠️  GITHUB_TOKEN is empty — GitHub API will use unauthenticated rate limit (60 req/hr)")

MAX_RETRIES = 2
RETRY_BACKOFF = [2.0, 5.0]


def _build_github_headers() -> Dict[str, str]:
    """Build GitHub API headers with optional auth token."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = settings.GITHUB_TOKEN
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _adaptive_delay() -> float:
    """Calculate delay based on remaining rate limit budget."""
    global _rate_remaining
    if _rate_remaining < 10:
        return 60.0
    elif _rate_remaining < 50:
        return 15.0
    elif _rate_remaining < 100:
        return 5.0
    elif _rate_remaining < 500:
        return 1.0
    return 0.3


def _update_rate_budget(response: httpx.Response) -> None:
    """Update rate limit tracking from response headers."""
    global _rate_remaining, _rate_limit
    remaining_str = response.headers.get("x-ratelimit-remaining", "")
    limit_str = response.headers.get("x-ratelimit-limit", "")
    if remaining_str.isdigit():
        _rate_remaining = int(remaining_str)
    if limit_str.isdigit():
        _rate_limit = int(limit_str)


async def validate_github_token(client: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Validate GitHub token by hitting the rate_limit endpoint.
    Returns rate limit info. Called once at the start of each scrape cycle.
    """
    global _rate_remaining, _rate_limit
    try:
        headers = _build_github_headers()
        response = await client.get("https://api.github.com/rate_limit", headers=headers, timeout=10.0)
        if response.status_code == 200:
            data = response.json()
            core = data.get("resources", {}).get("core", {})
            _rate_limit = core.get("limit", 60)
            _rate_remaining = core.get("remaining", 60)
            logger.info(
                f"GitHub rate limit: {_rate_remaining}/{_rate_limit} "
                f"({'authenticated ✅' if _rate_limit > 60 else 'unauthenticated ⚠️'})"
            )
            if _rate_limit <= 60:
                logger.warning(
                    "⚠️  GitHub token is missing or invalid — only 60 requests/hour. "
                    "Set GITHUB_TOKEN in .env for 5,000 requests/hour."
                )
            return core
        else:
            logger.warning(f"GitHub rate_limit check returned {response.status_code}")
    except Exception as e:
        logger.warning(f"GitHub rate_limit check failed: {e}")
    return {}


async def fetch_github_repo_stats(
    owner_repo: str,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[Dict[str, Any]]:
    """
    Fetch stats for a specific GitHub repo (e.g. 'facebook/react').

    Uses conditional requests (If-None-Match/ETag) to avoid consuming
    rate limit on unchanged repos. Returns cached data on 304.
    """
    global _rate_remaining

    headers = _build_github_headers()

    # Add ETag for conditional request (Phase 1.1)
    cached_etag, cached_data = _etag_cache.get(owner_repo, (None, None))
    if cached_etag:
        headers["If-None-Match"] = cached_etag

    url = f"https://api.github.com/repos/{owner_repo}"
    owns_client = client is None

    if owns_client:
        client = httpx.AsyncClient()

    try:
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = await client.get(url, headers=headers, timeout=15.0)
                _update_rate_budget(response)

                if response.status_code == 304:
                    # Not modified — return cached data (free! no rate limit consumed)
                    logger.debug(f"GitHub '{owner_repo}': 304 Not Modified (cached)")
                    return cached_data

                if response.status_code == 200:
                    data = response.json()

                    # Cache the ETag for next request
                    etag = response.headers.get("etag")
                    result = {
                        "stars": data.get("stargazers_count", 0),
                        "forks": data.get("forks_count", 0),
                        "watchers": data.get("subscribers_count", 0),
                        "open_issues": data.get("open_issues_count", 0),
                        "description": data.get("description", ""),
                    }
                    if etag:
                        _etag_cache[owner_repo] = (etag, result)

                    logger.debug(
                        f"GitHub '{owner_repo}': ⭐{result['stars']:,} "
                        f"(rate: {_rate_remaining}/{_rate_limit})"
                    )
                    return result

                elif response.status_code == 404:
                    logger.error(f"GitHub 404: repo '{owner_repo}' not found")
                    return None

                elif response.status_code in (401, 403, 429):
                    wait = 60
                    logger.warning(
                        f"GitHub rate limit hit (HTTP {response.status_code}) for '{owner_repo}' "
                        f"(rate: {_rate_remaining}/{_rate_limit}, attempt {attempt + 1}). "
                        f"Sleeping {wait}s..."
                    )
                    await asyncio.sleep(wait)
                    continue

                elif response.status_code >= 500:
                    logger.error(f"GitHub {response.status_code} server error for '{owner_repo}'")
                else:
                    logger.error(f"GitHub unexpected {response.status_code} for '{owner_repo}'")

            except httpx.TimeoutException:
                logger.warning(f"GitHub timeout for '{owner_repo}' (attempt {attempt + 1})")
            except httpx.ConnectError as e:
                logger.error(f"GitHub connection error for '{owner_repo}': {e}")
                return None
            except Exception as e:
                logger.error(f"GitHub unexpected error for '{owner_repo}': {type(e).__name__}: {e}")

            # Backoff before retry
            if attempt < MAX_RETRIES:
                delay = RETRY_BACKOFF[attempt]
                logger.info(f"GitHub: retrying '{owner_repo}' in {delay}s...")
                await asyncio.sleep(delay)

        logger.error(f"GitHub: all {MAX_RETRIES + 1} attempts failed for '{owner_repo}'")
        return None

    finally:
        if owns_client:
            await client.aclose()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HACKERNEWS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def fetch_hackernews() -> List[Dict[str, Any]]:
    """Fetch top 50 stories from HackerNews Firebase API (concurrent batches)."""
    url_topstories = "https://hacker-news.firebaseio.com/v0/topstories.json"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url_topstories, timeout=10.0)
            response.raise_for_status()
            story_ids = response.json()[:50]

            async def fetch_story(story_id: int) -> Optional[Dict[str, Any]]:
                try:
                    story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
                    story_res = await client.get(story_url, timeout=5.0)
                    if story_res.status_code == 200:
                        story_data = story_res.json()
                        if story_data and story_data.get("type") == "story":
                            return story_data
                except Exception:
                    pass
                return None

            # Fetch in batches of 10
            stories: List[Dict[str, Any]] = []
            for i in range(0, len(story_ids), 10):
                batch = story_ids[i:i + 10]
                results = await asyncio.gather(*[fetch_story(sid) for sid in batch])
                stories.extend([s for s in results if s])

            return stories
        except Exception as e:
            logger.error(f"HackerNews API Error: {e}")
            return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEV.TO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def fetch_devto() -> List[Dict[str, Any]]:
    """Fetch latest articles from Dev.to API."""
    url = "https://dev.to/api/articles"
    params = {"per_page": 50, "top": 1}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Dev.to API Error: {e}")
            return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REDDIT — RSS feeds (no OAuth required)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REDDIT_SUBREDDITS = [
    "programming",
    "MachineLearning",
    "webdev",
    "netsec",
    "devops",
    "cryptocurrency",
    "cloudcomputing",
    "artificial",
    "reactjs",
    "rust",
    "golang",
]

async def fetch_reddit() -> List[Dict[str, Any]]:
    """Fetch hot posts from tech subreddits using RSS feeds (no auth needed)."""
    posts: List[Dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for subreddit in REDDIT_SUBREDDITS:
            try:
                url = f"https://www.reddit.com/r/{subreddit}/hot.rss"
                headers = {"User-Agent": "StackRadar/2.0 (Tech Trend Analyzer)"}
                response = await client.get(url, headers=headers, timeout=10.0)

                if response.status_code == 200:
                    feed = feedparser.parse(response.text)
                    for entry in feed.entries[:15]:
                        posts.append({
                            "title": entry.get("title", ""),
                            "url": entry.get("link", ""),
                            "subreddit": subreddit,
                            "source": "reddit",
                        })
                    logger.info(f"Reddit r/{subreddit}: {len(feed.entries[:15])} posts via RSS")
                elif response.status_code == 429:
                    logger.warning(f"Reddit rate limited on r/{subreddit}, skipping remaining")
                    break
                else:
                    logger.warning(f"Reddit r/{subreddit} returned {response.status_code}")

                await asyncio.sleep(1.0)
            except Exception as e:
                logger.error(f"Reddit r/{subreddit} Error: {e}")
                continue

    return posts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TECH NEWS (RSS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RSS_FEEDS = [
    "https://techcrunch.com/feed/",
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "https://www.theverge.com/rss/index.xml",
    "https://hnrss.org/newest?points=100",
]

async def fetch_tech_news() -> List[Dict[str, Any]]:
    """Fetch latest tech articles from RSS feeds."""
    articles: List[Dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for feed_url in RSS_FEEDS:
            try:
                response = await client.get(feed_url, timeout=10.0)
                if response.status_code != 200:
                    continue

                feed = feedparser.parse(response.text)
                for entry in feed.entries[:15]:
                    articles.append({
                        "title": entry.get("title", ""),
                        "url": entry.get("link", ""),
                        "source": "news",
                        "feed": feed_url,
                    })
            except Exception as e:
                logger.error(f"RSS feed error ({feed_url}): {e}")
                continue

    return articles


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SENTIMENT ANALYSIS + TOOL CLASSIFICATION (Groq LLM)
# Phase 5: Combined sentiment + tool identification in one call
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def batch_sentiment_analysis(items: List[Dict[str, Any]], batch_size: int = 20) -> List[Dict[str, Any]]:
    """
    Analyze sentiment of content items using Groq LLM (llama-3.1-8b-instant).

    Each item should have a "title" key. Returns the same items enriched with
    a "sentiment" key: "positive", "negative", or "neutral".

    Processes in batches of `batch_size` to stay within rate limits.
    Falls back to "neutral" on any failure — the pipeline never breaks.
    """
    from groq import Groq
    from app.core.config import settings
    import json as _json

    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set — skipping sentiment analysis, defaulting all to 'neutral'")
        for item in items:
            item["sentiment"] = "neutral"
        return items

    client = Groq(api_key=api_key)

    for batch_start in range(0, len(items), batch_size):
        batch = items[batch_start:batch_start + batch_size]

        # Build the prompt with numbered titles
        numbered_titles = "\n".join(
            f"{i}: {item.get('title', '(no title)')}"
            for i, item in enumerate(batch)
        )

        prompt = (
            "You are a tech sentiment classifier. For each numbered headline below, "
            "classify the sentiment TOWARD the technology/tool mentioned as: "
            "positive, negative, or neutral.\n\n"
            "Rules:\n"
            "- 'positive' = praise, excitement, adoption, growth\n"
            "- 'negative' = criticism, migration away, bugs, decline, 'why I stopped using X'\n"
            "- 'neutral' = informational, tutorial, announcement without strong opinion\n\n"
            "Reply ONLY with a JSON array, no other text:\n"
            '[{"i": 0, "s": "positive"}, {"i": 1, "s": "neutral"}, ...]\n\n'
            f"Headlines:\n{numbered_titles}"
        )

        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=1024,
            )

            raw = response.choices[0].message.content.strip()

            # Extract JSON from response (handle markdown code blocks)
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            results = _json.loads(raw)

            # Apply sentiments to batch items
            sentiment_map = {}
            for r in results:
                idx = r.get("i", r.get("index", -1))
                sent = r.get("s", r.get("sentiment", "neutral"))
                if sent not in ("positive", "negative", "neutral"):
                    sent = "neutral"
                sentiment_map[idx] = sent

            for i, item in enumerate(batch):
                item["sentiment"] = sentiment_map.get(i, "neutral")

            pos_count = sum(1 for item in batch if item.get("sentiment") == "positive")
            neg_count = sum(1 for item in batch if item.get("sentiment") == "negative")
            neu_count = sum(1 for item in batch if item.get("sentiment") == "neutral")
            logger.info(
                f"Sentiment batch {batch_start // batch_size + 1}: "
                f"+{pos_count} -{neg_count} ~{neu_count} (of {len(batch)})"
            )

        except Exception as e:
            logger.warning(f"Sentiment analysis failed for batch {batch_start // batch_size + 1}: {e}")
            for item in batch:
                if "sentiment" not in item:
                    item["sentiment"] = "neutral"

        # Small delay between batches to respect rate limits
        await asyncio.sleep(0.5)

    return items
