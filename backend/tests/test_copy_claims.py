"""Claims the product must not make, checked against the copy a visitor reads.

Every phrase here was found by hand on the live site, said something the code
does not do, and had to be corrected. Finding them by reading is how the same
mistake got made four times in a week; a test finds it the fifth time.

Only the text a visitor sees is scanned: code comments are stripped, because a
comment explaining why a claim was removed has to be free to quote it.
"""

import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
FRONTEND = REPO / "frontend" / "src"

# (pattern, why it is wrong). Patterns are case-insensitive regexes.
FORBIDDEN = [
    (r"score is a percentile", "scores are absolute; _percentile_rank is unused and test_scoring pins it"),
    (r"against each other", "a tool's score does not depend on other tools"),
    (r"louder than the others", "same: the score is absolute, not relative"),
    # Generalised after five variants of the same claim turned up one at a time
    # (og/route.tsx's default subtitle and two share texts were the last three):
    # "single best", "for every step", "for each step", "per step", "each with
    # the best". Only some roadmap steps have a tracked tool, so not every step
    # has a video - it is "verified free course where one exists".
    (r"(single\s+)?best\s+(free\s+)?(course|video)\s*(for\s+(every|each)|per|each)",
     "only some roadmap steps have a tracked tool, so not every step has a video"),
    (r"each\s+with\s+(the\s+)?(single\s+)?best\s+(free\s+)?(course|video)",
     "the reversed phrasing of the same claim - 'each with the best video'"),
    # Only the keyless FALLBACK list is hand-picked (LearningResources says so
    # truthfully), so this targets the marketing form of the claim.
    (r"hand-picked(,| and) checked", "videos are ranked by the YouTube API, then verified"),
    (r"best free video each", "only steps with a tracked tool have a video"),
    (r"release cadence", "only the latest release tag is fetched; nothing measures cadence"),
    (r"updates itself", "roadmaps are static seed data"),
    (r"real-time", "the pipeline is a 30-minute loop"),
    (r"ai-powered", "scoring is arithmetic; the LLM only classifies sentiment"),
    (r"strong demand", "an employment claim needs a measurement behind it"),
    (r"high demand in the job market", "the momentum score knows nothing about hiring"),
    (r"career investment", "an unmeasured employment claim"),
    # /compare lists what the page SHOWS (it does display sentiment); this
    # targets the claim that sentiment is what the score is built from.
    (r"(based on|built from|scored from|computed from)[^.\"`]{0,90}sentiment", "sentiment is displayed but is not a score input"),
]

_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_LINE_COMMENT = re.compile(r"(?<![:\"'])//[^\n]*")


def visitor_text(path: Path) -> str:
    """Source with comments removed - roughly what a reader could ever see."""
    source = path.read_text(encoding="utf-8", errors="replace")
    return _LINE_COMMENT.sub("", _BLOCK_COMMENT.sub("", source))


def copy_files():
    files = [p for ext in ("*.ts", "*.tsx") for p in FRONTEND.rglob(ext)]
    return sorted(files)


def test_the_scan_actually_finds_files():
    # A guard that scans nothing passes forever.
    assert len(copy_files()) > 50


@pytest.mark.parametrize("pattern, why", FORBIDDEN, ids=[f[0] for f in FORBIDDEN])
def test_no_forbidden_claim_in_frontend_copy(pattern, why):
    hits = []
    for path in copy_files():
        for match in re.finditer(pattern, visitor_text(path), re.IGNORECASE):
            hits.append(f"{path.relative_to(FRONTEND)}: ...{match.group(0)}...")
    assert not hits, f"{why}\n" + "\n".join(hits)


def test_the_stripper_removes_comments_but_not_urls():
    sample = 'const a = "https://x.dev/a"; // real-time in a comment\n/* real-time too */ const b = "ok";'
    stripped = _LINE_COMMENT.sub("", _BLOCK_COMMENT.sub("", sample))
    assert "real-time" not in stripped
    assert "https://x.dev/a" in stripped
