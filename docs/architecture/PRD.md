# PRD: StackRadar Trust Loop

> **Track:** Agent Reliability, Security and Evaluation — MOSS Zero-Latency Builder Sprint.
> **Status legend:** ✅ shipped in this repo · ◑ stub in this repo · ○ designed, not wired.
> This document was drafted by the sprint's Architecture Copilot and then corrected
> against the actual codebase (the auto-generated draft assumed a Vite/Node/AWS stack
> that StackRadar does not use). The companion diagram is
> [`proposed-reliability-layer.pdf`](./proposed-reliability-layer.pdf); the accurate
> current-state diagram is in the repo README under "Hackathon Architecture".

## 1. Executive Summary

StackRadar is a real-time developer tech-intelligence engine that scores 30+ developer
tools by momentum, mined from GitHub, Hacker News, Reddit and Dev.to. The pipeline is
deterministic except for one Groq-hosted LLM call per scrape cycle that classifies
community sentiment. This PRD specifies the **Trust Loop** — a reliability and security
layer around that call so a malformed or hallucinated LLM response cannot corrupt tool
momentum scores.

## 2. Problem Statement

`scoring.py` is pure percentile math — no model involved. The single exception is
`batch_sentiment_analysis` in `app/services/scraper.py`, which asks a Groq model to
label each scraped headline `positive` / `negative` / `neutral`. Before this work the
response was parsed with a bare `json.loads` plus a loose dict walk: a malformed row, a
hallucinated array index, or a strong opinion about a headline that names no tracked
tool would flow straight into `ToolSnapshot.mention_count` weighting and skew a tool's
score, with no runtime check and no visible error.

## 3. Goals & Objectives

1. **Data integrity** — no unvalidated LLM output is persisted. ✅
2. **Runtime guardrails** — validate every response against a strict schema; reject
   hallucinated indices. ✅
3. **Grounding** — keep a non-neutral verdict only if the source text mentions a
   tracked tool; quarantine the rest. ✅ (regex today ○ retrieval-backed later)
4. **Graceful degradation** — any failure, rejection or low-confidence result falls
   back to `neutral`, never a skewed score. ✅
5. **Observability** — trace retrieval / inference / validation latency. ◑

## 4. Target Users / Stakeholders

- **StackRadar users** — developers and tech leads who rely on the momentum scores
  being accurate.
- **Maintainer** — needs the scrape loop to survive a bad model response without
  manual intervention.
- **Sprint judges** — evaluating the Agent Reliability, Security and Evaluation track.

## 5. Functional Requirements

### 5.1 Runtime Guardrails — ✅ `app/services/guardrails.py`

- **Schema validation.** Every row of the model's JSON is parsed into
  `SentimentVerdict` (Pydantic v2): `i: int >= 0`, `s` in
  `{positive, negative, neutral}`. Malformed rows are dropped; a fully unparseable
  response rejects the whole batch.
- **Hallucinated-index rejection.** A verdict whose `i` is outside the current batch
  range is discarded.
- **Safe default.** Any batch item not explicitly accepted keeps `neutral`.
- **Reporting.** Each batch logs a `GuardrailReport`
  (`accepted / dropped / hallucinated_index / quarantined / batch_rejected`).
- **Security filtering — ○ proposed.** Enkrypt AI detectors (prompt-injection, PII,
  toxicity) on the same seam in production.

### 5.2 Context Evaluation — ✅ grounding · ○ faithfulness

- **Grounding check (shipped).** A non-neutral verdict is kept only if
  `scoring.classify_text_to_tools` finds a tracked tool in the item text; otherwise it
  is quarantined to `neutral`.
- **Faithfulness scoring (proposed).** Mastra evals score whether the label is
  supported by retrieved context; sub-threshold results are quarantined.

### 5.3 Fast Retrieval — ○ proposed (Qdrant, gRPC)

- Query a Qdrant collection over gRPC for the discussions most relevant to each
  headline, and pass those snippets to the model instead of raw scrape text.
- Must fit comfortably inside the 30-minute scrape window for 30+ tools.
- ("Moss" is the sprint arena's codename for this retrieval component; Qdrant is the
  concrete engine.)

### 5.4 Observability — ◑ stub

- `guardrails.traced()` wraps the inference and validation hops and logs span
  durations today.
- ○ Swap in an OpenTelemetry exporter (call sites unchanged); export to Prometheus.

## 6. Non-Functional Requirements

- **Performance.** The Trust Loop should add ≤ 500 ms per tool to the scrape cycle.
- **Reliability.** LLM timeouts / rate limits must never break the scrape loop — the
  existing `try/except` falls back to `neutral` and the cycle continues.
- **Scalability.** Handles the current catalog (31 tools) every 30 minutes; headroom
  for the catalog to grow.
- **No new hard dependency.** The guardrail uses Pydantic (already a dependency);
  `traced()` adds nothing. The app still boots with `GROQ_API_KEY` empty.

## 7. System Architecture Overview

Primary flow (deterministic) with a Trust Layer wrapping the one LLM hop:

