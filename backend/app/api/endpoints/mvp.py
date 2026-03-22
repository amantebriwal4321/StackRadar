from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import Technology, Repository, Article, RoadmapStep, TechnologyDomain, TechnologyDifficulty, TechnologyPrerequisite, TechnologyRole
from app.services.scheduler import scrape_status

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
            "name": t.name, 
            "score": t.trend_score, 
            "description": t.description,
            "category": t.category,
            "stage": t.stage,
            "github_count": t.github_count,
            "hn_count": t.hn_count,
            "devto_count": t.devto_count
        } for t in techs
    ]

@router.get("/technologies")
def get_technologies(db: Session = Depends(get_db)):
    techs = db.query(Technology).order_by(Technology.trend_score.desc()).limit(20).all()
    return [
        {
            "name": t.name, 
            "score": t.trend_score, 
            "description": t.description,
            "category": t.category,
            "stage": t.stage,
            "github_count": t.github_count,
            "hn_count": t.hn_count,
            "devto_count": t.devto_count
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
    devto_articles = [a for a in articles if a.source == "devto"]
    
    # Generate Why Trending text
    why_trending = [
        f"Rapid GitHub adoption with {tech.github_count} recent trending repositories.",
    ]
    if tech.hn_count > 0:
        why_trending.append(f"High developer interest with {tech.hn_count} front-page HackerNews discussions.")
    if tech.devto_count > 0:
        why_trending.append(f"Growing ecosystem highlighted by {tech.devto_count} new Dev.to tutorials.")
        
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
        "why_trending": why_trending,
        "repositories": [{"name": r.name, "stars": r.stars, "url": r.url} for r in repos],
        "hackernews": [{"title": a.title, "url": a.url} for a in hn_discussions],
        "devto": [{"title": a.title, "url": a.url} for a in devto_articles]
    }

@router.get("/roadmap/{technology}")
def get_roadmap(technology: str, db: Session = Depends(get_db)):
    """Return the database-curated roadmap based on the technology name."""
    tech = db.query(Technology).filter(Technology.name.ilike(technology)).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technology roadmap not found")
        
    steps = db.query(RoadmapStep).filter(RoadmapStep.technology_id == tech.id).order_by(RoadmapStep.step_number).all()
    
    return {
        "technology": tech.name, 
        "roadmap": [
            {
                "step": s.step_number,
                "title": s.title,
                "resource": s.resource_url
            } for s in steps
        ]
    }
