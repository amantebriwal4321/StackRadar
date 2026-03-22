from playwright.async_api import async_playwright
import httpx
from bs4 import BeautifulSoup

async def scrape_github_trending():
    """
    Scrapes the GitHub trending page to extract repository URLs and descriptions.
    """
    url = "https://github.com/trending"
    repos = []
    
    async with async_playwright() as p:
        # Launch headless browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        
        # GitHub trending repos have <article class="Box-row">
        articles = await page.query_selector_all('article.Box-row')
        for article in articles:
            # Extract title link
            h2 = await article.query_selector('h2.h3 a')
            if h2:
                repo_url_suffix = await h2.get_attribute('href')
                full_url = f"https://github.com{repo_url_suffix}"
            else:
                continue
                
            # Extract description
            desc_element = await article.query_selector('p')
            description = await desc_element.inner_text() if desc_element else ""
            
            # Extract primary language (span with itemprop="programmingLanguage")
            lang_element = await article.query_selector('span[itemprop="programmingLanguage"]')
            language = await lang_element.inner_text() if lang_element else ""
            
            repos.append({
                "url": full_url,
                "name": repo_url_suffix.strip("/"),
                "description": description.strip(),
                "language": language.strip()
            })
            
        await browser.close()
    
    return repos

async def scrape_hacker_news():
    """
    Scrapes HackerNews top stories using BS4 and httpx.
    """
    url = "https://news.ycombinator.com/"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        
    soup = BeautifulSoup(response.text, 'html.parser')
    stories = []
    
    # HN titles are inside <span class="titleline"> as of recent HN markup
    for item in soup.select('span.titleline > a'):
        link = item.get('href')
        title = item.get_text()
        stories.append({
            "title": title,
            "url": link,
            "source": "HackerNews"
        })
        
    return stories
