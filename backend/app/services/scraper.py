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

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

import feedparser
import httpx

from app.core.config import settings
from app.services.guardrails import traced, validate_sentiment_batch

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GITHUB — Targeted Repo Stats (Phase 1 Hardened)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ETag cache: {owner_repo: (etag_value, cached_response_dict)}
_etag_cache: dict[str, tuple[str, dict[str, Any]]] = {}

# Rate budget tracker (updated per-request from response headers)
_rate_remaining: int = 5000
_rate_limit: int = 5000

# Validate token on module load
_gh_token = settings.GITHUB_TOKEN
if _gh_token:
    logger.info(f"GitHub token loaded: {_gh_token[:8]}*** (len={len(_gh_token)})")
else:
    logger.warning(
        "⚠️  GITHUB_TOKEN is empty — GitHub API will use unauthenticated rate limit (60 req/hr)"
    )

MAX_RETRIES = 2
RETRY_BACKOFF = [2.0, 5.0]


def _build_github_headers() -> dict[str, str]:
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


async def validate_github_token(client: httpx.AsyncClient) -> dict[str, Any]:
    """
    Validate GitHub token by hitting the rate_limit endpoint.
    Returns rate limit info. Called once at the start of each scrape cycle.
    """
    global _rate_remaining, _rate_limit
    try:
        headers = _build_github_headers()
        response = await client.get(
            "https://api.github.com/rate_limit", headers=headers, timeout=10.0
        )
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
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any] | None:
    """
    Fetch stats for a specific GitHub repo (e.g. 'facebook/react').

    Uses conditional requests (If-None-Match/ETag) to avoid consuming
    rate limit on unchanged repos. Returns cached data on 304.
    """
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
                # follow_redirects: GitHub answers 301 for repos that have been
                # renamed or transferred (e.g. facebook/react). Without this the
                # request fails all retries and the tool silently loses its stats.
                response = await client.get(
                    url, headers=headers, timeout=15.0, follow_redirects=True
                )
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
                        # Powers the official-docs link and the "this tutorial
                        # predates the current release" warning on /resources.
                        "homepage": data.get("homepage") or None,
                        "pushed_at": data.get("pushed_at"),
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
                    logger.error(
                        f"GitHub {response.status_code} server error for '{owner_repo}'"
                    )
                else:
                    logger.error(
                        f"GitHub unexpected {response.status_code} for '{owner_repo}'"
                    )

            except httpx.TimeoutException:
                logger.warning(
                    f"GitHub timeout for '{owner_repo}' (attempt {attempt + 1})"
                )
            except httpx.ConnectError as e:
                logger.error(f"GitHub connection error for '{owner_repo}': {e}")
                return None
            except Exception as e:
                logger.error(
                    f"GitHub unexpected error for '{owner_repo}': {type(e).__name__}: {e}"
                )

            # Backoff before retry
            if attempt < MAX_RETRIES:
                delay = RETRY_BACKOFF[attempt]
                logger.info(f"GitHub: retrying '{owner_repo}' in {delay}s...")
                await asyncio.sleep(delay)

        logger.error(
            f"GitHub: all {MAX_RETRIES + 1} attempts failed for '{owner_repo}'"
        )
        return None

    finally:
        if owns_client:
            await client.aclose()


