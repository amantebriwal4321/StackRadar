"""
Scheduler — Background scraper loop with tool-level aggregation pipeline.

Flow:
  1. Fetch raw data from all sources (GitHub repo stats, HN, DevTo, Reddit, RSS News)
  2. Classify each content item into tool slugs using keyword matching
  3. Aggregate signal counts per tool
  4. Calculate weighted scores and growth stages
  5. Run Decision Intelligence Layer (trend classification, recommendations)
  6. Upsert Tool records in database
  7. Insert daily ToolSnapshot for time-series tracking
  8. Aggregate tool scores per domain
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import Tool, ToolSnapshot, Domain
from app.services.scraper import (
    fetch_github_repo_stats, fetch_hackernews, fetch_devto,
    fetch_reddit, fetch_tech_news,
)
from app.services.scoring import (
    classify_text_to_tools, calculate_tool_score,
    classify_growth_stage, generate_tool_summary,
    classify_trend, generate_recommendation, classify_learning_priority,
)

logger = logging.getLogger(__name__)

scrape_status = {
    "last_scraped_time": None,
    "next_scraped_time": None,
    "sources": {},
    "tools_updated": 0,
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
    1. Fetch community sources in parallel (HN, DevTo, Reddit, News)
    2. Classify content → tool mentions
    3. Fetch GitHub stats per tool (targeted, 1 API call each)
    4. Calculate scores, growth, decision intelligence
    5. Save to DB + create daily snapshot
    6. Aggregate domain scores
    """
    db: Session = SessionLocal()

    try:
        # ━━━ STEP 1: Fetch all community sources ━━━
        logger.info("Step 1: Fetching from community sources...")

        hn_stories, devto_articles, reddit_posts, news_articles = await asyncio.gather(
            fetch_hackernews(),
            fetch_devto(),
            fetch_reddit(),
            fetch_tech_news(),
        )

        scrape_status["sources"] = {
            "hackernews": len(hn_stories),
            "devto": len(devto_articles),
            "reddit": len(reddit_posts),
            "news": len(news_articles),
        }

        logger.info(
            f"Fetched: HN={len(hn_stories)}, DevTo={len(devto_articles)}, "
            f"Reddit={len(reddit_posts)}, News={len(news_articles)}"
        )

        # ━━━ STEP 2: Classify content → tool mentions ━━━
        logger.info("Step 2: Classifying content into tool mentions...")

        # Initialize mention counters for all tools
        all_tools = db.query(Tool).all()
        tool_mentions: dict[str, dict[str, int]] = {
            t.slug: {"hn": 0, "devto": 0, "reddit": 0, "news": 0}
            for t in all_tools
        }

        # Classify HN stories
        for story in hn_stories:
            title = story.get("title", "")
            for slug in classify_text_to_tools(title):
                if slug in tool_mentions:
                    tool_mentions[slug]["hn"] += 1

        # Classify DevTo articles
        for article in devto_articles:
            title = article.get("title", "")
            tags = " ".join(article.get("tag_list", []) if isinstance(article.get("tag_list"), list) else [])
            for slug in classify_text_to_tools(f"{title} {tags}"):
                if slug in tool_mentions:
                    tool_mentions[slug]["devto"] += 1

        # Classify Reddit posts
        for post in reddit_posts:
            title = post.get("title", "")
            subreddit = post.get("subreddit", "")
            for slug in classify_text_to_tools(f"{title} {subreddit}"):
                if slug in tool_mentions:
                    tool_mentions[slug]["reddit"] += 1

        # Classify News articles
        for article in news_articles:
            title = article.get("title", "")
            for slug in classify_text_to_tools(title):
                if slug in tool_mentions:
                    tool_mentions[slug]["news"] += 1

        # ━━━ STEP 3: Fetch GitHub stats per tool ━━━
        logger.info("Step 3: Fetching GitHub repo stats per tool...")

        github_stats: dict[str, dict] = {}
        for tool in all_tools:
            if tool.github_repo:
                stats = await fetch_github_repo_stats(tool.github_repo)
                if stats:
                    github_stats[tool.slug] = stats
                await asyncio.sleep(0.5)  # 0.5s gap — 25 tools × 0.5s = ~12.5s total

        scrape_status["sources"]["github_repos"] = len(github_stats)
        logger.info(f"GitHub: Fetched stats for {len(github_stats)} / {len(all_tools)} repos")

        # ━━━ STEP 4: Calculate scores + Decision Intelligence ━━━
        logger.info("Step 4: Computing scores, growth, and decision intelligence...")

        today = date.today()
        tools_updated = 0

        for tool in all_tools:
            slug = tool.slug
            mentions = tool_mentions.get(slug, {"hn": 0, "devto": 0, "reddit": 0, "news": 0})
            gh = github_stats.get(slug, {})

            new_stars = gh.get("stars", tool.stars)
            new_forks = gh.get("forks", tool.forks)

            # Calculate score
            new_score = calculate_tool_score(
                stars=new_stars,
                forks=new_forks,
                hn_count=mentions["hn"],
                devto_count=mentions["devto"],
                reddit_count=mentions["reddit"],
                news_count=mentions["news"],
            )

            # Calculate growth percentage (compare to previous score)
            old_score = tool.score if tool.score else 0.0
            if old_score > 0:
                growth_pct = round(((new_score - old_score) / old_score) * 100, 1)
            else:
                growth_pct = 0.0

            # Decision Intelligence
            trend_stage = classify_trend(growth_pct)
            recommendation = generate_recommendation(tool.name, trend_stage, new_score)
            learning_priority = classify_learning_priority(trend_stage)
            stage = classify_growth_stage(new_score)

            # Update tool record
            tool.stars = new_stars
            tool.forks = new_forks
            tool.open_issues = gh.get("open_issues", tool.open_issues)
            tool.watchers = gh.get("watchers", tool.watchers)
            tool.hn_count = mentions["hn"]
            tool.devto_count = mentions["devto"]
            tool.reddit_count = mentions["reddit"]
            tool.news_count = mentions["news"]
            tool.score = new_score
            tool.growth_pct = growth_pct
            tool.stage = stage
            tool.trend_stage = trend_stage
            tool.recommendation = recommendation
            tool.learning_priority = learning_priority
            tool.updated_at = datetime.now(timezone.utc)

            # ━━━ STEP 5: Insert daily snapshot (upsert) ━━━
            total_mentions = mentions["hn"] + mentions["devto"] + mentions["reddit"] + mentions["news"]

            existing_snapshot = db.query(ToolSnapshot).filter(
                ToolSnapshot.tool_id == tool.id,
                ToolSnapshot.date == today,
            ).first()

            if existing_snapshot:
                existing_snapshot.score = new_score
                existing_snapshot.stars = new_stars
                existing_snapshot.forks = new_forks
                existing_snapshot.mentions = total_mentions
                existing_snapshot.hn_count = mentions["hn"]
                existing_snapshot.devto_count = mentions["devto"]
                existing_snapshot.reddit_count = mentions["reddit"]
            else:
                snapshot = ToolSnapshot(
                    tool_id=tool.id,
                    date=today,
                    score=new_score,
                    stars=new_stars,
                    forks=new_forks,
                    mentions=total_mentions,
                    hn_count=mentions["hn"],
                    devto_count=mentions["devto"],
                    reddit_count=mentions["reddit"],
                )
                db.add(snapshot)

            tools_updated += 1

            logger.info(
                f"  {tool.name}: score={new_score} growth={growth_pct:+.1f}% "
                f"trend={trend_stage} priority={learning_priority} "
                f"⭐{new_stars:,} HN={mentions['hn']} DT={mentions['devto']} "
                f"RD={mentions['reddit']} NW={mentions['news']}"
            )

        # ━━━ STEP 6: Aggregate domain scores ━━━
        logger.info("Step 6: Aggregating domain-level scores...")

        domains = db.query(Domain).all()
        for domain in domains:
            domain_tools = [t for t in all_tools if t.domain_id == domain.id]
            if domain_tools:
                domain.score = round(
                    sum(t.score for t in domain_tools) / len(domain_tools), 1
                )
                top_stage_counts = {}
                for t in domain_tools:
                    stage = t.stage
                    top_stage_counts[stage] = top_stage_counts.get(stage, 0) + 1
                domain.stage = max(top_stage_counts, key=top_stage_counts.get) if top_stage_counts else "Emerging"

                # Generate domain summary from constituent tools
                tool_names = [t.name for t in sorted(domain_tools, key=lambda x: x.score, reverse=True)[:3]]
                domain.summary = (
                    f"{domain.name} domain (avg score: {domain.score}) "
                    f"led by {', '.join(tool_names)}."
                )
                domain.updated_at = datetime.now(timezone.utc)

                logger.info(f"  {domain.name}: avg_score={domain.score} stage={domain.stage}")

        scrape_status["tools_updated"] = tools_updated
        db.commit()
        logger.info(f"All {tools_updated} tools updated and saved successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Scraper pipeline error: {e}", exc_info=True)
    finally:
        db.close()
