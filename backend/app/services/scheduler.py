"""
Scheduler — Background scraper loop with sentiment-aware, tool-level aggregation pipeline.

Flow:
  1. Fetch raw data from all sources (GitHub repo stats, HN, DevTo, Reddit, RSS News)
  2. Run batch sentiment analysis on all content via Groq LLM
  3. Count sentiment-weighted mentions per tool
  4. Fetch GitHub stats per tool (targeted, 1 API call each)
  5. Calculate weighted scores, growth stages, and decision intelligence
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
    fetch_reddit, fetch_tech_news, batch_sentiment_analysis,
)
from app.services.scoring import (
    count_weighted_mentions, calculate_tool_score,
    classify_growth_stage, generate_tool_summary,
    classify_trend, generate_recommendation, classify_learning_priority,
)

logger = logging.getLogger(__name__)

scrape_status = {
    "last_scraped_time": None,
    "next_scraped_time": None,
    "sources": {},
    "sentiment": {},
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
    1. Fetch community sources in parallel
    2. Sentiment analysis via Groq LLM
    3. Count sentiment-weighted mentions per tool
    4. Fetch GitHub stats per tool
    5. Calculate scores, growth, decision intelligence
    6. Save to DB + create daily snapshot
    7. Aggregate domain scores
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

        # ━━━ STEP 2: Sentiment Analysis ━━━
        logger.info("Step 2: Running sentiment analysis via Groq LLM...")

        all_content = hn_stories + devto_articles + reddit_posts + news_articles
        all_content = await batch_sentiment_analysis(all_content)

        # Split back into sources (they were concatenated in order)
        hn_end = len(hn_stories)
        devto_end = hn_end + len(devto_articles)
        reddit_end = devto_end + len(reddit_posts)

        hn_stories = all_content[:hn_end]
        devto_articles = all_content[hn_end:devto_end]
        reddit_posts = all_content[devto_end:reddit_end]
        news_articles = all_content[reddit_end:]

        # Log sentiment distribution
        total_pos = sum(1 for item in all_content if item.get("sentiment") == "positive")
        total_neg = sum(1 for item in all_content if item.get("sentiment") == "negative")
        total_neu = sum(1 for item in all_content if item.get("sentiment") == "neutral")
        logger.info(f"Sentiment totals: +{total_pos} positive, -{total_neg} negative, ~{total_neu} neutral")

        scrape_status["sentiment"] = {
            "positive": total_pos,
            "negative": total_neg,
            "neutral": total_neu,
            "total": len(all_content),
        }

        # ━━━ STEP 3: Count sentiment-weighted mentions per tool ━━━
        logger.info("Step 3: Counting sentiment-weighted mentions per tool...")

        all_tools = db.query(Tool).all()
        all_slugs = {t.slug for t in all_tools}

        hn_weighted = count_weighted_mentions(hn_stories, "hn", all_slugs)
        devto_weighted = count_weighted_mentions(devto_articles, "devto", all_slugs)
        reddit_weighted = count_weighted_mentions(reddit_posts, "reddit", all_slugs)
        news_weighted = count_weighted_mentions(news_articles, "news", all_slugs)

        # ━━━ STEP 4: Fetch GitHub stats per tool ━━━
        logger.info("Step 4: Fetching GitHub repo stats per tool...")

        github_stats: dict[str, dict] = {}
        for tool in all_tools:
            if tool.github_repo:
                stats = await fetch_github_repo_stats(tool.github_repo)
                if stats:
                    github_stats[tool.slug] = stats
                await asyncio.sleep(0.5)

        scrape_status["sources"]["github_repos"] = len(github_stats)
        logger.info(f"GitHub: Fetched stats for {len(github_stats)} / {len(all_tools)} repos")

        # ━━━ STEP 5: Calculate scores + Decision Intelligence ━━━
        logger.info("Step 5: Computing scores, growth, and decision intelligence...")

        today = date.today()
        tools_updated = 0

        for tool in all_tools:
            slug = tool.slug
            gh = github_stats.get(slug, {})

            new_stars = gh.get("stars", tool.stars)
            new_forks = gh.get("forks", tool.forks)

            # Get sentiment-weighted mention counts (round for DB storage)
            hn_val = hn_weighted.get(slug, 0.0)
            devto_val = devto_weighted.get(slug, 0.0)
            reddit_val = reddit_weighted.get(slug, 0.0)
            news_val = news_weighted.get(slug, 0.0)

            # Use max(0, ...) so a net-negative count doesn't go below zero
            hn_count = max(0, round(hn_val))
            devto_count = max(0, round(devto_val))
            reddit_count = max(0, round(reddit_val))
            news_count = max(0, round(news_val))

            # Calculate score using the sentiment-adjusted counts
            new_score = calculate_tool_score(
                stars=new_stars,
                forks=new_forks,
                hn_count=hn_count,
                devto_count=devto_count,
                reddit_count=reddit_count,
                news_count=news_count,
            )

            # Calculate growth percentage
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
            tool.hn_count = hn_count
            tool.devto_count = devto_count
            tool.reddit_count = reddit_count
            tool.news_count = news_count
            tool.score = new_score
            tool.growth_pct = growth_pct
            tool.stage = stage
            tool.trend_stage = trend_stage
            tool.recommendation = recommendation
            tool.learning_priority = learning_priority
            tool.updated_at = datetime.now(timezone.utc)

            # ━━━ STEP 6: Insert daily snapshot (upsert) ━━━
            total_mentions = hn_count + devto_count + reddit_count + news_count

            existing_snapshot = db.query(ToolSnapshot).filter(
                ToolSnapshot.tool_id == tool.id,
                ToolSnapshot.date == today,
            ).first()

            if existing_snapshot:
                existing_snapshot.score = new_score
                existing_snapshot.stars = new_stars
                existing_snapshot.forks = new_forks
                existing_snapshot.mentions = total_mentions
                existing_snapshot.hn_count = hn_count
                existing_snapshot.devto_count = devto_count
                existing_snapshot.reddit_count = reddit_count
            else:
                snapshot = ToolSnapshot(
                    tool_id=tool.id,
                    date=today,
                    score=new_score,
                    stars=new_stars,
                    forks=new_forks,
                    mentions=total_mentions,
                    hn_count=hn_count,
                    devto_count=devto_count,
                    reddit_count=reddit_count,
                )
                db.add(snapshot)

            tools_updated += 1

            # Log with sentiment indicator
            sentiment_indicator = ""
            raw_weighted = hn_val + devto_val + reddit_val + news_val
            if raw_weighted < 0:
                sentiment_indicator = " 🔴(net negative buzz)"
            elif raw_weighted > 2:
                sentiment_indicator = " 🟢(strong positive buzz)"

            logger.info(
                f"  {tool.name}: score={new_score} growth={growth_pct:+.1f}% "
                f"trend={trend_stage} priority={learning_priority} "
                f"⭐{new_stars:,} HN={hn_count} DT={devto_count} "
                f"RD={reddit_count} NW={news_count}{sentiment_indicator}"
            )

        # ━━━ STEP 7: Aggregate domain scores ━━━
        logger.info("Step 7: Aggregating domain-level scores...")

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
