from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import (
    Technology, Repository, Article, RoadmapStep,
    TechnologyDomain, TechnologyDifficulty, TechnologyPrerequisite,
    TechnologyRole, Domain,
)
from app.services.scheduler import scrape_status
from app.core.cache import cache_response

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOMAIN-LEVEL ENDPOINTS (new)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/trends")
def get_trends(db: Session = Depends(get_db)):
    """Get all technology domains sorted by trend score."""
    domains = db.query(Domain).order_by(Domain.score.desc()).all()
    
    if not domains:
        # Return seed data if scraper hasn't run yet
        return []
    
    return [
        {
            "name": d.name,
            "slug": d.slug,
            "score": d.score,
            "stage": d.stage,
            "summary": d.summary,
            "icon": d.icon,
            "metrics": {
                "github": d.github_count,
                "hackernews": d.hn_count,
                "devto": d.devto_count,
                "reddit": d.reddit_count,
                "news": d.news_count,
            },
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d in domains
    ]


@router.get("/trends/{slug}")
def get_trend_detail(slug: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific technology domain."""
    domain = db.query(Domain).filter(Domain.slug == slug).first()
    if not domain:
        raise HTTPException(status_code=404, detail=f"Domain '{slug}' not found")
    
    # Get the top repositories and articles that match this domain's category
    # Use the domain name to find matching technologies
    matching_techs = db.query(Technology).filter(
        Technology.category == domain.name
    ).order_by(Technology.trend_score.desc()).limit(10).all()
    
    tech_ids = [t.id for t in matching_techs]
    
    # Get top repositories
    repos = []
    if tech_ids:
        repos = db.query(Repository).filter(
            Repository.technology_id.in_(tech_ids)
        ).order_by(Repository.stars.desc()).limit(10).all()
    
    # Get articles
    articles = []
    if tech_ids:
        articles = db.query(Article).filter(
            Article.technology_id.in_(tech_ids)
        ).limit(15).all()
    
    hn_discussions = [a for a in articles if a.source == "hackernews"]
    devto_articles = [a for a in articles if a.source == "devto"]
    
    return {
        "name": domain.name,
        "slug": domain.slug,
        "score": domain.score,
        "stage": domain.stage,
        "summary": domain.summary,
        "icon": domain.icon,
        "metrics": {
            "github": domain.github_count,
            "hackernews": domain.hn_count,
            "devto": domain.devto_count,
            "reddit": domain.reddit_count,
            "news": domain.news_count,
        },
        "top_technologies": [
            {
                "name": t.name,
                "score": t.trend_score,
                "description": t.description,
                "category": t.category,
            }
            for t in matching_techs
        ],
        "repositories": [
            {"name": r.name, "stars": r.stars, "forks": r.forks, "url": r.url}
            for r in repos
        ],
        "hackernews": [
            {"title": a.title, "url": a.url}
            for a in hn_discussions
        ],
        "devto": [
            {"title": a.title, "url": a.url}
            for a in devto_articles
        ],
        "updated_at": domain.updated_at.isoformat() if domain.updated_at else None,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEGACY ENDPOINTS (kept for backward compatibility)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/status")
def get_scraper_status():
    return scrape_status

@router.get("/domains")
def get_domains(db: Session = Depends(get_db)):
    domains = db.query(TechnologyDomain.domain).distinct().all()
    return [d[0] for d in domains if d[0]]

@router.get("/domains/{name:path}")
def get_technologies_by_domain(name: str, db: Session = Depends(get_db)):
    techs = db.query(Technology).join(TechnologyDomain).filter(TechnologyDomain.domain.ilike(name)).order_by(Technology.trend_score.desc()).limit(20).all()
    return [
        {
            "name": t.name, "score": t.trend_score, "description": t.description,
            "category": t.category, "stage": t.stage,
            "github_count": t.github_count, "hn_count": t.hn_count, "devto_count": t.devto_count,
        } for t in techs
    ]

@router.get("/technologies")
def get_technologies(db: Session = Depends(get_db)):
    techs = db.query(Technology).order_by(Technology.trend_score.desc()).limit(20).all()
    return [
        {
            "name": t.name, "score": t.trend_score, "description": t.description,
            "category": t.category, "stage": t.stage,
            "github_count": t.github_count, "hn_count": t.hn_count, "devto_count": t.devto_count,
        } for t in techs
    ]

@router.get("/technologies/{name}")
def get_technology_details(name: str, db: Session = Depends(get_db)):
    tech = db.query(Technology).filter(Technology.name.ilike(name)).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technology not found")
        
    repos = db.query(Repository).filter(Repository.technology_id == tech.id).order_by(Repository.stars.desc()).limit(10).all()
    articles = db.query(Article).filter(Article.technology_id == tech.id).limit(10).all()
    
    hn_discussions = [a for a in articles if a.source == "hackernews"]
    devto_items = [a for a in articles if a.source == "devto"]
    
    difficulty = db.query(TechnologyDifficulty).filter(TechnologyDifficulty.technology_id == tech.id).first()
    prereqs = db.query(TechnologyPrerequisite).filter(TechnologyPrerequisite.technology_id == tech.id).all()
    roles = db.query(TechnologyRole).filter(TechnologyRole.technology_id == tech.id).all()
    
    return {
        "technology": tech.name,
        "score": tech.trend_score,
        "description": tech.description,
        "category": tech.category,
        "stage": tech.stage,
        "difficulty": difficulty.difficulty if difficulty else "intermediate",
        "prerequisites": [p.prerequisite for p in prereqs],
        "roles": [r.role for r in roles],
        "why_trending": [
            f"Rapid GitHub adoption with {tech.github_count} recent trending repositories.",
        ] + ([f"High developer interest with {tech.hn_count} front-page HackerNews discussions."] if tech.hn_count > 0 else [])
          + ([f"Growing ecosystem highlighted by {tech.devto_count} new Dev.to tutorials."] if tech.devto_count > 0 else []),
        "repositories": [{"name": r.name, "stars": r.stars, "url": r.url} for r in repos],
        "hackernews": [{"title": a.title, "url": a.url} for a in hn_discussions],
        "devto": [{"title": a.title, "url": a.url} for a in devto_items],
    }

@router.get("/roadmap/{technology}")
def get_roadmap(technology: str, db: Session = Depends(get_db)):
    tech = db.query(Technology).filter(Technology.name.ilike(technology)).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technology roadmap not found")
    steps = db.query(RoadmapStep).filter(RoadmapStep.technology_id == tech.id).order_by(RoadmapStep.step_number).all()
    return {
        "technology": tech.name,
        "roadmap": [{"step": s.step_number, "title": s.title, "resource": s.resource_url} for s in steps],
    }
