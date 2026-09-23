# StackRadar — Moss Zero-Latency Builder Sprint submission

**Track:** Agent Reliability, Security and Evaluation
**One line:** StackRadar is the Bloomberg Terminal for your tech stack — it scores 31
developer tools 0–100 by real momentum mined from GitHub, Hacker News, Reddit, Dev.to
and RSS. This submission wires **Moss** in as the *Fast Retrieval* layer of a "Trust
Loop" that keeps a bad LLM response from ever corrupting those scores.

## Submission checklist

| Requirement | Status | Where |
|---|---|---|
| GitHub repository | ✅ | this repo (`main`) |
| Architecture diagram | ✅ | [`docs/architecture/trust-loop-moss.svg`](./docs/architecture/trust-loop-moss.svg) / [`.png`](./docs/architecture/trust-loop-moss.png) |
| 2-minute demo video | ⏳ record from the script below | — |

## What we built (and why it fits the track)

StackRadar is almost entirely deterministic — scoring is pure math over GitHub +
community signals. The **one** LLM call on the live path is a Groq request per scrape
cycle that classifies community sentiment. A malformed, hallucinated, or ungrounded
response there would silently skew a tool's momentum score.

The **Trust Loop** wraps that one LLM hop with three shipped defenses, and Moss powers
the retrieval one:

1. **Fast Retrieval — Moss (`pip install moss`, `backend/app/services/retrieval.py`).**
   Before the LLM sees a headline, we semantically query a Moss index built from the
   31-tool catalog. Sub-10ms, no vector database to run or tune. The best match (a) is
   folded into the classification prompt as context, and (b) grounds the eventual
   verdict — catching paraphrases the old substring regex misses ("k8s", "the Rust
   compiler", "Next").
2. **Runtime Guardrails (`guardrails.py`).** Every model row is validated against a
   strict Pydantic schema; hallucinated array indices are discarded; anything not
   explicitly accepted stays at the safe `neutral` default.
3. **Context Eval / grounding (`guardrails._is_grounded`).** A non-neutral verdict is
   kept only if the Moss match *or* the regex confirms the text is about a tracked
   tool. Otherwise it's quarantined to `neutral`.

Nothing the LLM produces reaches the database until it clears all three.

## How Moss is used — concretely

- **Index:** one Moss document per catalog tool (`name: description`, category as
  metadata), built via `MossClient.create_index` / `load_index` (`retrieval.py`).
- **Query:** `MossClient.query(index, headline, QueryOptions(top_k=1))` per scraped
  item, inside `scraper.batch_sentiment_analysis`.
- **Latency:** Moss's own `SearchResult.time_taken_ms` is surfaced on
  `GET /api/v1/status → retrieval → avg_latency_ms`, and logged per cycle.
- **Graceful degradation:** with `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` unset, or on
  any failure, `retrieve()` returns `([], 0.0)` and grounding falls back to the regex
  check — same "optional key" contract as GROQ / YouTube elsewhere in the repo.

Full narrative: README.md → "Hackathon Architecture" · [`docs/architecture/PRD.md`](./docs/architecture/PRD.md).

## Run it / verify it

```bash
# Whole stack (Postgres + FastAPI + Next.js)
docker-compose up --build

# Backend tests (187 pass, ~2s, no network/keys needed)
cd backend && pip install -r requirements-dev.txt && python -m pytest tests -q

# Offline proof of the Trust Loop (no keys, no network)
python scripts/check_guardrails.py     # 7/7 guardrail cases
python scripts/check_retrieval.py      # Moss fallback contract; live latency if keys set
```

**To show live Moss latency in the demo,** sign up for a free project at
https://moss.dev, put `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` in `backend/.env`, and
`scripts/check_retrieval.py` will print real per-query `time_taken_ms` and the top
semantic match for each sample headline.

## 2-minute demo video — shot-by-shot script

> Target: 120s. Screen-record with voiceover. Keep it moving.

**0:00–0:20 — The product & the problem.**
Show StackRadar's landing / trends page: 31 tools ranked 0–100 by momentum.
Say: *"StackRadar scores developer tools by real momentum. It's mostly deterministic
math — but one LLM call classifies community sentiment, and a bad response there could
silently corrupt every score. Fixing that is our track: agent reliability."*

**0:20–0:45 — The Trust Loop & where Moss sits.**
Show the architecture diagram (`docs/architecture/trust-loop-moss.svg`).
Trace the flow left to right; land on the blue Moss box. Say: *"Before the LLM ever
sees a headline, we semantically retrieve the tool it's about from a Moss index — no
vector database, sub-10 milliseconds — and use that both to ground the verdict and to
give the model real context."*

**0:45–1:15 — Moss live.**
Terminal: run `python scripts/check_retrieval.py` (with real keys set). Point at the
output: *"k8s" resolves to Kubernetes, "the Rust compiler" to Rust — matches the plain
substring regex would miss — each in single-digit milliseconds.* Highlight the
`time_taken_ms` column and the run-stats line.

**1:15–1:40 — Reliability payoff.**
Terminal: run `python scripts/check_guardrails.py` — 7/7 green. Say: *"A hallucinated
index, an ungrounded opinion, a malformed batch — all quarantined to neutral. Nothing
unverified reaches the database."* Optionally show `GET /api/v1/status → retrieval` in
the browser.

**1:40–2:00 — Close.**
Back to the product. Say: *"Moss turns retrieval from a bottleneck into a guardrail:
faster context, and scores you can trust. That's StackRadar on Moss."*

## Judging-criteria map

| Criterion | Weight | Our evidence |
|---|---|---|
| Product & UX | 35% | Live product: 31 tools, momentum scores, roadmaps, learning layer — a real, deployed app, not a demo shell. |
| Technical execution | 30% | Moss wired into a real pipeline behind a schema + grounding guardrail; 187 tests; offline proof scripts; graceful degradation. |
| Speed & latency | 20% | Sub-10ms Moss retrieval on the hot path, surfaced on `/status` and in `check_retrieval.py`; no vector DB, no network hop. |
| Demo & presentation | 15% | Script above; architecture diagram; honest status labels (shipped vs proposed). |
