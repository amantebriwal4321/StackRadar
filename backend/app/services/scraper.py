"""
Data Ingestion Layer — fetches raw data from multiple sources.

Sources:
  - GitHub API (trending repos by search)
  - HackerNews Firebase API (top stories)
  - Dev.to API (latest articles)
  - Reddit JSON API (posts from tech subreddits)
  - Tech News RSS feeds (TechCrunch, Ars Technica, The Verge)
"""

import httpx
import logging
import asyncio
import feedparser
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GITHUB
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Validate token on module load
_gh_token = settings.GITHUB_TOKEN
if _gh_token:
    logger.info(f"GitHub token loaded: {_gh_token[:12]}***{_gh_token[-4:]} (len={len(_gh_token)})")
else:
    logger.warning("⚠️ GITHUB_TOKEN is empty — GitHub API will use unauthenticated rate limit (60 req/hr)")

MAX_RETRIES = 2
RETRY_BACKOFF = [1.0, 3.0]  # seconds


async def fetch_github_repos(token: str, tech_name: str) -> List[Dict[str, Any]]:
    """
    Fetch trending repos from GitHub search API for a given topic.
    
    - Uses `token` auth format (GitHub-recommended for PATs)
    - Retries on transient errors (401, 403, 429, 5xx) with exponential backoff
    - Logs rate limit headers for diagnostics
    """
    active_token = token if token else settings.GITHUB_TOKEN
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if active_token:
        headers["Authorization"] = f"token {active_token}"
        
    url = "https://api.github.com/search/repositories"
    params = {
        "q": f"{tech_name} in:name,description,topics",
        "sort": "stars",
        "order": "desc",
        "per_page": 5
    }
    
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params, timeout=15.0)
                
                # Log rate limit info
                remaining = response.headers.get("x-ratelimit-remaining", "?")
                limit = response.headers.get("x-ratelimit-limit", "?")
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])
                    logger.debug(f"GitHub '{tech_name}': {len(items)} repos found (rate: {remaining}/{limit})")
                    return items
                
                elif response.status_code == 401:
                    # Auth failure — log details and retry with no auth as fallback
                    logger.error(
                        f"GitHub 401 Unauthorized for '{tech_name}' "
                        f"(token: {'set' if active_token else 'empty'}, "
                        f"attempt {attempt+1}/{MAX_RETRIES+1})"
                    )
                    if attempt == MAX_RETRIES:
                        # Final retry without auth (unauthenticated fallback)
                        logger.warning(f"GitHub: Falling back to unauthenticated request for '{tech_name}'")
                        headers.pop("Authorization", None)
                        continue
                        
                elif response.status_code == 403:
                    # Rate limited or token scope issue
                    logger.warning(
                        f"GitHub 403 Forbidden for '{tech_name}' "
                        f"(rate: {remaining}/{limit}, attempt {attempt+1})"
                    )
                    if remaining == "0":
                        reset_at = response.headers.get("x-ratelimit-reset", "unknown")
                        logger.warning(f"GitHub rate limit exhausted. Resets at epoch: {reset_at}")
                        return []  # No point retrying if rate limited
                
                elif response.status_code == 422:
                    # Invalid query — don't retry
                    logger.error(f"GitHub 422 for '{tech_name}': invalid query. Response: {response.text[:200]}")
                    return []
                
                elif response.status_code == 429:
                    # Secondary rate limit
                    retry_after = int(response.headers.get("retry-after", "5"))
                    logger.warning(f"GitHub 429 for '{tech_name}': retry-after {retry_after}s")
                    await asyncio.sleep(retry_after)
                    continue
                
                elif response.status_code >= 500:
                    logger.error(f"GitHub {response.status_code} server error for '{tech_name}'")
                
                else:
                    logger.error(
                        f"GitHub unexpected {response.status_code} for '{tech_name}': "
                        f"{response.text[:200]}"
                    )
                  
            except httpx.TimeoutException:
                logger.warning(f"GitHub timeout for '{tech_name}' (attempt {attempt+1})")
            except httpx.ConnectError as e:
                logger.error(f"GitHub connection error for '{tech_name}': {e}")
                return []  # Network issue, don't retry
            except Exception as e:
                logger.error(f"GitHub unexpected error for '{tech_name}': {type(e).__name__}: {e}")
        
        # Backoff before retry
        if attempt < MAX_RETRIES:
            delay = RETRY_BACKOFF[attempt]
            logger.info(f"GitHub: retrying '{tech_name}' in {delay}s...")
            await asyncio.sleep(delay)
    
    logger.error(f"GitHub: all {MAX_RETRIES+1} attempts failed for '{tech_name}'")
    return []


async def fetch_github_trending_topics(token: str, topics: List[str]) -> Dict[str, List[Dict]]:
    """Fetch GitHub repos for multiple topics with rate-limit-safe delays."""
    results = {}
    for topic in topics:
        repos = await fetch_github_repos(token, topic)
        results[topic] = repos
        await asyncio.sleep(1.0)  # 1s gap between queries to stay well within rate limits
    return results


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
            
            async def fetch_story(story_id: int) -> Dict[str, Any] | None:
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
            stories = []
            for i in range(0, len(story_ids), 10):
                batch = story_ids[i:i+10]
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
]

async def fetch_reddit() -> List[Dict[str, Any]]:
    """Fetch hot posts from tech subreddits using Reddit's public JSON API."""
    posts = []
    
    async with httpx.AsyncClient() as client:
        for subreddit in REDDIT_SUBREDDITS:
            try:
                url = f"https://www.reddit.com/r/{subreddit}/hot.json"
                headers = {"User-Agent": "StackRadar/1.0 (Tech Trend Analyzer)"}
                response = await client.get(url, headers=headers, params={"limit": 15}, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    children = data.get("data", {}).get("children", [])
                    for child in children:
                        post = child.get("data", {})
                        if post.get("stickied"):
                            continue  # Skip pinned posts
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
                    
                await asyncio.sleep(1.0)  # Reddit rate limit: 1 req/sec without auth
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
    "https://hnrss.org/newest?points=100",  # HN stories with 100+ points
]

async def fetch_tech_news() -> List[Dict[str, Any]]:
    """Fetch latest tech articles from RSS feeds."""
    articles = []
    
    async with httpx.AsyncClient() as client:
        for feed_url in RSS_FEEDS:
            try:
                response = await client.get(feed_url, timeout=10.0)
                if response.status_code != 200:
                    continue
                    
                feed = feedparser.parse(response.text)
                for entry in feed.entries[:15]:  # Max 15 per feed
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
