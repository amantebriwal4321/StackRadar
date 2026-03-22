import httpx
import logging
import asyncio
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

async def fetch_github_repos(token: str, tech_name: str) -> List[Dict[str, Any]]:
    """Fetch trending or recently updated frontend/backend repositories from GitHub."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
        
    url = "https://api.github.com/search/repositories"
    params = {
        "q": f"topic:{tech_name} OR {tech_name} in:name,description",
        "sort": "stars",
        "order": "desc",
        "per_page": 5
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
        except Exception as e:
            logger.error(f"GitHub API Error: {e}")
            return []

async def fetch_hackernews() -> List[Dict[str, Any]]:
    """Fetch top 50 stories from HackerNews Firebase API."""
    url_topstories = "https://hacker-news.firebaseio.com/v0/topstories.json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url_topstories, timeout=10.0)
            response.raise_for_status()
            story_ids = response.json()[:50]
            
            stories = []
            for story_id in story_ids:
                story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
                story_res = await client.get(story_url, timeout=5.0)
                if story_res.status_code == 200:
                    story_data = story_res.json()
                    if story_data and story_data.get("type") == "story":
                        stories.append(story_data)
                        
            return stories
        except Exception as e:
            logger.error(f"HackerNews API Error: {e}")
            return []

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
