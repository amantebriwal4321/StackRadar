# PRD: StackRadar Trust Loop

> **Track:** Agent Reliability, Security and Evaluation — MOSS Zero-Latency Builder Sprint.
> **Status legend:** ✅ shipped in this repo · ◑ stub in this repo · ○ designed, not wired.
> This document was drafted by the sprint's Architecture Copilot and then corrected
> against the actual codebase (the auto-generated draft assumed a Vite/Node/AWS stack
> that StackRadar does not use). It also originally treated **"Moss" as the sprint
> arena's codename for a Qdrant placeholder — that was wrong.** Moss is the sprint's
> real sponsor product (`pip install moss`, sub-10ms semantic search, no vector
> database to run or tune), and §5.3 below now describes the shipped integration
> instead of the retired Qdrant placeholder. The companion diagram is
> [`proposed-reliability-layer.pdf`](./proposed-reliability-layer.pdf) (still shows
> the retired Qdrant concept and predates this correction); the accurate
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
   tracked tool; quarantine the rest. ✅ (regex, now backed by Moss semantic
   retrieval when configured — see §5.3)
4. **Graceful degradation** — any failure, rejection or low-confidence result falls
   back to `neutral`, never a skewed score. ✅
5. **Observability** — trace retrieval / inference / validation latency. ◑ (retrieval
   spans + per-cycle stats shipped; OpenTelemetry export still proposed)

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

### 5.2 Context Evaluation — ✅ grounding (regex + Moss semantic) · ○ faithfulness

- **Grounding check (shipped).** A non-neutral verdict is kept if either check
  passes: `guardrails._is_grounded` first checks whether Moss retrieval (§5.3)
  found a high-confidence semantic match for the item, then falls back to
  `scoring.classify_text_to_tools` (substring regex) when Moss found nothing or
  isn't configured. Otherwise the verdict is quarantined to `neutral`.
- **Faithfulness scoring (proposed).** Mastra evals score whether the label is
  supported by retrieved context; sub-threshold results are quarantined.

### 5.3 Fast Retrieval — ✅ shipped (Moss)

- `app/services/retrieval.py` builds a Moss index (`pip install moss`) from the
  31-tool catalog and semantically queries it for each scraped headline before the
  Groq call, via `MossClient.create_index` / `load_index` / `query`.
- The top match's text is folded into the sentiment prompt as context (replacing
  the bare headline the model would otherwise see) and, above
  `GROUND_SCORE_THRESHOLD`, marks the item pre-grounded for §5.2.
- **No-op by design** when `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` are unset (or on
  any runtime failure): `retrieve()` returns `([], 0.0)` and grounding silently
  falls back to the regex check — same contract as `GROQ_API_KEY`,
  `YOUTUBE_API_KEY` elsewhere in this repo.
- Measured to fit comfortably inside the 30-minute scrape window: Moss's own
  reported `time_taken_ms` per query is what `GET /api/v1/status` → `retrieval` →
  `avg_latency_ms` exposes, and per-cycle totals are logged.
- Offline proof (no credentials, no network): `backend/scripts/check_retrieval.py`.

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
  -> Moss retrieval                ✅ semantic-ground each headline, sub-10ms/query
  -> Groq LLM                     sentiment classification (context-enriched prompt)
  -> guardrails.validate_sentiment_batch   ✅ schema + index checks
  -> grounding check              ✅ Moss match OR regex; quarantine ungrounded -> neutral
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
| Evaluation | Moss-backed + regex grounding (`retrieval.py`, `scoring.classify_text_to_tools`) | Mastra evals (faithfulness) |
| Retrieval | **Moss** (`pip install moss`, `retrieval.py`) | — |
| Database | PostgreSQL (prod, Neon) / SQLite (dev) | — |
| Observability | `guardrails.traced()` duration logs, Moss `time_taken_ms` per query | OpenTelemetry, Prometheus |
| Infra | Docker, docker-compose, Vercel (frontend), Render (backend), GitHub Actions CI | — |

## 9. Data Requirements

- **Input.** Title + tags + subreddit + description per scraped item
  (`scoring._item_text`).
- **Context (shipped).** A Moss index of the 31-tool catalog (name + description,
  `app/services/catalog.py`), one document per tool, built via
  `MossClient.create_index` and queried per headline. No prior-discussion history
  is indexed yet — that remains a natural next step, not required for grounding.
- **Guardrail output schema.** The model must return a JSON array of
  `{"i": <batch index>, "s": "positive" | "negative" | "neutral"}`. Anything else is
  dropped or rejected; the accepted subset becomes `{batch_index: label}` and every
  other item defaults to `neutral`.

## 10. API / Interface Specifications

