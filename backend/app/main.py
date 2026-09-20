import asyncio
import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ━━━ Loguru Setup (TASK-011) ━━━
from loguru import logger

from app.core.config import settings

# Remove default loguru handler and re-add with our format
logger.remove()

# Console output — colorful, human-readable
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> | <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# File output — rotating log (5MB, 3 backups)
os.makedirs("logs", exist_ok=True)
logger.add(
    "logs/stackradar.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name} | {message}",
    level="INFO",
    rotation="5 MB",
    retention=3,
    encoding="utf-8",
)

# Production mode: add JSON-serialized logs for log aggregation tools
if os.getenv("ENV", "development") == "production":
    logger.add(sys.stdout, serialize=True, level="INFO")


# Intercept stdlib logging → redirect to loguru
class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


logging.basicConfig(handlers=[InterceptHandler()], level=logging.INFO, force=True)
# Silence noisy third-party loggers
for noisy in ("httpx", "httpcore", "uvicorn.access"):
    logging.getLogger(noisy).setLevel(logging.WARNING)


# ━━━ Rate Limiting (TASK-009) ━━━
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


# ━━━ App Initialization ━━━
from app.services.scheduler import run_scraper_loop

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
async def startup_event():
    # Log loaded env vars (names only, never values)
    logger.info("=" * 50)
    logger.info("StackRadar API starting up...")
    logger.info(f"  PROJECT_NAME: {settings.PROJECT_NAME}")
    logger.info(
        f"  GITHUB_TOKEN: {'✅ set' if os.getenv('GITHUB_TOKEN') else '❌ missing'}"
    )
    logger.info(
        f"  GROQ_API_KEY: {'✅ set' if os.getenv('GROQ_API_KEY') else '❌ missing'}"
    )
    logger.info(
        f"  DATABASE_URL: {'✅ set' if os.getenv('DATABASE_URL') else '⚡ using SQLite'}"
    )
    logger.info("=" * 50)

    # Auto-create all tables (safe to call even if tables exist)
    from app.db.base import Base
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)

    # create_all() creates missing TABLES but never adds columns to a table that
    # already exists, so a model gaining a field breaks every existing local DB
    # with "no such column". Alembic is configured for real migrations; this is
    # the safety net for the auto-create path the app actually boots on.
    from app.db.migrate import ensure_columns

    ensure_columns(engine)

    # Seed database with tools, domains, and roadmaps if empty
    from app.db.session import SessionLocal
    from app.services.seed import reconcile_catalog, reconcile_roadmaps, run_seed

    db = SessionLocal()
    try:
        run_seed(db)
        # Purge any non-catalog placeholder/duplicate tool rows left by older
        # scrape cycles so the rankings only ever reflect the curated catalog.
        reconcile_catalog(db)
        # Roadmap edits never reached an existing database before this: run_seed
        # returns early once any tool exists. Append-only, enforced inside.
        reconcile_roadmaps(db)
    finally:
        db.close()

    # Run scraper inline only if not using a separate worker container
    if os.getenv("RUN_SCRAPER_INLINE", "1") == "1":
        asyncio.create_task(run_scraper_loop())

    # Warm the learning-resource cache in the background so roadmap steps and
    # tool pages show real video titles/thumbnails on first visit, not just a
    # URL. Non-blocking — startup returns immediately.
    # WARM_RESOURCE_CACHE=0 skips it, for the test suite, which must not reach
    # YouTube from a CI runner.
    if os.getenv("WARM_RESOURCE_CACHE", "1") == "1":
        from app.services.resources import CURATED_VIDEOS, warm_resource_cache

        asyncio.create_task(
            warm_resource_cache(SessionLocal, list(CURATED_VIDEOS.keys()))
        )


# ━━━ CORS ━━━
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
    return {"message": "Welcome to StackRadar API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


from app.api.endpoints import mvp

app.include_router(mvp.router, prefix=settings.API_V1_STR, tags=["mvp"])
