"""
Runtime guardrails for LLM output — the shipped prototype of the "Trust Loop"
reliability layer (see the "Hackathon Architecture" section of the README).

Scope today: the single Groq sentiment call in
``scraper.batch_sentiment_analysis``. Every model response passes through
``validate_sentiment_batch`` before any sentiment reaches ``scoring``:

1. **Schema check** — the response must be a JSON array of ``{"i": int, "s": label}``
   objects; ``s`` must be one of positive / negative / neutral. Malformed rows are
   dropped (the item keeps its safe ``neutral`` default), a fully unparseable
   response rejects the whole batch.
2. **Index check** — a verdict whose ``i`` is outside the batch range is a
   hallucinated index and is discarded.
3. **Grounding check** — a non-neutral verdict is only kept if the source text
   actually mentions a tracked tool (``scoring.classify_text_to_tools``). A strong
   sentiment about a headline that names none of our tools cannot be grounded in
   this domain, so it is quarantined to ``neutral`` rather than persisted.

Production targets for this layer (designed, not yet wired — see README):
**Enkrypt AI** for the runtime guardrail / hallucination checks, **Qdrant** for
low-latency gRPC context retrieval to ground the model, and **Mastra** for
agent-level evals + tracing. ``traced`` here is a dependency-free stand-in that
logs span durations until a real OpenTelemetry exporter replaces it.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from loguru import logger
from pydantic import BaseModel, Field, ValidationError, field_validator

VALID_LABELS = {"positive", "negative", "neutral"}


class SentimentVerdict(BaseModel):
    """One row of the model's expected JSON output."""

    i: int = Field(ge=0)
    s: str

    @field_validator("s")
    @classmethod
    def _known_label(cls, v: str) -> str:
        norm = (v or "").strip().lower()
        if norm not in VALID_LABELS:
            raise ValueError(f"unknown sentiment label {v!r}")
        return norm


class GuardrailReport:
    """Tally of what the guardrail did to one batch, for logging + tests."""

    __slots__ = ("accepted", "dropped", "hallucinated_index", "quarantined", "batch_rejected")

    def __init__(self) -> None:
        self.accepted = 0            # passed every check
        self.dropped = 0            # failed the schema check
        self.hallucinated_index = 0  # i outside the batch
        self.quarantined = 0        # non-neutral but not grounded -> forced neutral
        self.batch_rejected = False  # response was not parseable JSON at all

    def as_dict(self) -> dict[str, Any]:
        return {
            "accepted": self.accepted,
            "dropped": self.dropped,
            "hallucinated_index": self.hallucinated_index,
            "quarantined": self.quarantined,
            "batch_rejected": self.batch_rejected,
        }

    def summary(self) -> str:
        if self.batch_rejected:
            return "batch rejected (unparseable response)"
        return (
            f"{self.accepted} accepted, {self.dropped} dropped, "
            f"{self.hallucinated_index} bad-index, {self.quarantined} quarantined"
        )


def _strip_code_fence(raw: str) -> str:
    """Pull the JSON body out of a ```json ... ``` block if the model wrapped it."""
    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _is_grounded(item: dict[str, Any]) -> bool:
    """A non-neutral verdict is only trustworthy if the text names a tracked tool.

    Imported lazily so this module has no import-time dependency on scoring
    (and vice versa).
    """
    from app.services.scoring import _item_text, classify_text_to_tools

    text = _item_text(item)
    if not text or text == "(no title)":
        return False
    return bool(classify_text_to_tools(text))


@contextmanager
def traced(span: str) -> Iterator[None]:
    """Dependency-free stand-in for an OpenTelemetry span — logs the duration.

    Production target is a real OTel exporter (see README); the call sites stay
    the same when that lands.
    """
    start = time.perf_counter()
    try:
        yield
    finally:
        dur_ms = (time.perf_counter() - start) * 1000
        logger.debug(f"[trace] {span} took {dur_ms:.0f}ms")


def validate_sentiment_batch(
    raw: str,
    batch: list[dict[str, Any]],
) -> tuple[dict[int, str], GuardrailReport]:
    """Validate one model response against ``batch``.

    Returns ``(sentiment_map, report)`` where ``sentiment_map`` holds only the
    indices that cleared every check. Callers apply ``neutral`` to everything
    absent from the map, so a partial or empty result is always safe.
    """
    report = GuardrailReport()
    sentiment_map: dict[int, str] = {}

    try:
        parsed = json.loads(_strip_code_fence(raw))
    except (json.JSONDecodeError, ValueError):
        report.batch_rejected = True
        report.dropped = len(batch)
        return {}, report

    if not isinstance(parsed, list):
        report.batch_rejected = True
        report.dropped = len(batch)
        return {}, report

    for row in parsed:
        if not isinstance(row, dict):
            report.dropped += 1
            continue

        # tolerate the alternate key names the old parser accepted
        candidate = {
            "i": row.get("i", row.get("index")),
            "s": row.get("s", row.get("sentiment")),
        }
        try:
            verdict = SentimentVerdict(**candidate)
        except ValidationError:
            report.dropped += 1
            continue

        if verdict.i >= len(batch):
            report.hallucinated_index += 1
            continue

        label = verdict.s
        if label != "neutral" and not _is_grounded(batch[verdict.i]):
            label = "neutral"
            report.quarantined += 1

        sentiment_map[verdict.i] = label
        report.accepted += 1

    return sentiment_map, report
