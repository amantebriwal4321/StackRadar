"""
API Endpoints — Tool-based tech intelligence platform.

Endpoints:
  GET /tools                — All tools sorted by score (optional ?category= filter)
  GET /tools/{slug}         — Single tool detail with decision intelligence
  GET /tools/{slug}/history — Last 30 days of time-series data
  GET /roadmaps             — All available roadmaps
  GET /roadmaps/{slug}      — Single roadmap with full steps
  GET /domains              — Domain-level summaries
  GET /status               — Scraper status
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.db.session import SessionLocal
from app.models.all_models import Tool, ToolSnapshot, ToolRoadmap, Domain
from app.services.scheduler import scrape_status

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/tools")
def get_tools(
    category: str = Query(None, description="Filter by category (e.g. 'AI / ML')"),
    db: Session = Depends(get_db),
):
    """Get all tools sorted by score, optionally filtered by category."""
    query = db.query(Tool).order_by(Tool.score.desc())

    if category:
        query = query.filter(Tool.category.ilike(f"%{category}%"))

    tools = query.all()

    return [
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
            "parent_slug": db.query(Tool).filter(Tool.id == t.parent_tool_id).first().slug if t.parent_tool_id else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in tools
    ]


@router.get("/tools/{slug}")
def get_tool_detail(slug: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific tool."""
    tool = db.query(Tool).filter(Tool.slug == slug).first()
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{slug}' not found")

    # Check if a roadmap exists for this tool
    roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.tool_id == tool.id).first()
    # Also check for domain-level roadmap
    if not roadmap and tool.domain_rel:
        roadmap = db.query(ToolRoadmap).filter(ToolRoadmap.slug == tool.domain_rel.slug).first()

    total_mentions = tool.hn_count + tool.devto_count + tool.reddit_count + tool.news_count

    # Look up parent tool slug
    parent_tool_slug = None
    if tool.parent_tool_id:
        parent = db.query(Tool).filter(Tool.id == tool.parent_tool_id).first()
        if parent:
            parent_tool_slug = parent.slug

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
        "updated_at": tool.updated_at.isoformat() if tool.updated_at else None,
    }


@router.get("/tools/{slug}/history")
def get_tool_history(slug: str, days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db)):
    """Get time-series data for a tool (last N days)."""
    tool = db.query(Tool).filter(Tool.slug == slug).first()
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{slug}' not found")

    cutoff = date.today() - timedelta(days=days)
    snapshots = (
        db.query(ToolSnapshot)
        .filter(ToolSnapshot.tool_id == tool.id, ToolSnapshot.date >= cutoff)
        .order_by(ToolSnapshot.date.asc())
        .all()
    )

    return {
        "slug": tool.slug,
        "name": tool.name,
        "days": days,
        "data": [
            {
                "date": s.date.isoformat(),
                "score": s.score,
                "stars": s.stars,
                "forks": s.forks,
                "mentions": s.mentions,
                "hn_count": s.hn_count,
                "devto_count": s.devto_count,
                "reddit_count": s.reddit_count,
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATUS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/status")
def get_scraper_status():
    """Get the current scraper pipeline status."""
    return scrape_status
