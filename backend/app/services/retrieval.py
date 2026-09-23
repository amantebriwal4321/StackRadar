"""
Fast Retrieval — the Trust Loop's Moss-backed semantic grounding layer.

Track: Agent Reliability, Security and Evaluation (MOSS Zero-Latency Builder
Sprint, https://www.moss.dev). The PRD drafted for this repo treated "Moss" as
the sprint arena's codename for a Qdrant placeholder — it is not. Moss is the
sprint's actual sponsor product: a sub-10ms semantic search runtime with no
vector database to run or tune (``pip install moss``; SDK confirmed against
moss==1.13.0). This module wires the real SDK into the seam the PRD called
"Fast Retrieval — proposed".

Every scraped headline is checked, before the Groq sentiment call, against a
semantic index built from the tool catalog (``app/services/catalog.py`` — 31
tools, one document each). The best match does two things:

1. **Grounds the eventual sentiment verdict** (see ``guardrails._is_grounded``)
   more robustly than the substring regex it complements — "k8s", "the Rust
   compiler", "Next" all resolve to their tool semantically even though none
   of them is a literal tracked keyword.
2. **Feeds the classification prompt real context** instead of the model
   seeing a bare headline (``scraper.batch_sentiment_analysis``).

Optional like every other integration in this codebase (GROQ_API_KEY,
YOUTUBE_API_KEY, ...): with ``MOSS_PROJECT_ID`` / ``MOSS_PROJECT_KEY`` unset,
or on any runtime failure, ``retrieve()`` returns no matches and the pipeline
falls back to the regex-only grounding it already had — never an exception,
never a skewed score. Sign up for a free project at https://moss.dev.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from loguru import logger

from app.core.config import settings
from app.services.catalog import TOOLS

INDEX_NAME = "stackradar-tools"

# Empirical starting point, not a tuned threshold — real cosine-similarity
# scores for catalog text vs. real scrape headlines haven't been measured yet
# (no project key in the environment this was built in). Revisit once live
# queries run; log lines in `retrieve()` carry the raw score for that tuning.
GROUND_SCORE_THRESHOLD = 0.5

_client: Any = None
_index_loaded = False

_stats = {"queried": 0, "grounded": 0, "total_latency_ms": 0.0}


@dataclass(frozen=True)
class RetrievedMatch:
    tool_slug: str
    tool_text: str
    score: float


def is_configured() -> bool:
    return bool(settings.MOSS_PROJECT_ID and settings.MOSS_PROJECT_KEY)


def _catalog_documents() -> list:
    from moss import DocumentInfo

    return [
        DocumentInfo(
            id=t["slug"],
            text=f"{t['name']}: {t['description']}",
            metadata={"category": t["category"]},
        )
        for t in TOOLS
    ]


async def _client_or_none():
    global _client
    if _client is not None:
        return _client
    if not is_configured():
        return None
    from moss import MossClient

    _client = MossClient(settings.MOSS_PROJECT_ID, settings.MOSS_PROJECT_KEY)
    return _client


async def ensure_index() -> bool:
    """Build the catalog index once per process. Returns whether retrieval is usable."""
    global _index_loaded
    if _index_loaded:
        return True
    client = await _client_or_none()
    if client is None:
        return False
    try:
        try:
            await client.get_index(INDEX_NAME)
        except Exception:  # noqa: BLE001 -- "doesn't exist yet" isn't a typed exception here
            await client.create_index(INDEX_NAME, _catalog_documents())
        await client.load_index(INDEX_NAME)
        _index_loaded = True
        logger.info(f"Moss index '{INDEX_NAME}' loaded ({len(TOOLS)} tools)")
        return True
    except Exception as e:  # noqa: BLE001 -- optional integration, never blocks the scrape
        logger.warning(
            f"Moss index unavailable this run, falling back to regex grounding: {e}"
        )
        return False


async def retrieve(
    query_text: str, top_k: int = 1
) -> tuple[list[RetrievedMatch], float]:
    """Semantic-search the tool catalog for ``query_text``.

    Returns ``(matches, latency_ms)``. ``([], 0.0)`` when Moss is unconfigured,
    the index can't be built, or the query fails — callers must treat that
    exactly like "no match", never like an error.
    """
    if not query_text or not query_text.strip():
        return [], 0.0
    if not await ensure_index():
        return [], 0.0

    client = await _client_or_none()
    from moss import QueryOptions

    start = time.perf_counter()
    try:
        result = await client.query(INDEX_NAME, query_text, QueryOptions(top_k=top_k))
    except Exception as e:  # noqa: BLE001 -- optional integration, never raises to the caller
        wall_ms = (time.perf_counter() - start) * 1000
        logger.warning(f"Moss query failed, falling back to regex grounding: {e}")
        _stats["queried"] += 1
        _stats["total_latency_ms"] += wall_ms
        return [], wall_ms

    wall_ms = (time.perf_counter() - start) * 1000
    latency_ms = result.time_taken_ms if result.time_taken_ms is not None else wall_ms
    _stats["queried"] += 1
    _stats["total_latency_ms"] += latency_ms

    matches = [
        RetrievedMatch(tool_slug=doc.id, tool_text=doc.text, score=doc.score)
        for doc in result.docs
    ]
    logger.debug(
        f"Moss query {latency_ms:.2f}ms — top match "
        f"{matches[0].tool_slug if matches else 'none'} "
        f"(score={matches[0].score:.3f})"
        if matches
        else f"Moss query {latency_ms:.2f}ms — no matches"
    )
    return matches, latency_ms


def mark_grounded() -> None:
    """Caller reports a match cleared its own grounding threshold."""
    _stats["grounded"] += 1


def reset_stats() -> None:
    """Called once per scrape cycle, before sentiment analysis, so
    ``last_run_stats`` reports only this cycle's queries."""
    global _stats
    _stats = {"queried": 0, "grounded": 0, "total_latency_ms": 0.0}


def last_run_stats() -> dict[str, Any]:
    queried = _stats["queried"]
    return {
        "configured": is_configured(),
        "queried": queried,
        "grounded": _stats["grounded"],
        "avg_latency_ms": round(_stats["total_latency_ms"] / queried, 2)
        if queried
        else None,
    }
