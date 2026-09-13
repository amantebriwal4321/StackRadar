import os
import sys
from pathlib import Path

# Run from anywhere: make `app` importable without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Importing the app must never start the 30-minute scrape loop under test.
os.environ.setdefault("RUN_SCRAPER_INLINE", "0")