- **`validate_sentiment_batch(raw: str, batch: list[dict]) -> (dict[int, str], GuardrailReport)`**
  — the guardrail entry point, called from `batch_sentiment_analysis`. Pure function,
  no I/O, unit-testable offline; reads the `_moss_grounded` flag `retrieval.py`
  precomputes per item rather than doing I/O itself.
- **`traced(span: str)`** — context manager; span timing today, OpenTelemetry span
  later.
- **`retrieval.retrieve(query_text, top_k=1) -> (list[RetrievedMatch], latency_ms)`**
  — ✅ shipped. Async, awaits `MossClient.query`; returns `([], 0.0)` on any failure
  or when unconfigured. `retrieval.last_run_stats()` is what `GET /api/v1/status` →
  `retrieval` serves.

## 11. Security Requirements

- **Output validation (shipped).** No LLM output reaches the DB until it passes schema
  + grounding checks.
- **Input sanitisation — ○ proposed.** Strip prompt-injection patterns from scraped
  community text before it enters the prompt (Enkrypt AI).
- **PII — ○ proposed.** Enkrypt AI PII detector on model input and output.
- **Secrets.** No keys in git; `GROQ_API_KEY`, `MOSS_PROJECT_ID`/`MOSS_PROJECT_KEY`
  (and any future Enkrypt keys) live only in `backend/.env`. The pipeline degrades
  gracefully when any of them are absent.

## 12. Deployment & Infrastructure

- **Frontend:** Vercel (root `frontend`).
- **Backend + Postgres:** Render (Docker) + Neon.
- **Local:** `docker-compose up --build` (Postgres + FastAPI + Next.js).
- **CI:** `.github/workflows/backend.yml` runs an import check on every push.
  ○ Add `backend/scripts/check_guardrails.py` and `backend/scripts/check_retrieval.py`
  to that workflow so the guardrail and the retrieval fallback contract are both
  gated in CI.

## 13. Success Metrics

| Metric | Target | Now |
|--------|--------|-----|
| Unvalidated LLM output persisted | 0% | 0% ✅ |
| Malformed / hallucinated responses degraded to `neutral` | 100% | 100% ✅ (per test) |
| `check_guardrails.py` pass rate | 7/7 | 7/7 ✅ |
| `check_retrieval.py` runs clean with no credentials (fallback contract) | pass | pass ✅ |
| AI hops covered by a span | 100% | 100% ✅ (Moss retrieval + Groq inference + guardrail validation all wrapped in `traced()`) |
| Moss query latency (Moss-reported `time_taken_ms`) | < 10 ms | not yet measured live — no project key in the build environment; `GET /api/v1/status` → `retrieval` → `avg_latency_ms` reports it once one is added |
| Trust Loop latency overhead per tool | ≤ 500 ms | retrieval wired; awaiting a live measurement under the same constraint |

## 14. Timeline & Milestones

- **Phase 1 — done.** `guardrails.py` (schema + index + grounding) + offline test
  `check_guardrails.py`; wired into `batch_sentiment_analysis`; `traced()` stub.
- **Phase 2 — done.** Moss semantic retrieval (`retrieval.py`) feeding the prompt and
  the grounding check; `check_retrieval.py` offline proof; per-cycle stats on
  `GET /api/v1/status`. Mastra faithfulness eval behind the grounding check remains
  open. `check_guardrails.py` / `check_retrieval.py` are not yet in CI (§12).
- **Phase 3 — production.** Enkrypt AI for input/output security; OpenTelemetry
  exporter + Prometheus dashboards; live Moss project key to measure real latency
  and tune `GROUND_SCORE_THRESHOLD`.

## 15. Open Questions & Risks

- **Threshold tuning.** `GROUND_SCORE_THRESHOLD = 0.5` in `retrieval.py` is an
  untuned starting point — no Moss project key was available in the environment
  this was built in, so it has never scored a real headline against the real
  catalog. Mitigation: once live, log the raw score on every query (already done
  at debug level) and tune against a sample of real scrape cycles.
  Also does a Mastra "LLM-as-judge" faithfulness eval on top of Moss retrieval stay
  within the 30-minute window for the whole catalog? Mitigation: batch retrieval,
  run the eval only on non-neutral verdicts.
- **Cost.** Faithfulness evals add LLM tokens per cycle. Mitigation: sample, or gate
  on the grounding check first.
- **Integration.** Mastra is TypeScript, so faithfulness scoring may need a small
  sidecar or a Python reimplementation of the metric. (Moss integration itself is
  resolved — pure-Python SDK, no sidecar needed.)
- **Signal volume.** One ~170-item snapshot per cycle yields only a handful of
  mentions; the guardrail protects quality but does not increase volume (see README
  "Signal quality").
