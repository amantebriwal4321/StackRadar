"""
API Endpoints — Tool-based tech intelligence platform.

Endpoints:
  GET  /tools                    — All tools sorted by score (optional ?category= filter, pagination)
  GET  /tools/{slug}             — Single tool detail with decision intelligence
  GET  /tools/{slug}/history     — Last 30 days of time-series data
  GET  /tools/compare            — Side-by-side tool comparison (2-5 tools)
  GET  /roadmaps                 — All available roadmaps
  GET  /roadmaps/{slug}          — Single roadmap with full steps
  GET  /domains                  — Domain-level summaries
  GET  /domains/{slug}/learning-path — Learning path for a domain
  GET  /status                   — Scraper status with real-time progress
  GET  /health                   — Quick health check
  POST /admin/scrape             — Manually trigger a scrape cycle
"""

import json
import re
import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta, datetime
from app.db.session import get_db
from app.models.all_models import Tool, ToolSnapshot, ToolRoadmap, Domain
from app.services.scheduler import scrape_status

router = APIRouter()

# Valid slug pattern: lowercase letters, numbers, hyphens, dots
SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")

def validate_slug(slug: str) -> str:
    """Validate that a slug is safe for DB queries."""
    if not SLUG_PATTERN.match(slug):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid slug '{slug}'. Slugs must be lowercase alphanumeric with hyphens/dots only."
        )
    return slug


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/tools")
def get_tools(
    request: Request,
    category: str = Query(None, description="Filter by category (e.g. 'AI / ML')"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
):
    """Get all tools sorted by score, optionally filtered by category. Supports pagination."""
    # Fetch ALL tools to compute global rank
    all_tools = db.query(Tool).order_by(Tool.score.desc()).all()
    total_tools = len(all_tools)

    # Build rank map (global)
    rank_map = {}
    for idx, t in enumerate(all_tools):
        rank_map[t.id] = idx + 1

    # Build category rank map
    cat_tools: dict[str, list] = {}
    for t in all_tools:
        cat_tools.setdefault(t.category, []).append(t)
    cat_rank_map = {}
    for cat, tools_in_cat in cat_tools.items():
        for idx, t in enumerate(tools_in_cat):
            cat_rank_map[t.id] = (idx + 1, len(tools_in_cat))

    # Build parent slug map (no N+1 queries)
    id_to_slug = {t.id: t.slug for t in all_tools}

    # Phase 4.5: Batch-fetch last 7 daily scores for sparklines
    seven_days_ago = datetime.now() - timedelta(days=7)
    tool_ids = [t.id for t in all_tools]
    sparkline_map: dict[int, list[float]] = {tid: [] for tid in tool_ids}
    if tool_ids:
        snapshots = (
            db.query(ToolSnapshot.tool_id, ToolSnapshot.score, ToolSnapshot.recorded_at)
            .filter(ToolSnapshot.tool_id.in_(tool_ids), ToolSnapshot.recorded_at >= seven_days_ago)
            .order_by(ToolSnapshot.recorded_at.asc())
            .all()
        )
        for snap in snapshots:
            if snap.tool_id in sparkline_map:
                sparkline_map[snap.tool_id].append(round(snap.score, 1) if snap.score else 0.0)

    # Filter if category specified
    if category:
        tools = [t for t in all_tools if category.lower() in (t.category or "").lower()]
    else:
        tools = all_tools

    # Pagination
    total_filtered = len(tools)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_tools = tools[start:end]

    tool_items = [
        {
            "slug": t.slug,
            "name": t.name,
            "description": t.description,
            "icon": t.icon,
            "category": t.category,
            "github_repo": t.github_repo,
            "score": t.score,
            "stage": t.stage,
            "stars": t.stars,
            "forks": t.forks,
            "growth_pct": t.growth_pct,
            "hn_count": t.hn_count,
            "devto_count": t.devto_count,
            "reddit_count": t.reddit_count,
            "news_count": t.news_count,
            "trend_stage": t.trend_stage,
            "recommendation": t.recommendation,
            "learning_priority": t.learning_priority,
            "level": t.level,
            "is_entry_point": t.is_entry_point,
            "learning_sequence_score": t.learning_sequence_score,
            "parent_slug": id_to_slug.get(t.parent_tool_id) if t.parent_tool_id else None,
            "sentiment_label": t.sentiment_label or "neutral",
            "sentiment_positive": t.sentiment_positive or 0,
            "sentiment_negative": t.sentiment_negative or 0,
            "rank": rank_map.get(t.id, 0),
            "rank_in_category": cat_rank_map.get(t.id, (0, 0))[0],
            "category_size": cat_rank_map.get(t.id, (0, 0))[1],
            "percentile": round((1 - (rank_map.get(t.id, total_tools) - 1) / max(total_tools - 1, 1)) * 100) if total_tools > 1 else 50,
            "last_7_scores": sparkline_map.get(t.id, []),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in paginated_tools
    ]

    return {
        "tools": tool_items,
        "total": total_filtered,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_filtered + per_page - 1) // per_page,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOLS BY DOMAIN (Phase 3.1 — for Explore page)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/tools/by-domain")
def get_tools_by_domain(db: Session = Depends(get_db)):
    """Get all tools grouped by domain. Used by the Explore page."""
    domains = db.query(Domain).order_by(Domain.score.desc()).all()
    result = []
    for domain in domains:
        domain_tools = (
            db.query(Tool)
            .filter(Tool.domain_id == domain.id)
            .order_by(Tool.score.desc())
            .all()
        )
        result.append({
            "name": domain.name,
            "slug": domain.slug,
            "icon": domain.icon,
            "score": domain.score,
            "tools": [
                {
                    "slug": t.slug,
                    "name": t.name,
                    "icon": t.icon,
                    "score": t.score,
                    "stars": t.stars,
                    "stage": t.stage,
                    "growth_pct": t.growth_pct,
                    "learning_priority": t.learning_priority,
                    "description": t.description,
                }
                for t in domain_tools
            ],
        })
    return {"domains": result}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPARE (must be before /tools/{slug} to avoid slug capture)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/tools/compare")
def compare_tools(
    slugs: str = Query(..., description="Comma-separated tool slugs (2-5), e.g. 'react,vuejs,svelte'"),
    db: Session = Depends(get_db),
):
    """Compare multiple tools side by side with their history data."""
    slug_list = [s.strip() for s in slugs.split(",") if s.strip()]
    if len(slug_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 tool slugs to compare")
    if len(slug_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 tools can be compared at once")

    tools = db.query(Tool).filter(Tool.slug.in_(slug_list)).all()
    if len(tools) < 2:
        raise HTTPException(status_code=404, detail=f"Not enough tools found. Found: {[t.slug for t in tools]}")

    # Fetch 30-day history for all tools
    cutoff = date.today() - timedelta(days=30)
    result = []
    for tool in tools:
        snapshots = (
            db.query(ToolSnapshot)
            .filter(ToolSnapshot.tool_id == tool.id, ToolSnapshot.recorded_at >= datetime(cutoff.year, cutoff.month, cutoff.day))
            .order_by(ToolSnapshot.recorded_at.asc())
            .all()
        )
        result.append({
            "slug": tool.slug,
            "name": tool.name,
            "icon": tool.icon,
            "category": tool.category,
            "score": tool.score,
            "stage": tool.stage,
            "stars": tool.stars,
            "forks": tool.forks,
            "growth_pct": tool.growth_pct,
            "hn_count": tool.hn_count,
            "devto_count": tool.devto_count,
            "reddit_count": tool.reddit_count,
            "news_count": tool.news_count,
            "sentiment_label": tool.sentiment_label or "neutral",
            "sentiment_positive": tool.sentiment_positive or 0,
            "sentiment_negative": tool.sentiment_negative or 0,
            "learning_priority": tool.learning_priority,
            "recommendation": tool.recommendation,
            "history": [
                {"date": s.recorded_at.isoformat(), "score": s.score, "github_stars_delta": s.github_stars_delta, "mention_count": s.mention_count, "sentiment_score": s.sentiment_score}
                for s in snapshots
            ],
        })

    return {"tools": result}


@router.get("/tools/{slug}")
def get_tool_detail(slug: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific tool."""
    validate_slug(slug)
    tool = db.query(Tool).filter(Tool.slug == slug).first()
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{slug}' not found")

    # Check if a roadmap exists for this tool (tool-specific first, then domain-level)
    # Priority: slug-match (e.g., "react") > tool_id match > domain-level fallback
    roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.slug == tool.slug).first()
    if not roadmap:
        roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.tool_id == tool.id).first()
    if not roadmap and tool.domain_rel:
        roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.slug == tool.domain_rel.slug).first()

    total_mentions = tool.hn_count + tool.devto_count + tool.reddit_count + tool.news_count

    # Look up parent tool slug
    parent_tool_slug = None
    if tool.parent_tool_id:
        parent = db.query(Tool).filter(Tool.id == tool.parent_tool_id).first()
        if parent:
            parent_tool_slug = parent.slug

    # Compute rank within category
    cat_tools = db.query(Tool).filter(Tool.category == tool.category).order_by(Tool.score.desc()).all()
    rank_in_cat = next((i + 1 for i, t in enumerate(cat_tools) if t.id == tool.id), 0)

    # Global rank
    all_tools = db.query(Tool).order_by(Tool.score.desc()).all()
    global_rank = next((i + 1 for i, t in enumerate(all_tools) if t.id == tool.id), 0)
    total_tools = len(all_tools)

    return {
        "slug": tool.slug,
        "name": tool.name,
        "description": tool.description,
        "icon": tool.icon,
        "category": tool.category,
        "github_repo": tool.github_repo,
        "score": tool.score,
        "stage": tool.stage,
        "stars": tool.stars,
        "forks": tool.forks,
        "open_issues": tool.open_issues,
        "watchers": tool.watchers,
        "growth_pct": tool.growth_pct,
        "total_mentions": total_mentions,
        "hn_count": tool.hn_count,
        "devto_count": tool.devto_count,
        "reddit_count": tool.reddit_count,
        "news_count": tool.news_count,
        "trend_stage": tool.trend_stage,
        "recommendation": tool.recommendation,
        "learning_priority": tool.learning_priority,
        "level": tool.level,
        "is_entry_point": tool.is_entry_point,
        "learning_sequence_score": tool.learning_sequence_score,
        "parent_slug": parent_tool_slug,
        "parent_name": parent.name if tool.parent_tool_id and parent else None,
        "has_roadmap": roadmap is not None,
        "roadmap_slug": roadmap.slug if roadmap else None,
        "sentiment_label": tool.sentiment_label or "neutral",
        "sentiment_positive": tool.sentiment_positive or 0,
        "sentiment_negative": tool.sentiment_negative or 0,
        "rank": global_rank,
        "rank_in_category": rank_in_cat,
        "category_size": len(cat_tools),
        "percentile": round((1 - (global_rank - 1) / max(total_tools - 1, 1)) * 100) if total_tools > 1 else 50,
        "updated_at": tool.updated_at.isoformat() if tool.updated_at else None,
    }


@router.get("/tools/{slug}/history")
def get_tool_history(slug: str, days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db)):
    """Get time-series data for a tool (last N days)."""
    validate_slug(slug)
    tool = db.query(Tool).filter(Tool.slug == slug).first()
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{slug}' not found")

    cutoff = date.today() - timedelta(days=days)
    snapshots = (
        db.query(ToolSnapshot)
        .filter(ToolSnapshot.tool_id == tool.id, ToolSnapshot.recorded_at >= datetime(cutoff.year, cutoff.month, cutoff.day))
        .order_by(ToolSnapshot.recorded_at.asc())
        .all()
    )

    return {
        "slug": tool.slug,
        "name": tool.name,
        "days": days,
        "data": [
            {
                "date": s.recorded_at.isoformat(),
                "score": s.score,
                "github_stars_delta": s.github_stars_delta,
                "mention_count": s.mention_count,
                "sentiment_score": s.sentiment_score,
            }
            for s in snapshots
        ],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROADMAPS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/roadmaps")
def get_roadmaps(db: Session = Depends(get_db)):
    """Get all available learning roadmaps."""
    roadmaps = db.query(ToolRoadmap).all()

    return [
        {
            "slug": rm.slug,
            "title": rm.title,
            "description": rm.description,
            "icon": rm.icon,
            "estimated_weeks": rm.estimated_weeks,
            "step_count": len(json.loads(rm.steps_json)) if rm.steps_json else 0,
        }
        for rm in roadmaps
    ]


@router.get("/roadmaps/{slug}")
def get_roadmap(slug: str, db: Session = Depends(get_db)):
    """Get a full roadmap with all steps."""
    roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.slug == slug).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail=f"Roadmap '{slug}' not found")

    steps = json.loads(roadmap.steps_json) if roadmap.steps_json else []

    return {
        "slug": roadmap.slug,
        "title": roadmap.title,
        "description": roadmap.description,
        "icon": roadmap.icon,
        "estimated_weeks": roadmap.estimated_weeks,
        "steps": steps,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOMAINS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/domains")
def get_domains(db: Session = Depends(get_db)):
    """Get all technology domains with aggregated scores."""
    domains = db.query(Domain).order_by(Domain.score.desc()).all()

    result = []
    for d in domains:
        tool_count = db.query(Tool).filter(Tool.domain_id == d.id).count()
        result.append({
            "slug": d.slug,
            "name": d.name,
            "icon": d.icon,
            "score": d.score,
            "stage": d.stage,
            "summary": d.summary,
            "tool_count": tool_count,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        })

    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEARNING PATHS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/domains/{domain_slug}/learning-path")
def get_learning_path(domain_slug: str, db: Session = Depends(get_db)):
    """Get a structured learning path for a domain, grouped by level."""
    domain = db.query(Domain).filter(Domain.slug == domain_slug).first()
    if not domain:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_slug}' not found")

    tools = (
        db.query(Tool)
        .filter(Tool.domain_id == domain.id)
        .order_by(Tool.learning_sequence_score.asc())
        .all()
    )

    def tool_summary(t: Tool):
        parent_slug = None
        if t.parent_tool_id:
            parent = db.query(Tool).filter(Tool.id == t.parent_tool_id).first()
            parent_slug = parent.slug if parent else None
        return {
            "slug": t.slug,
            "name": t.name,
            "icon": t.icon,
            "score": t.score,
            "stars": t.stars,
            "is_entry_point": t.is_entry_point,
            "parent_slug": parent_slug,
            "learning_sequence_score": t.learning_sequence_score,
            "description": t.description,
            "recommendation": t.recommendation,
        }

    # Group tools by level
    levels = {"beginner": [], "intermediate": [], "advanced": []}
    entry_tool = None
    for t in tools:
        lvl = t.level or "intermediate"
        if lvl in levels:
            levels[lvl].append(tool_summary(t))
        if t.is_entry_point and not entry_tool:
            entry_tool = t.slug

    path = []
    if levels["beginner"]:
        path.append({"level": "beginner", "label": "🟢 Start Here", "tools": levels["beginner"]})
    if levels["intermediate"]:
        path.append({"level": "intermediate", "label": "🟡 Build Foundations", "tools": levels["intermediate"]})
    if levels["advanced"]:
        path.append({"level": "advanced", "label": "🔴 Advanced Tools", "tools": levels["advanced"]})

    return {
        "domain": domain.name,
        "domain_slug": domain.slug,
        "domain_icon": domain.icon,
        "entry": entry_tool,
        "path": path,
    }

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATUS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/status")
def get_scraper_status():
    """Get the current scraper pipeline status with real-time progress."""
    return {
        **scrape_status,
        "errors_count": len(scrape_status.get("errors", [])),
        "errors_recent": scrape_status.get("errors", [])[-5:],  # Last 5 errors only
    }


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Production health check — verifies DB connectivity and data freshness."""
    from sqlalchemy import text
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    last_snapshot = db.query(ToolSnapshot)\
        .order_by(ToolSnapshot.recorded_at.desc())\
        .first()

    tool_count = db.query(Tool).count()

    return {
        "status": "ok",
        "db": db_status,
        "tools_tracked": tool_count,
        "last_scrape": last_snapshot.recorded_at.isoformat() if last_snapshot else None,
        "is_scraping": scrape_status.get("is_running", False),
        "version": "1.0.0",
    }


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    """Kubernetes readiness probe — returns 503 until enough tools are seeded."""
    tool_count = db.query(Tool).count()
    if tool_count < 10:
        raise HTTPException(status_code=503, detail=f"Not enough tools seeded yet ({tool_count}/10)")
    return {"ready": True, "tools": tool_count}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ADMIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/admin/scrape")
async def trigger_manual_scrape(
    x_admin_key: str = Header(None, alias="X-Admin-Key"),
):
    """
    Manually trigger a full scrape cycle.
    Requires X-Admin-Key header matching ADMIN_API_KEY env var.
    Returns 202 Accepted — scrape runs in background.
    """
    # Auth check
    expected_key = os.getenv("ADMIN_API_KEY", "")
    if not expected_key:
        raise HTTPException(status_code=503, detail="Admin API key not configured. Set ADMIN_API_KEY env var.")
    if x_admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key.")

    # Check if already running
    if scrape_status.get("is_running"):
        return {"status": "already_running", "current_step": scrape_status.get("current_step")}

    # Trigger in background
    from app.services.scheduler import perform_full_scrape
    asyncio.create_task(perform_full_scrape())

    return {"status": "accepted", "message": "Scrape cycle started in background. Check /api/v1/status for progress."}