async def fetch_github_latest_release(
    owner_repo: str,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any] | None:
    """Latest published release tag + date for a repo.

    Used by the learning-resource feature: knowing that React is on v19 and a
    course was recorded in the v17 era is the difference between a useful
    recommendation and six wasted hours. Returns None for repos that don't cut
    GitHub releases (many don't) — the UI simply omits the warning then.
    """
    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient()
    try:
        r = await client.get(
            f"https://api.github.com/repos/{owner_repo}/releases/latest",
            headers=_build_github_headers(),
            timeout=15.0,
            follow_redirects=True,
        )
        _update_rate_budget(r)
        if r.status_code != 200:
            return None
        data = r.json()
        published = data.get("published_at")
        return {
            "version": data.get("tag_name") or data.get("name"),
            "published_at": (
                datetime.fromisoformat(published.replace("Z", "+00:00"))
                if published
                else None
            ),
        }
    except Exception as e:
        logger.debug(f"GitHub releases for '{owner_repo}' unavailable: {e}")
        return None
    finally:
        if owns_client:
            await client.aclose()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HACKERNEWS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def fetch_hackernews() -> list[dict[str, Any]]:
    """Fetch top 100 stories from HackerNews Firebase API (concurrent batches).

    Volume raised 50 -> 100 and the story body is now surfaced as `description`.
    Previously only the title was matched (scoring._item_text reads `description`,
    never `text`), so every self-post body — where tools are usually actually
    named — was discarded. That was a large part of why mention counts read ~0.
    """
    url_topstories = "https://hacker-news.firebaseio.com/v0/topstories.json"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url_topstories, timeout=10.0)
            response.raise_for_status()
            story_ids = response.json()[:100]

            async def fetch_story(story_id: int) -> dict[str, Any] | None:
                try:
                    story_url = (
                        f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
                    )
                    story_res = await client.get(story_url, timeout=5.0)
                    if story_res.status_code == 200:
                        story_data = story_res.json()
                        if story_data and story_data.get("type") == "story":
                            # Map the self-post body into `description` so it is matched.
                            story_data["description"] = story_data.get("text", "") or ""
                            return story_data
                except Exception as e:
                    # This used to be a bare `pass`: failures left no trace at all.
                    logger.debug(f"HN story {story_id} skipped: {e}")
                return None

            # Fetch in batches of 10
            stories: list[dict[str, Any]] = []
            for i in range(0, len(story_ids), 10):
                batch = story_ids[i : i + 10]
                results = await asyncio.gather(*[fetch_story(sid) for sid in batch])
                stories.extend([s for s in results if s])

            return stories
        except Exception as e:
            logger.error(f"HackerNews API Error: {e}")
            return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HACKER NEWS — targeted search (Algolia)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# The top-100 front page is a poor tool signal: measured, 4 of 99 stories named
# any tracked tool. HN's Algolia index can be asked the opposite question -
# "which recent stories mention Rust?" - for free and without a key.
HN_SEARCH_API = "https://hn.algolia.com/api/v1/search_by_date"
HN_SEARCH_WINDOW_HOURS = 48
HN_SEARCH_HITS = 20  # per tool
HN_SEARCH_PAUSE = 0.3  # courtesy gap between queries


def _hn_search_params(keyword: str, since_ts: int) -> dict[str, Any]:
    """Query parameters for one tool keyword.

    EXACT matching, deliberately. Algolia is typo-tolerant by default, which on
    a measured sample returned "US and Denmark reach deal over Greenland's
    security" for `react` and an unrelated VSCode post for `prisma`: 18 useful
    hits against 56 junk ones. Quoting the phrase, disabling typo tolerance and
    restricting the searchable attributes gave 34 useful and zero junk.
    """
    return {
        "query": f'"{keyword}"',
        "tags": "story",
        "numericFilters": f"created_at_i>{since_ts}",
        "hitsPerPage": HN_SEARCH_HITS,
        "restrictSearchableAttributes": "title,story_text",
        "typoTolerance": "false",
        "advancedSyntax": "true",
    }