```
scheduler loop (30 min)
  -> scraper.py        fetch GitHub / HN / Reddit / Dev.to / RSS
  -> [Qdrant retrieval]           ○ proposed: grounding snippets over gRPC
  -> Groq LLM                     sentiment classification
  -> guardrails.validate_sentiment_batch   ✅ schema + index checks
  -> grounding check              ✅ quarantine ungrounded -> neutral
       ( -> Mastra faithfulness eval  ○ proposed )
  -> scoring.py        deterministic percentile ranking
  -> ToolSnapshot / Tool          persist
traced() spans around each hop   ◑ (OpenTelemetry ○ proposed)
```

## 8. Tech Stack

| Area | Shipped | Proposed |
|------|---------|----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts, Clerk | — |
| Backend | FastAPI, Python 3, SQLAlchemy 2, Pydantic v2, slowapi, loguru | — |
| Data collection | `httpx` (async), `feedparser` — GitHub API, HN Firebase API, Dev.to API, Reddit RSS, news RSS | — |
| LLM | Groq (sentiment classification only) | — |
| Guardrails | Pydantic v2 (`guardrails.py`) | Enkrypt AI |
| Evaluation | `scoring.classify_text_to_tools` grounding | Mastra evals (faithfulness) |
| Retrieval | — | Qdrant (gRPC) |
| Database | PostgreSQL (prod, Neon) / SQLite (dev) | Qdrant vector store |
| Observability | `guardrails.traced()` duration logs | OpenTelemetry, Prometheus |
| Infra | Docker, docker-compose, Vercel (frontend), Render (backend), GitHub Actions CI | — |

## 9. Data Requirements

- **Input.** Title + tags + subreddit + description per scraped item
  (`scoring._item_text`).
- **Context (proposed).** Vector embeddings of prior community discussions and tool
  docs, stored in Qdrant.
- **Guardrail output schema.** The model must return a JSON array of
  `{"i": <batch index>, "s": "positive" | "negative" | "neutral"}`. Anything else is
  dropped or rejected; the accepted subset becomes `{batch_index: label}` and every
  other item defaults to `neutral`.

## 10. API / Interface Specifications

- **`validate_sentiment_batch(raw: str, batch: list[dict]) -> (dict[int, str], GuardrailReport)`**
  — the guardrail entry point, called from `batch_sentiment_analysis`. Pure function,
  no I/O, unit-testable offline.
- **`traced(span: str)`** — context manager; span timing today, OpenTelemetry span
  later.
- **gRPC to Qdrant — ○ proposed.** `SearchPoints` on a `discussions` collection,
  called from the scraper before the Groq request.

## 11. Security Requirements

- **Output validation (shipped).** No LLM output reaches the DB until it passes schema
  + grounding checks.
- **Input sanitisation — ○ proposed.** Strip prompt-injection patterns from scraped
  community text before it enters the prompt (Enkrypt AI).
- **PII — ○ proposed.** Enkrypt AI PII detector on model input and output.
- **Secrets.** No keys in git; `GROQ_API_KEY` (and any future Qdrant / Enkrypt keys)
  live only in `backend/.env`. The pipeline degrades gracefully when they are absent.

## 12. Deployment & Infrastructure

- **Frontend:** Vercel (root `frontend`).
- **Backend + Postgres:** Render (Docker) + Neon.
- **Local:** `docker-compose up --build` (Postgres + FastAPI + Next.js).
- **CI:** `.github/workflows/backend.yml` runs an import check on every push.
  ○ Add `backend/scripts/check_guardrails.py` to that workflow so the guardrail is
  gated in CI.

## 13. Success Metrics

| Metric | Target | Now |
|--------|--------|-----|
| Unvalidated LLM output persisted | 0% | 0% ✅ |
| Malformed / hallucinated responses degraded to `neutral` | 100% | 100% ✅ (per test) |
| `check_guardrails.py` pass rate | 7/7 | 7/7 ✅ |
| AI hops covered by a span | 100% | 100% ◑ (`traced()` stub) |
| Trust Loop latency overhead per tool | ≤ 500 ms | n/a — retrieval not wired |

## 14. Timeline & Milestones

- **Phase 1 — done.** `guardrails.py` (schema + index + grounding) + offline test
  `check_guardrails.py`; wired into `batch_sentiment_analysis`; `traced()` stub.
- **Phase 2 — sprint target.** Qdrant collection + gRPC retrieval feeding the prompt;
  Mastra faithfulness eval behind the grounding check; `check_guardrails.py` in CI.
- **Phase 3 — production.** Enkrypt AI for input/output security; OpenTelemetry
  exporter + Prometheus dashboards.

## 15. Open Questions & Risks

- **Latency.** Does gRPC retrieval + a Mastra "LLM-as-judge" eval stay within the
  30-minute window for the whole catalog? Mitigation: batch retrieval, cache
  embeddings, run the eval only on non-neutral verdicts.
- **Cost.** Faithfulness evals add LLM tokens per cycle. Mitigation: sample, or gate
  on the grounding check first.
- **Integration.** Wiring gRPC between the Python scraper and Qdrant; Mastra is
  TypeScript, so faithfulness scoring may need a small sidecar or a Python
  reimplementation of the metric.
- **Signal volume.** One ~170-item snapshot per cycle yields only a handful of
  mentions; the guardrail protects quality but does not increase volume (see README
  "Signal quality").
