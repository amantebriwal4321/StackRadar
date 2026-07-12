"""
Scheduler — Background scraper loop with sentiment-aware, tool-level aggregation pipeline.

Flow:
  1. Validate GitHub token + check rate budget
  2. Fetch raw data from all sources (GitHub repo stats, HN, DevTo, Reddit, RSS News)
  3. Run batch sentiment analysis on all content via Groq LLM
  4. Count sentiment-weighted mentions per tool
  5. Fetch GitHub stats per tool (shared client, adaptive delays)
  6. Calculate weighted scores, growth stages, and decision intelligence
  7. Upsert Tool records in database
  8. Insert daily ToolSnapshot for time-series tracking
  9. Aggregate tool scores per domain

Phase 1 improvements:
  - Shared httpx.AsyncClient for all GitHub calls (connection pooling)
  - Adaptive delay between calls based on X-RateLimit-Remaining
  - Token validation at start of each cycle
  - Rate budget logging

Phase 4 improvements:
  - Fixed github_stars_delta calculation
  - Accumulative mention_count in daily snapshots
  - 7-day rolling average for growth_pct calculation
"""

import asyncio
import logging
import time
import httpx
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.all_models import Tool, ToolSnapshot, Domain
from app.services.scraper import (
    fetch_github_repo_stats, fetch_hackernews, fetch_devto,
    fetch_reddit, fetch_tech_news, batch_sentiment_analysis,
    validate_github_token, _adaptive_delay, _rate_remaining, _rate_limit,
)
from app.services.scoring import (
    count_weighted_mentions, calculate_tool_score, calculate_all_tool_scores,
    classify_growth_stage, generate_tool_summary, TOOL_REGISTRY,
    classify_trend, generate_recommendation, classify_learning_priority,
    classify_text_to_tools,
)

logger = logging.getLogger(__name__)

