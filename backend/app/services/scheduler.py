"""
Scheduler — Background scraper loop with domain aggregation pipeline.

Flow:
  1. Fetch raw data from all sources (GitHub, HN, DevTo, Reddit, RSS News)
  2. Classify each content item into technology domains using keyword matching
  3. Aggregate signal counts per domain
  4. Calculate weighted scores, growth stages, and summaries
  5. Upsert Domain records in database
  6. (Legacy) Also maintain tool-level Technology records for backward compat
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import (
    Technology, Repository, Article, RoadmapStep,
    TechnologyDomain as TechnologyDomainModel, TechnologyDifficulty,
    TechnologyPrerequisite, TechnologyRole, Domain,
)
from app.services.scraper import (
    fetch_github_repos, fetch_hackernews, fetch_devto,
    fetch_reddit, fetch_tech_news,
)
from app.services.scoring import (
    classify_text_to_domains, calculate_domain_score,
    classify_growth_stage, generate_domain_summary,
    DOMAIN_TAXONOMY,
    # Legacy
    calculate_trend_score, extract_technologies, get_category_for_tech,
    get_emerging_tech_dict,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

scrape_status = {
    "last_scraped_time": None,
    "next_scraped_time": None,
    "sources": {},
}


async def run_scraper_loop():
    """Main background loop — runs every 30 minutes."""
    while True:
        logger.info("=" * 60)
        logger.info("SCRAPER LOOP STARTING")
        logger.info("=" * 60)
        try:
            await perform_full_scrape()
            scrape_status["last_scraped_time"] = datetime.now(timezone.utc).isoformat()
            scrape_status["next_scraped_time"] = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            logger.info("Scraping completed. Sleeping for 30 minutes.")
        except Exception as e:
            logger.error(f"Error in scraper loop: {e}", exc_info=True)
        
        await asyncio.sleep(1800)  # 30 minutes


async def perform_full_scrape():
    """
    Full scraping pipeline:
    1. Fetch all sources in parallel
    2. Aggregate to domain-level signals
    3. Calculate scores and upsert domains
    4. (Legacy) Also update tool-level records
    """
    db: Session = SessionLocal()
    
    try:
        # ━━━ STEP 1: Fetch all sources ━━━
        logger.info("Step 1: Fetching from all data sources...")
        
        hn_task = fetch_hackernews()
        devto_task = fetch_devto()
        reddit_task = fetch_reddit()
        news_task = fetch_tech_news()
        
        hn_stories, devto_articles, reddit_posts, news_articles = await asyncio.gather(
            hn_task, devto_task, reddit_task, news_task
        )
        
        scrape_status["sources"] = {
            "hackernews": len(hn_stories),
            "devto": len(devto_articles),
            "reddit": len(reddit_posts),
            "news": len(news_articles),
        }
        
        logger.info(f"Fetched: HN={len(hn_stories)}, DevTo={len(devto_articles)}, "
                     f"Reddit={len(reddit_posts)}, News={len(news_articles)}")
        
        # ━━━ STEP 2: Classify content → domains ━━━
        logger.info("Step 2: Classifying content into technology domains...")
        
        # Track signals per domain
        domain_signals: dict[str, dict[str, list]] = {
            slug: {"github": [], "hn": [], "devto": [], "reddit": [], "news": []}
            for slug in DOMAIN_TAXONOMY
        }
        
        # Classify HN stories
        for story in hn_stories:
            title = story.get("title", "")
            matched = classify_text_to_domains(title)
            for slug in matched:
                domain_signals[slug]["hn"].append(story)
        
        # Classify DevTo articles
        for article in devto_articles:
            title = article.get("title", "")
            tags = " ".join(article.get("tag_list", []) if isinstance(article.get("tag_list"), list) else [])
            matched = classify_text_to_domains(f"{title} {tags}")
            for slug in matched:
                domain_signals[slug]["devto"].append(article)
        
        # Classify Reddit posts
        for post in reddit_posts:
            title = post.get("title", "")
            subreddit = post.get("subreddit", "")
            matched = classify_text_to_domains(f"{title} {subreddit}")
            for slug in matched:
                domain_signals[slug]["reddit"].append(post)
        
        # Classify News articles
        for article in news_articles:
            title = article.get("title", "")
            matched = classify_text_to_domains(title)
            for slug in matched:
                domain_signals[slug]["news"].append(article)
        
        # Fetch GitHub for each domain (using 2 representative keywords per domain)
        logger.info("Step 2b: Fetching GitHub repos per domain...")
        github_search_topics = {
            "ai-ml": ["machine-learning", "llm"],
            "web3": ["blockchain", "web3"],
            "cybersecurity": ["cybersecurity", "security"],
            "cloud-native": ["kubernetes", "serverless"],
            "edge-computing": ["iot", "edge-computing"],
            "ar-vr": ["virtual-reality", "augmented-reality"],
            "quantum": ["quantum-computing", "qiskit"],
            "devops": ["devops", "cicd"],
        }
        
        for slug, topics in github_search_topics.items():
            for topic in topics:
                repos = await fetch_github_repos(settings.GITHUB_TOKEN, topic)
                domain_signals[slug]["github"].extend(repos)
                await asyncio.sleep(2.0)  # 2s gap to avoid GitHub secondary rate limits
        
        total_github = sum(len(v["github"]) for v in domain_signals.values())
        scrape_status["sources"]["github"] = total_github
        logger.info(f"GitHub: Fetched {total_github} repos across all domains")
        
        # ━━━ STEP 3: Calculate scores and upsert domains ━━━
        logger.info("Step 3: Calculating domain scores and saving to database...")
        
        for slug, taxonomy in DOMAIN_TAXONOMY.items():
            signals = domain_signals[slug]
            gh_count = len(signals["github"])
            hn_count = len(signals["hn"])
            devto_count = len(signals["devto"])
            reddit_count = len(signals["reddit"])
            news_count = len(signals["news"])
            
            score = calculate_domain_score(gh_count, hn_count, devto_count, reddit_count, news_count)
            stage = classify_growth_stage(score)
            summary = generate_domain_summary(
                taxonomy["name"], score, stage,
                gh_count, hn_count, devto_count, reddit_count, news_count
            )
            
            # Upsert domain
            domain = db.query(Domain).filter(Domain.slug == slug).first()
            if not domain:
                domain = Domain(
                    name=taxonomy["name"],
                    slug=slug,
                    icon=taxonomy["icon"],
                )
                db.add(domain)
                db.flush()
            
            domain.score = score
            domain.stage = stage
            domain.summary = summary
            domain.github_count = gh_count
            domain.hn_count = hn_count
            domain.devto_count = devto_count
            domain.reddit_count = reddit_count
            domain.news_count = news_count
            domain.updated_at = datetime.now(timezone.utc)
            
            logger.info(f"  {taxonomy['name']}: score={score}, stage={stage}, "
                        f"GH={gh_count} HN={hn_count} DT={devto_count} "
                        f"RD={reddit_count} NW={news_count}")
        
        # ━━━ STEP 4: Legacy — tool-level pipeline ━━━
        logger.info("Step 4: Updating legacy tool-level records...")
        await _update_legacy_tools(db, hn_stories, devto_articles)
        
        db.commit()
        logger.info("All domain and tool records saved successfully!")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Scraper pipeline error: {e}", exc_info=True)
    finally:
        db.close()


async def _update_legacy_tools(db: Session, hn_stories: list, devto_articles: list):
    """Maintain backward-compatible tool-level records."""
    emerging_techs = list(get_emerging_tech_dict().values())
    tech_mentions = {t: {"github": [], "hn": [], "devto": []} for t in emerging_techs}
    
    # Fetch GitHub for individual tools
    for tech_name in emerging_techs:
        try:
            repos = await fetch_github_repos(settings.GITHUB_TOKEN, tech_name.lower())
            tech_mentions[tech_name]["github"] = repos
        except Exception as e:
            logger.error(f"Error fetching github repos for {tech_name}: {e}")
        await asyncio.sleep(0.5)
    
    # Match HN/DevTo to tools
    for s in hn_stories:
        title = s.get("title", "")
        for t in extract_technologies(title):
            if t in tech_mentions:
                tech_mentions[t]["hn"].append(s)
    
    for a in devto_articles:
        title = a.get("title", "")
        for t in extract_technologies(title):
            if t in tech_mentions:
                tech_mentions[t]["devto"].append(a)
    
    # Upsert
    for tech_name, data in tech_mentions.items():
        gh_count = len(data["github"])
        hn_count = len(data["hn"])
        dev_count = len(data["devto"])
        
        momentum_score = calculate_trend_score(gh_count, hn_count, dev_count)
        category = get_category_for_tech(tech_name)
        
        tech = db.query(Technology).filter(Technology.name == tech_name).first()
        if not tech:
            sorted_repos = sorted(data["github"], key=lambda x: x.get("stars", 0), reverse=True)
            desc = sorted_repos[0].get("description", "") if sorted_repos else ""
            if not desc:
                desc = f"A trending {category} tool observed across GitHub, HackerNews, and Dev.to."
            
            tech = Technology(name=tech_name, description=desc[:300] if desc else "")
            db.add(tech)
            db.flush()
        
        tech.trend_score = momentum_score
        tech.category = category
        tech.github_count = gh_count
        tech.hn_count = hn_count
        tech.devto_count = dev_count
        tech.updated_at = datetime.now(timezone.utc)
        
        # Upsert repositories (use savepoint so dupes don't kill the transaction)
        for r_data in sorted(data["github"], key=lambda x: x.get("stargazers_count", x.get("stars", 0)), reverse=True)[:5]:
            repo_url = r_data.get("html_url") or r_data.get("url")
            if not repo_url:
                continue
            try:
                repo = db.query(Repository).filter(Repository.url == repo_url).first()
                if not repo:
                    db.begin_nested()  # Savepoint
                    repo = Repository(
                        technology_id=tech.id,
                        name=r_data.get("full_name", ""),
                        stars=r_data.get("stargazers_count", r_data.get("stars", 0)),
                        forks=r_data.get("forks_count", r_data.get("forks", 0)),
                        url=repo_url,
                    )
                    db.add(repo)
                    db.flush()
                else:
                    repo.stars = r_data.get("stargazers_count", r_data.get("stars", 0))
                    repo.forks = r_data.get("forks_count", r_data.get("forks", 0))
            except Exception:
                db.rollback()  # Rolls back only the savepoint
        
        # Upsert articles (same savepoint pattern)
        for s_data in data["hn"][:5]:
            url = s_data.get("url")
            if not url:
                continue
            try:
                if not db.query(Article).filter(Article.url == url).first():
                    db.begin_nested()
                    db.add(Article(technology_id=tech.id, title=s_data.get("title", ""), source="hackernews", url=url))
                    db.flush()
            except Exception:
                db.rollback()
        
        for a_data in data["devto"][:5]:
            url = a_data.get("url")
            if not url:
                continue
            try:
                if not db.query(Article).filter(Article.url == url).first():
                    db.begin_nested()
                    db.add(Article(technology_id=tech.id, title=a_data.get("title", ""), source="devto", url=url))
                    db.flush()
            except Exception:
                db.rollback()

