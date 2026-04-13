"""
Data Ingestion Layer — fetches raw data from multiple sources.

Sources:
  - GitHub API (specific repo stats via GET /repos/{owner}/{repo})
  - HackerNews Firebase API (top stories)
  - Dev.to API (latest articles)
  - Reddit JSON API (posts from tech subreddits)
  - Tech News RSS feeds (TechCrunch, Ars Technica, The Verge)
"""

import httpx
import logging
import asyncio
import feedparser
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GITHUB — Targeted Repo Stats
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Validate token on module load
_gh_token = settings.GITHUB_TOKEN
if _gh_token:
    logger.info(f"GitHub token loaded: {_gh_token[:8]}*** (len={len(_gh_token)})")
else:
    logger.warning("⚠️  GITHUB_TOKEN is empty — GitHub API will use unauthenticated rate limit (60 req/hr)")

MAX_RETRIES = 2
RETRY_BACKOFF = [1.0, 3.0]


async def fetch_github_repo_stats(owner_repo: str) -> Optional[Dict[str, Any]]:
    """
    Fetch stats for a specific GitHub repo (e.g. 'facebook/react').

    Uses GET /repos/{owner}/{repo} — single API call, returns:
      stars, forks, watchers, open_issues, description
    """
    token = settings.GITHUB_TOKEN

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"https://api.github.com/repos/{owner_repo}"

    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=15.0)

                remaining = response.headers.get("x-ratelimit-remaining", "?")
                limit = response.headers.get("x-ratelimit-limit", "?")

                if response.status_code == 200:
                    data = response.json()
                    logger.debug(
                        f"GitHub '{owner_repo}': ⭐{data.get('stargazers_count', 0):,} "
                        f"(rate: {remaining}/{limit})"
                    )
                    return {
                        "stars": data.get("stargazers_count", 0),
                        "forks": data.get("forks_count", 0),
                        "watchers": data.get("subscribers_count", 0),
                        "open_issues": data.get("open_issues_count", 0),
                        "description": data.get("description", ""),
                    }

                elif response.status_code == 404:
                    logger.error(f"GitHub 404: repo '{owner_repo}' not found")
                    return None

                elif response.status_code in (401, 403):
                    logger.warning(
                        f"GitHub {response.status_code} for '{owner_repo}' "
                        f"(rate: {remaining}/{limit}, attempt {attempt + 1})"
                    )
                    if remaining == "0":
                        reset_at = response.headers.get("x-ratelimit-reset", "?")
                        logger.warning(f"GitHub rate limit exhausted. Resets at epoch: {reset_at}")
                        return None

                elif response.status_code == 429:
                    retry_after = int(response.headers.get("retry-after", "5"))
                    logger.warning(f"GitHub 429 for '{owner_repo}': retry-after {retry_after}s")
                    await asyncio.sleep(retry_after)
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
# REDDIT
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
    """Fetch hot posts from tech subreddits using Reddit's public JSON API."""
    posts: List[Dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for subreddit in REDDIT_SUBREDDITS:
            try:
                url = f"https://www.reddit.com/r/{subreddit}/hot.json"
                headers = {"User-Agent": "StackRadar/2.0 (Tech Trend Analyzer)"}
                response = await client.get(url, headers=headers, params={"limit": 15}, timeout=10.0)

                if response.status_code == 200:
                    data = response.json()
                    children = data.get("data", {}).get("children", [])
                    for child in children:
                        post = child.get("data", {})
                        if post.get("stickied"):
                            continue
                        posts.append({
                            "title": post.get("title", ""),
                            "url": f"https://reddit.com{post.get('permalink', '')}",
                            "subreddit": subreddit,
                            "score": post.get("score", 0),
                            "num_comments": post.get("num_comments", 0),
                            "source": "reddit",
                        })
                elif response.status_code == 429:
                    logger.warning(f"Reddit rate limited on r/{subreddit}, skipping remaining")
                    break

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
# SENTIMENT ANALYSIS (Groq LLM)
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
