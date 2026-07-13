# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**StackRadar** — a real-time developer tech-intelligence app. It scores tools/frameworks 0–100 by momentum, mined from GitHub, Hacker News, Reddit, Dev.to, and RSS tech news, then ties each tool to a learning roadmap. Positioning: "the Bloomberg Terminal for your tech stack — know what to learn/adopt next." Backend is FastAPI + SQLAlchemy; frontend is Next.js 16 (App Router) with a cinematic, motion-heavy UI.

## Commands

### Run everything (canonical local method)
```bash
docker-compose up --build
```
Brings up Postgres, the FastAPI backend (`:8000`, runs the scraper inline via `RUN_SCRAPER_INLINE=1`), and the Next.js frontend (`:3000`). Requires `backend/.env` (copy from `backend/.env.example`) and `frontend/.env.local` (copy from `frontend/.env.example`).

### Backend (local, without Docker)
```bash
cd backend
.\venv\Scripts\Activate.ps1              # PowerShell; venv lives in backend/
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Local uses **SQLite** (`backend/test.db`) automatically when no `DATABASE_URL` is set. Set `RUN_SCRAPER_INLINE=0` to boot the API without kicking off the 30-min scrape loop. Interactive API docs at `http://localhost:8000/api/v1/openapi.json` / `/docs`.

