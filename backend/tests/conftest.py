import os
import sys
import tempfile
from pathlib import Path

# Run from anywhere: make `app` importable without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# All of this must happen before anything imports `app`, because the engine and
# settings are built at import time.
#
# A throwaway SQLite file, never backend/test.db: the suite has to give the same
# answer on a CI runner with no database as on a laptop with months of scrapes.
_DB = Path(tempfile.mkdtemp(prefix="stackradar-tests-")) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.as_posix()}"
# Importing or booting the app must never start the scrape loop or reach YouTube.
os.environ["RUN_SCRAPER_INLINE"] = "0"
os.environ["WARM_RESOURCE_CACHE"] = "0"
# Keyless: the app is required to boot degraded without any of these.
for key in (
    "GITHUB_TOKEN",
    "GROQ_API_KEY",
    "YOUTUBE_API_KEY",
    "ADMIN_API_KEY",
    "MOSS_PROJECT_ID",
    "MOSS_PROJECT_KEY",
):
    os.environ[key] = ""
