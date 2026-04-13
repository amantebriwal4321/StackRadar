"""
Standalone scraper process — runs independently of the API server.

Usage:
  python run_scraper.py

In Docker, this runs as a separate service with restart: always.
For local dev, the scraper runs inline inside FastAPI (see main.py).
"""

import asyncio
import logging
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.services.seed import run_seed
from app.services.scheduler import perform_full_scrape

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("run_scraper")


async def main():
    """Run the scraper in a loop. Auto-restarts via Docker restart policy on crash."""

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Seed if empty
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()

    logger.info("=" * 60)
    logger.info("STANDALONE SCRAPER WORKER STARTED")
    logger.info("=" * 60)

    while True:
        try:
            await perform_full_scrape()
            logger.info("Scrape cycle complete. Sleeping 30 minutes...")
        except Exception as e:
            logger.error(f"Scrape cycle failed: {e}", exc_info=True)

        await asyncio.sleep(1800)  # 30 minutes


if __name__ == "__main__":
    asyncio.run(main())