scrape_status = {
    "last_scraped_time": None,
    "next_scraped_time": None,
    "is_running": False,
    "current_step": None,
    "start_time": None,
    "duration_seconds": None,
    "sources": {},
    "sentiment": {},
    "tools_updated": 0,
    "errors": [],
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
            scrape_status["errors"].append({"time": datetime.now(timezone.utc).isoformat(), "error": str(e)})

        await asyncio.sleep(1800)  # 30 minutes


async def perform_full_scrape():
    """
    Full scraping pipeline with Phase 1 + Phase 4 hardening.
    """
    _start = time.time()
    scrape_status["is_running"] = True
    scrape_status["start_time"] = datetime.now(timezone.utc).isoformat()
    scrape_status["current_step"] = "0/8 — Validating GitHub token"
    scrape_status["errors"] = []

    db: Session = SessionLocal()

    # Shared HTTP client for all GitHub calls (Phase 1.3 — connection pooling)
    github_client = httpx.AsyncClient(timeout=15.0)

    try:
        # ━━━ STEP 0: Validate GitHub token + verify catalog is seeded ━━━
        logger.info("Step 0: Validating GitHub token and verifying tool catalog...")
        await validate_github_token(github_client)

        # The catalog (app/services/catalog.py) is seeded on startup by run_seed
        # and kept clean by reconcile_catalog. The scraper must NOT create tool
        # rows here — doing so used to spawn category-less placeholder duplicates
        # and pollute the rankings. If a curated tool is somehow missing, warn
        # loudly rather than inventing a bare row.
        seeded_slugs = {s for (s,) in db.query(Tool.slug).all()}
        missing = [slug for slug in TOOL_REGISTRY if slug not in seeded_slugs]
        if missing:
            logger.warning(
                f"Step 0: {len(missing)} catalog tools missing from DB "
                f"(run_seed should have created them): {', '.join(missing)}"
            )

        # ━━━ STEP 1: Fetch all community sources ━━━
        scrape_status["current_step"] = "1/8 — Fetching community sources"
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
        scrape_status["current_step"] = "2/8 — Running sentiment analysis"
        logger.info("Step 2: Running sentiment analysis via Groq LLM...")

        all_content = hn_stories + devto_articles + reddit_posts + news_articles
        all_content = await batch_sentiment_analysis(all_content)

        # Split back into sources
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
        scrape_status["current_step"] = "3/8 — Counting mentions"
        logger.info("Step 3: Counting sentiment-weighted mentions per tool...")

        all_tools = db.query(Tool).filter(Tool.slug.in_(TOOL_REGISTRY.keys())).all()
        all_slugs = {t.slug for t in all_tools}

        hn_weighted = count_weighted_mentions(hn_stories, "hn", all_slugs)
        devto_weighted = count_weighted_mentions(devto_articles, "devto", all_slugs)
        reddit_weighted = count_weighted_mentions(reddit_posts, "reddit", all_slugs)
        news_weighted = count_weighted_mentions(news_articles, "news", all_slugs)

        # ━━━ STEP 4: Fetch GitHub stats (Phase 1 — shared client + adaptive delay) ━━━
        scrape_status["current_step"] = "4/8 — Fetching GitHub stats"
        logger.info("Step 4: Fetching GitHub repo stats (shared client, adaptive delays)...")

        github_stats: dict[str, dict] = {}
        for tool in all_tools:
            if tool.github_repo:
                stats = await fetch_github_repo_stats(tool.github_repo, client=github_client)
                if stats:
                    github_stats[tool.slug] = stats

                # Adaptive delay (Phase 1.2)
                delay = _adaptive_delay()
                await asyncio.sleep(delay)

        scrape_status["sources"]["github_repos"] = len(github_stats)
        logger.info(
            f"GitHub: Fetched stats for {len(github_stats)}/{len(all_tools)} repos "
            f"(rate remaining: {_rate_remaining}/{_rate_limit})"
        )

        # ━━━ STEP 5: Calculate scores + Decision Intelligence ━━━
        scrape_status["current_step"] = "5/8 — Computing scores"
        logger.info("Step 5: Computing scores, growth, and decision intelligence...")

        today = date.today()
        tools_updated = 0

        # 5a. Count raw sentiment per tool
        tool_sentiment_pos: dict[str, int] = {t.slug: 0 for t in all_tools}
        tool_sentiment_neg: dict[str, int] = {t.slug: 0 for t in all_tools}

        for item in all_content:
            sentiment = item.get("sentiment", "neutral")
            title = item.get("title", "")
            tags = " ".join(item.get("tag_list", [])) if isinstance(item.get("tag_list"), list) else ""
            subreddit = item.get("subreddit", "")
            text = f"{title} {tags} {subreddit}".strip()
            matched = classify_text_to_tools(text)
            for slug in matched:
                if sentiment == "positive":
                    tool_sentiment_pos[slug] = tool_sentiment_pos.get(slug, 0) + 1
                elif sentiment == "negative":
                    tool_sentiment_neg[slug] = tool_sentiment_neg.get(slug, 0) + 1

        # 5b. Prepare data for batch percentile scoring
        tool_signals = []
        for tool in all_tools:
            slug = tool.slug
            gh = github_stats.get(slug, {})

            new_stars = gh.get("stars", tool.stars)
            new_forks = gh.get("forks", tool.forks)

            hn_val = hn_weighted.get(slug, 0.0)
            devto_val = devto_weighted.get(slug, 0.0)
            reddit_val = reddit_weighted.get(slug, 0.0)
            news_val = news_weighted.get(slug, 0.0)

            hn_count = max(0, round(hn_val))
            devto_count = max(0, round(devto_val))
            reddit_count = max(0, round(reddit_val))
            news_count = max(0, round(news_val))

            tool_signals.append({
                "stars": new_stars,
                "forks": new_forks,
                "hn_count": hn_count,
                "devto_count": devto_count,
                "reddit_count": reddit_count,
                "news_count": news_count,
                "mention_count": hn_count + devto_count + reddit_count + news_count,
            })

        # 5c. Calculate ALL scores at once (percentile-based)
        all_scores = calculate_all_tool_scores(tool_signals)

        # 5d. Apply scores, sentiment, and decision intelligence
        scrape_status["current_step"] = "6/8 — Updating tool records"

        for i, tool in enumerate(all_tools):
            slug = tool.slug
            gh = github_stats.get(slug, {})
            signals = tool_signals[i]
            new_score = all_scores[i]

            new_stars = signals["stars"]
            new_forks = signals["forks"]
            hn_count = signals["hn_count"]
            devto_count = signals["devto_count"]
            reddit_count = signals["reddit_count"]
            news_count = signals["news_count"]

            # Phase 4.3: 7-day rolling average growth calculation
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            avg_result = db.query(func.avg(ToolSnapshot.score)).filter(
                ToolSnapshot.tool_id == tool.id,
                ToolSnapshot.recorded_at >= seven_days_ago,
            ).scalar()

            if avg_result and avg_result > 0:
                growth_pct = round(((new_score - float(avg_result)) / float(avg_result)) * 100, 1)
            else:
                growth_pct = 0.0

            # Decision Intelligence
            trend_stage = classify_trend(growth_pct)
            recommendation = generate_recommendation(tool.name, trend_stage, new_score)
            learning_priority = classify_learning_priority(trend_stage)
            stage = classify_growth_stage(new_score)

            # Sentiment label
            pos = tool_sentiment_pos.get(slug, 0)
            neg = tool_sentiment_neg.get(slug, 0)
            if pos + neg == 0:
                sentiment_label = "neutral"
            elif pos > neg * 2:
                sentiment_label = "positive"
            elif neg > pos * 2:
                sentiment_label = "negative"
            else:
                sentiment_label = "mixed"

            sentiment_score = 0.0
            if pos + neg > 0:
                sentiment_score = float((pos - neg) / (pos + neg))

            # Phase 4.1: Calculate stars delta BEFORE updating tool.stars
            stars_delta = new_stars - (tool.stars or 0) if tool.stars else 0

            # Update tool record
            tool.github_stars = new_stars
            tool.stars = new_stars
            tool.forks = new_forks
            tool.open_issues = gh.get("open_issues", tool.open_issues)
            tool.watchers = gh.get("watchers", tool.watchers)
            tool.hn_count = hn_count
            tool.devto_count = devto_count
            tool.reddit_count = reddit_count
            tool.news_count = news_count
            tool.mention_count = hn_count + devto_count + reddit_count + news_count
            tool.score = new_score
            tool.growth_pct = growth_pct
            tool.stage = stage
            tool.trend_stage = trend_stage
            tool.recommendation = recommendation
            tool.learning_priority = learning_priority
            tool.sentiment_positive = pos
            tool.sentiment_negative = neg
            tool.sentiment_label = sentiment_label
            tool.sentiment_score = sentiment_score
            tool.last_updated = datetime.now(timezone.utc)

            # ━━━ STEP 7: Insert daily snapshot ━━━
            total_mentions = hn_count + devto_count + reddit_count + news_count

            existing_snapshot = db.query(ToolSnapshot).filter(
                ToolSnapshot.tool_id == tool.id,
                ToolSnapshot.recorded_at >= datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
            ).first()

            if existing_snapshot:
                existing_snapshot.score = new_score
                # Phase 4.1: Store actual stars delta, not self-referencing subtraction
                existing_snapshot.github_stars_delta = stars_delta
                # Phase 4.2: Accumulate mentions throughout the day
                existing_snapshot.mention_count = (existing_snapshot.mention_count or 0) + total_mentions
                existing_snapshot.sentiment_score = sentiment_score
            else:
                snapshot = ToolSnapshot(
                    tool_id=tool.id,
                    recorded_at=datetime.now(timezone.utc),
                    score=new_score,
                    github_stars_delta=stars_delta,
                    mention_count=total_mentions,
                    sentiment_score=sentiment_score,
                )
                db.add(snapshot)

            tools_updated += 1

            logger.info(
                f"  {tool.name}: score={new_score} growth={growth_pct:+.1f}% "
                f"trend={trend_stage} priority={learning_priority} "
                f"⭐{new_stars:,} HN={hn_count} DT={devto_count} "
                f"RD={reddit_count} NW={news_count} "
                f"sentiment={sentiment_label}(+{pos}/-{neg})"
            )

        # ━━━ STEP 8: Aggregate domain scores ━━━
        scrape_status["current_step"] = "7/8 — Aggregating domains"
        logger.info("Step 8: Aggregating domain-level scores...")

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
        scrape_status["current_step"] = "8/8 — Saving to database"
        db.commit()
        logger.info(f"All {tools_updated} tools updated and saved successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Scraper pipeline error: {e}", exc_info=True)
        scrape_status["errors"].append({"time": datetime.now(timezone.utc).isoformat(), "error": str(e)})
    finally:
        db.close()
        await github_client.aclose()
        scrape_status["is_running"] = False
        scrape_status["current_step"] = None
        scrape_status["duration_seconds"] = round(time.time() - _start, 1)
