"""
Offline tests for the Moss retrieval fallback contract — no network, no
project key. `conftest.py` blanks MOSS_PROJECT_ID / MOSS_PROJECT_KEY before
`app` (and therefore `retrieval`) is ever imported, so every path here runs
exactly as it would with the integration simply not configured.
"""

import asyncio

from app.services import retrieval


def test_not_configured_without_credentials():
    assert retrieval.is_configured() is False


def test_retrieve_without_credentials_returns_empty():
    matches, latency_ms = asyncio.run(retrieval.retrieve("does react have hooks"))
    assert matches == []
    assert latency_ms == 0.0


def test_retrieve_empty_query_short_circuits():
    matches, latency_ms = asyncio.run(retrieval.retrieve(""))
    assert matches == []
    assert latency_ms == 0.0

    matches, latency_ms = asyncio.run(retrieval.retrieve("   "))
    assert matches == []
    assert latency_ms == 0.0


def test_ensure_index_false_without_credentials():
    assert asyncio.run(retrieval.ensure_index()) is False


def test_last_run_stats_shape_when_never_queried():
    retrieval.reset_stats()
    stats = retrieval.last_run_stats()
    assert stats == {
        "configured": False,
        "queried": 0,
        "grounded": 0,
        "avg_latency_ms": None,
    }


def test_reset_stats_clears_a_prior_run():
    retrieval.reset_stats()
    retrieval._stats["queried"] = 3
    retrieval._stats["grounded"] = 1
    retrieval._stats["total_latency_ms"] = 15.0

    stats_before_reset = retrieval.last_run_stats()
    assert stats_before_reset["queried"] == 3
    assert stats_before_reset["avg_latency_ms"] == 5.0

    retrieval.reset_stats()
    assert retrieval.last_run_stats()["queried"] == 0