**Practical local-dev notes (Windows):**
- The venv interpreter is `backend/venv/Scripts/python.exe` — call it directly (`./venv/Scripts/python.exe -m uvicorn ...`) when a shell isn't activated. The bare `python` on PATH is a different install without the deps.
- To start with a live scrape: `RUN_SCRAPER_INLINE=1 ./venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. Startup logs token status + a Reconcile line; the scrape runs Steps 0–8 (~1–2 min for 31 repos).
- **Cosmetic log noise:** the Windows console is cp1252, so loguru lines containing emoji (⭐ ✅) raise `UnicodeEncodeError` in the handler. This is harmless — data is unaffected. `logs/stackradar.log` (utf-8) is clean.
- **Never print/echo the `GITHUB_TOKEN` value.** To verify it works, hit GitHub `/rate_limit` with it and check the tier (authenticated = 5000/hr, empty/invalid = 60/hr), or just read the startup log line `GITHUB_TOKEN: ✅ set`.

### Frontend (local)
```bash
cd frontend
npm install
npm run dev        # Next dev server on :3000 (Turbopack)
npm run build      # production build
npm run lint       # eslint
```

### Migrations
Alembic is configured (`backend/alembic.ini`, versions in `backend/alembic/versions/`), but the app **also auto-creates tables** on startup via `Base.metadata.create_all` and seeds them. For schema changes:
```bash
cd backend
alembic revision --autogenerate -m "message"
alembic upgrade head
```

There is **no test suite** in this repo yet.

## Architecture

### Data flow (the core loop)
```
scraper.py  →  scoring.py  →  models (Tool/ToolSnapshot)  →  mvp.py API  →  frontend/src/data/trends.ts  →  pages
 (sources)     (0–100 %ile)     (DB + time series)          (/api/v1/*)       (typed fetch layer)         (UI)
```

1. **`app/services/scheduler.py`** — `run_scraper_loop()` runs every 30 min (started as an asyncio task at app startup). `perform_full_scrape()` is an 8-step pipeline: sync tool registry → fetch community sources → sentiment → GitHub repo stats → score → persist snapshots → update tools → recompute. Live progress is exposed via `GET /api/v1/status`.
2. **`app/services/scraper.py`** — async fetchers: `fetch_github_repo_stats` (targeted per-repo, ETag caching + adaptive rate limiting), `fetch_hackernews`, `fetch_devto`, `fetch_reddit` (RSS, no auth), `fetch_tech_news` (RSS). `batch_sentiment_analysis` uses Groq (`llama-3.1-8b-instant`) — a no-op/skip when `GROQ_API_KEY` is empty.
3. **`app/services/scoring.py`** — `calculate_all_tool_scores` normalizes weighted mentions + GitHub signals into **percentile ranks (0–100)** across all tools at once (this is why scores are relative, not absolute). Also classifies growth stage, trend, learning priority, and generates recommendation text.
4. **`app/api/endpoints/mvp.py`** — the single router, mounted at `settings.API_V1_STR` (`/api/v1`). All endpoints live here: `/tools`, `/tools/{slug}`, `/tools/{slug}/history`, `/tools/compare`, `/tools/by-domain`, `/domains`, `/domains/{slug}/learning-path`, `/roadmaps`, `/roadmaps/{slug}`, `/overview` (aggregate stats for the landing hero), `/status`, `/health`, `/ready`, `/admin/scrape` (manual trigger, gated by `ADMIN_API_KEY`).
5. **`app/models/all_models.py`** — four tables: `Domain`, `Tool`, `ToolSnapshot` (time series), `ToolRoadmap`. Roadmaps are keyed by **domain slug**.

### One unified tool catalog (single source of truth)
**`app/services/catalog.py` is the ONE place tools are defined.** Its `TOOLS` list carries all three concerns per tool: display (name, slug, icon, category, description), learning (level, is_entry_point, seq, parent_slug), and scraping (github_repo, keywords). To add/edit/remove a tracked tool, edit this file and nothing else.

- `seed.py` imports it as `SEED_TOOLS` (seeds the DB from it).
- `scoring.py` derives `TOOL_REGISTRY` (repo + keywords + category) and the mention-matching regex patterns from it.
- `scheduler.py` Step 0 **never creates tool rows** — it only warns if a catalog tool is missing. Creating rows there was the old bug.
- `seed.reconcile_catalog(db)` runs on every startup (after `run_seed`) and **deletes any `tools` row whose slug isn't in the catalog** — this purges legacy placeholder/duplicate rows so the live DB always matches the catalog.

`category` **must** match a `Domain` name in `SEED_DOMAINS` (domain pages / learning paths resolve by it). This replaced a prior dual-catalog bug where `SEED_TOOLS` and a separate hardcoded `TOOL_REGISTRY` disagreed on slugs/repos and spawned ~23 null-category placeholder rows (e.g. "Python #1"). History: `memory/stackradar-data-integrity.md`.

All 31 tools now carry real GitHub stars + percentile scores (a live authenticated scrape ran 2026-07-13). The catalog membership is the curated 31; widen it later by adding entries to `catalog.py` (+ a matching `Domain` if the category is new).

### Signal quality — the "mentions" pipeline is weak (known, unfixed)
The GitHub half of the score works; the **developer-conversation half barely registers** — after a live scrape, nearly every tool shows `mentions = 0`. Root causes (all in `scoring.py` / `scheduler.py`, none from the catalog work):
1. **Rounding sink (bug).** With Groq off, every mention is weighted `0.5` (neutral). `scheduler.py` does `round(0.5)` → `0`, so any tool mentioned only once or twice per cycle is silently dropped. A tool needs ~3+ mentions in one source to register. Fix: `math.ceil` for any positive weighted value, or store the float, or raise the neutral weight.
2. **Under-used text.** `count_weighted_mentions` (scoring.py) matches only `title + tag_list + subreddit`. Dev.to items also carry a rich `description` field that is ignored — free signal left on the table.
3. **Thin volume.** One ~170-item snapshot across 4 sources; HN items are title-only. Mentions do accumulate across cycles in `ToolSnapshot.mention_count` (scheduler ~line 346), so volume grows over time.
The matcher itself is fine (`classify_text_to_tools` correctly tags rust/react/ollama/etc.). This is the next high-value backend task and maps directly to the product's "what people are talking about" promise.

### Frontend
- **App Router** (`frontend/src/app/`). Key routes: `/` (landing), `/explore` (the score→roadmap learning journey — the core product loop), `/trends`, `/compare`, `/tools/[slug]`, `/roadmap/[technology]`, `/roadmaps`, `/watchlist`.
- **`frontend/src/data/trends.ts` is the only place the frontend talks to the backend.** Every page imports typed `fetchX()` helpers from here (`fetchTools`, `fetchOverview`, `fetchToolDetail`, `fetchLearningPath`, `fetchCompareTools`, etc.). `API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`. Fetches use Next.js ISR (`revalidate`). **Do not hardcode tool/score/roadmap data in components — it must come through this layer.**
- **Auth:** Clerk, wired via `<ClerkProvider>` in `frontend/src/app/layout.tsx`. Keep it.
- **Design system ("Deep Space v2"):** near-black `#09090B` ground, panels `#111113`/`#18181B`, accents violet `#A78BFA` / cyan `#22D3EE` / pink `#F472B6`, score-green `#34D399`. Fonts: Space Grotesk (display), Inter (sans), JetBrains Mono (mono). Utility classes in `globals.css`: `glass-panel`, `card-hover-glow`, `gradient-text`, `text-shimmer`, `ambient-orb`, `btn-primary`. Motion stack: Framer Motion, GSAP + ScrollTrigger, Lenis smooth scroll, R3F (`@react-three/fiber`) for the live 3D constellation on the landing.

## Constraints (do not break)
- **No API keys or secrets committed to git, ever.** Keys live only in `backend/.env` / `frontend/.env.local` (gitignored). The user manages `GITHUB_TOKEN` themselves — never handle the token value.
- All frontend data comes from the backend API via `trends.ts` — no hardcoded catalog data in components.
- Keep Clerk auth.
- `docker-compose up --build` must remain the working local run method.
- The app runs fine with **empty `GITHUB_TOKEN`/`GROQ_API_KEY`** (degraded: no GitHub stats, no sentiment) — don't make either a hard requirement to boot.

## Environment variables
Backend (`backend/.env`): `GITHUB_TOKEN`, `GROQ_API_KEY`, `ADMIN_API_KEY` (optional), `DATABASE_URL` (auto-set by Docker; empty → SQLite). Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