def _hn_items_from_hits(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Algolia hits -> the item shape the scoring pipeline reads."""
    items = []
    for hit in hits:
        story_id = hit.get("objectID")
        if not story_id:
            continue
        items.append(
            {
                "id": story_id,
                "title": hit.get("title") or "",
                "url": hit.get("url")
                or f"https://news.ycombinator.com/item?id={story_id}",
                # scoring._item_text reads `description`, never `story_text`.
                "description": hit.get("story_text") or "",
                "points": hit.get("points") or 0,
                "source": "hackernews",
            }
        )
    return items


def hn_search_since(hours: int = HN_SEARCH_WINDOW_HOURS) -> int:
    """Unix timestamp `hours` ago, for Algolia's created_at_i filter."""
    return int(datetime.now(timezone.utc).timestamp()) - hours * 3600


def merge_hn_sources(
    top: list[dict[str, Any]], searched: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Front page plus targeted search, each story once.

    The front page is kept first: a story can appear in both, and its top-stories
    record is the richer one.
    """
    merged = list(top)
    seen = {str(item.get("id")) for item in top if item.get("id") is not None}
    for item in searched:
        key = str(item.get("id"))
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged


async def fetch_hackernews_search(
    keywords: list[str], since_ts: int
) -> list[dict[str, Any]]:
    """Recent HN stories that actually name each keyword. Deduplicated by story id."""
    seen: set[str] = set()
    items: list[dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for keyword in keywords:
            try:
                response = await client.get(
                    HN_SEARCH_API,
                    params=_hn_search_params(keyword, since_ts),
                    timeout=15.0,
                )
                if response.status_code != 200:
                    logger.warning(
                        f"HN search '{keyword}' returned {response.status_code}"
                    )
                    continue
                for item in _hn_items_from_hits(response.json().get("hits", [])):
                    if item["id"] in seen:
                        continue
                    seen.add(item["id"])
                    items.append(item)
            except Exception as e:
                logger.warning(f"HN search '{keyword}' failed: {e}")
            await asyncio.sleep(HN_SEARCH_PAUSE)

    logger.info(
        f"HN search: {len(items)} distinct stories across {len(keywords)} keywords"
    )
    return items


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEV.TO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def fetch_devto() -> list[dict[str, Any]]:
    """Fetch latest articles from Dev.to API."""
    url = "https://dev.to/api/articles"
    params = {"per_page": 100, "top": 1}

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

# Chosen to cover the catalog's domains. Communities where the tracked tools are
# actually discussed by name beat broad ones — r/LocalLLaMA alone carries far more
# Ollama/LangChain/HuggingFace mentions than r/artificial.
#
# GROUPED, because each group is ONE request. Reddit's unauthenticated budget is
# about one request per rate-limit window: after a 200 it sends
# x-ratelimit-remaining: 0 and x-ratelimit-reset: 27-51 (measured). The old code
# fetched 35 subreddits one at a time with a fixed 2s pause, hit 429 on the
# second, and quit after three - production read 50 posts a cycle out of a
# possible 875. A combined feed (r/a+b+c) returns up to 100 posts drawn from
# every subreddit in it (verified: 100 entries across all 13 of a 13-sub group).
REDDIT_SUBREDDIT_GROUPS: list[list[str]] = [
    # general
    ["programming", "webdev", "learnprogramming", "ExperiencedDevs", "opensource"],
    # web
    [
        "reactjs",
        "javascript",
        "typescript",
        "node",
        "sveltejs",
        "vuejs",
        "nextjs",
        "tailwindcss",
    ],
    # AI / ML + systems
    [
        "MachineLearning",
        "LocalLLaMA",
        "learnmachinelearning",
        "artificial",
        "datascience",
        "rust",
        "golang",
        "python",
    ],
    # cloud / devops, data, security, web3
    [
        "devops",
        "kubernetes",
        "docker",
        "aws",
        "selfhosted",
        "cloudcomputing",
        "Database",
        "PostgreSQL",
        "netsec",
        "cybersecurity",
        "AskNetsec",
        "ethdev",
        "solidity",
        "cryptocurrency",
    ],
]
REDDIT_SUBREDDITS = [sub for group in REDDIT_SUBREDDIT_GROUPS for sub in group]

REDDIT_POSTS_PER_GROUP = 100  # the RSS maximum
REDDIT_MAX_WAIT = 65.0  # never trust a reset header further than one window
REDDIT_DEADLINE = 300.0  # the whole Reddit pass; sources are fetched in parallel


def _reddit_clock() -> float:
    """Monotonic seconds. A seam so tests can advance time along with sleeps."""
    return time.monotonic()


def _reddit_wait_seconds(headers: Any) -> float:
    """How long to wait before the next Reddit request, from its rate-limit headers.

    0 while budget remains. When it is spent, the advertised reset plus a second
    of margin, capped at one window so a malformed header cannot stall the scrape.
    """
    try:
        remaining = float(headers.get("x-ratelimit-remaining", "1"))
    except (TypeError, ValueError):
        remaining = 1.0
    if remaining >= 1:
        return 0.0
    try:
        reset = float(headers.get("x-ratelimit-reset", "60"))
    except (TypeError, ValueError):
        reset = 60.0
    return min(max(reset, 0.0) + 1.0, REDDIT_MAX_WAIT)


def _reddit_posts_from_feed(xml: str, fallback_subreddit: str) -> list[dict[str, Any]]:
    """Turn a (possibly multi-subreddit) Reddit RSS feed into post dicts.

    The subreddit comes from each entry's category term, not the request - in a
    combined feed the request names a dozen of them.
    """
    feed = feedparser.parse(xml)
    posts: list[dict[str, Any]] = []
    for entry in feed.entries[:REDDIT_POSTS_PER_GROUP]:
        tags = entry.get("tags") or []
        subreddit = (tags[0].get("term") if tags else None) or fallback_subreddit
        posts.append(
            {
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "subreddit": subreddit,
                # Post body - matched as well as the title.
                "description": entry.get("summary", "") or "",
                "source": "reddit",
            }
        )
    return posts


async def fetch_reddit() -> list[dict[str, Any]]:
    """Hot posts from the tech subreddits, one combined RSS request per group."""
    posts: list[dict[str, Any]] = []
    deadline = _reddit_clock() + REDDIT_DEADLINE
    headers = {"User-Agent": "StackRadar/2.0 (Tech Trend Analyzer)"}

    async with httpx.AsyncClient(follow_redirects=True) as client:
        wait = 0.0
        for group in REDDIT_SUBREDDIT_GROUPS:
            label = "+".join(group)
            url = f"https://www.reddit.com/r/{label}/hot.rss?limit={REDDIT_POSTS_PER_GROUP}"

            # One retry: a 429 carries its own reset, so waiting it out and asking
            # again usually succeeds. A second 429 skips just this group.
            for attempt in (1, 2):
                if wait and _reddit_clock() + wait > deadline:
                    logger.warning(
                        f"Reddit pass hit its {REDDIT_DEADLINE:.0f}s cap; {len(posts)} posts kept"
                    )
                    return posts
                if wait:
                    await asyncio.sleep(wait)
                try:
                    response = await client.get(url, headers=headers, timeout=20.0)
                except Exception as e:
                    logger.error(f"Reddit group {group[0]}+{len(group) - 1}: {e}")
                    wait = 5.0
                    break

                wait = _reddit_wait_seconds(response.headers)
                if response.status_code == 200:
                    batch = _reddit_posts_from_feed(
                        response.text, fallback_subreddit=group[0]
                    )
                    posts.extend(batch)
                    logger.info(
                        f"Reddit {len(group)} subreddits ({group[0]}...): {len(batch)} posts via RSS"
                    )
                    break
                if response.status_code == 429 and attempt == 1:
                    wait = wait or 30.0
                    logger.warning(
                        f"Reddit rate limited on {group[0]}+{len(group) - 1}; retrying in {wait:.0f}s"
                    )
                    continue
                logger.warning(
                    f"Reddit {group[0]}+{len(group) - 1} returned {response.status_code}; skipping group"
                )
                wait = wait or 5.0
                break

    return posts


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TECH NEWS (RSS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Mainstream tech press rarely names specific dev tools, so the developer-focused
# feeds below (InfoQ, The New Stack, GitHub blog, LWN) carry most of the signal.
RSS_FEEDS = [
    "https://techcrunch.com/feed/",
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "https://www.theverge.com/rss/index.xml",
    "https://hnrss.org/newest?points=50",
    "https://feed.infoq.com/",
    "https://thenewstack.io/feed/",
    "https://github.blog/feed/",
    "https://lwn.net/headlines/rss",
    "https://dev.to/feed",
    "https://css-tricks.com/feed/",
]


async def fetch_tech_news() -> list[dict[str, Any]]:
    """Fetch latest tech articles from RSS feeds."""
    articles: list[dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for feed_url in RSS_FEEDS:
            try:
                response = await client.get(feed_url, timeout=10.0)
                if response.status_code != 200:
                    continue

                feed = feedparser.parse(response.text)
                for entry in feed.entries[:25]:
                    articles.append(
                        {
                            "title": entry.get("title", ""),
                            "url": entry.get("link", ""),
                            # Article summary — previously dropped; article blurbs name
                            # tools far more often than headlines do.
                            "description": entry.get("summary", "") or "",
                            "source": "news",
                            "feed": feed_url,
                        }
                    )
            except Exception as e:
                logger.error(f"RSS feed error ({feed_url}): {e}")
                continue

    return articles


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SENTIMENT ANALYSIS + TOOL CLASSIFICATION (Groq LLM)
# Phase 5: Combined sentiment + tool identification in one call
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Models to try, in order, when GROQ_MODEL is not pinned.
#
# WHY A LIST AND NOT A NAME. This was hardcoded to `llama-3.1-8b-instant`, which
# Groq decommissioned. Every call then returned 404 model_not_found, and because
# the batch handler falls back to "neutral" on any exception, the failure was
# invisible: a valid key, zero reported errors, and 386 items all scored neutral.
# It looked exactly like the key being absent.
#
# A hardcoded model name is a time bomb on a provider that retires models
# without notice, so the resolver walks this list once, keeps the first that
# answers, and logs which one. Adding a name here is cheaper than another
# outage; GROQ_MODEL overrides it entirely for a dashboard-only fix.
_GROQ_MODEL_CANDIDATES = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "llama-3.1-8b-instant",  # kept last: retired, but harmless to try
]

# Resolved once per process so a dead model is not re-probed every batch.
_groq_model: str | None = None


def _resolve_groq_model(client) -> str | None:
    """Ask Groq which of our candidates it actually serves. None if none do."""
    global _groq_model
    if _groq_model:
        return _groq_model

    pinned = getattr(
        __import__("app.core.config", fromlist=["settings"]).settings, "GROQ_MODEL", ""
    )
    candidates = [pinned] if pinned else _GROQ_MODEL_CANDIDATES

    try:
        available = {m.id for m in client.models.list().data}
        for name in candidates:
            if name in available:
                _groq_model = name
                logger.info(f"Groq sentiment model resolved: {name}")
                return name
        logger.warning(
            f"None of the candidate Groq models are available to this key. "
            f"Offered: {sorted(available)[:8]}... — set GROQ_MODEL to one of them."
        )
        return None
    except Exception as e:
        # Listing failed (network, auth). Fall back to trying the first
        # candidate directly rather than giving up on sentiment entirely.
        logger.warning(f"Could not list Groq models ({e}); trying {candidates[0]}")
        _groq_model = candidates[0]
        return _groq_model


async def batch_sentiment_analysis(
    items: list[dict[str, Any]], batch_size: int = 20
) -> list[dict[str, Any]]:
    """
    Analyze sentiment of content items using a Groq-hosted LLM.

    Each item should have a "title" key. Returns the same items enriched with
    a "sentiment" key: "positive", "negative", or "neutral".

    Processes in batches of `batch_size` to stay within rate limits.
    Falls back to "neutral" on any failure — the pipeline never breaks.
    """
    from groq import Groq

    from app.core.config import settings

    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning(
            "GROQ_API_KEY not set — skipping sentiment analysis, defaulting all to 'neutral'"
        )
        for item in items:
            item["sentiment"] = "neutral"
        return items

    client = Groq(api_key=api_key)

    model = _resolve_groq_model(client)
    if not model:
        logger.warning("No usable Groq model — defaulting all to 'neutral'")
        for item in items:
            item["sentiment"] = "neutral"
        return items

    for batch_start in range(0, len(items), batch_size):
        batch = items[batch_start : batch_start + batch_size]

        # Build the prompt with numbered titles
        numbered_titles = "\n".join(
            f"{i}: {item.get('title', '(no title)')}" for i, item in enumerate(batch)
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
            with traced(f"groq.sentiment.batch{batch_start // batch_size + 1}"):
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0,
                    max_tokens=1024,
                )

            raw = response.choices[0].message.content.strip()

            # Runtime guardrail: schema + index + grounding checks before any
            # sentiment is trusted. Anything absent from the map stays neutral
            # (see app/services/guardrails.py).
            with traced("guardrails.sentiment"):
                sentiment_map, report = validate_sentiment_batch(raw, batch)

            for i, item in enumerate(batch):
                item["sentiment"] = sentiment_map.get(i, "neutral")

            pos_count = sum(1 for item in batch if item.get("sentiment") == "positive")
            neg_count = sum(1 for item in batch if item.get("sentiment") == "negative")
            neu_count = sum(1 for item in batch if item.get("sentiment") == "neutral")
            logger.info(
                f"Sentiment batch {batch_start // batch_size + 1}: "
                f"+{pos_count} -{neg_count} ~{neu_count} (of {len(batch)}) "
                f"[guardrail: {report.summary()}]"
            )

        except Exception as e:
            logger.warning(
                f"Sentiment analysis failed for batch {batch_start // batch_size + 1}: {e}"
            )
            for item in batch:
                if "sentiment" not in item:
                    item["sentiment"] = "neutral"

        # Small delay between batches to respect rate limits
        await asyncio.sleep(0.5)

    return items
