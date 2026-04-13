from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import asyncio
import logging
import os

# Configure root logger so ALL app loggers (scheduler, scraper, scoring) are visible
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)

from app.services.scheduler import run_scraper_loop

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    # Auto-create all tables (safe to call even if tables exist)
    from app.db.base import Base
    from app.db.session import engine
    Base.metadata.create_all(bind=engine)

    # Seed database with tools, domains, and roadmaps if empty
    from app.db.session import SessionLocal
    from app.services.seed import run_seed
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()

    # Run scraper inline only if not using a separate worker container
    if os.getenv("RUN_SCRAPER_INLINE", "1") == "1":
        asyncio.create_task(run_scraper_loop())

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def root():
    return {"message": "Welcome to StackRadar MVP API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

from app.api.endpoints import mvp

app.include_router(mvp.router, prefix=settings.API_V1_STR, tags=["mvp"])
