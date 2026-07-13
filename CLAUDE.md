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

### Signal quality — the "mentions" pipeline
The GitHub half of the score always worked; the **developer-conversation half** used to read `0` for every tool. Two root causes were fixed (2026-07-13):
1. **Rounding sink (fixed).** Mentions were sentiment-weighted floats (neutral `0.5`) then `round()`-ed → `round(0.5) = 0`, so isolated mentions vanished. `scheduler.py` Step 3 now uses `scoring.count_mentions` → **raw integer counts** (one per matching item), no rounding.
2. **Under-used text (fixed).** Matching now runs over `title + tag_list/tags + subreddit + description` via `scoring._item_text`. Dev.to's `description` was previously ignored and is where most matches now come from.
3. **Thin volume (inherent).** One ~170-item snapshot across 4 sources; HN items are title-only, so a single cycle yields only a handful of mentions (~5). They **accumulate across cycles** in `ToolSnapshot.mention_count` (scheduler ~line 346). `tool.hn_count`/`devto_count`/etc. hold the latest cycle's raw counts. `count_weighted_mentions` + `SENTIMENT_WEIGHTS` remain in `scoring.py` for future sentiment work but are no longer on the scrape path.
To grow the signal further: add more subreddits/RSS feeds, fetch HN story text (not just titles), or widen keywords in `catalog.py`.

### Frontend
- **App Router** (`frontend/src/app/`). Key routes: `/` (landing), `/explore` (the score→roadmap learning journey — the core product loop), `/trends`, `/compare`, `/tools/[slug]`, `/roadmap/[technology]`, `/roadmaps`, `/watchlist`.
- **`frontend/src/data/trends.ts` is the only place the frontend talks to the backend.** Every page imports typed `fetchX()` helpers from here (`fetchTools`, `fetchOverview`, `fetchToolDetail`, `fetchLearningPath`, `fetchCompareTools`, etc.). `API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`. Fetches use Next.js ISR (`revalidate`). **Do not hardcode tool/score/roadmap data in components — it must come through this layer.**
- **Auth:** Clerk, wired via `<ClerkProvider>` in `frontend/src/app/layout.tsx`. Keep it.
- **Design system ("Neon Noir" — deep wine, FINAL as of 2026-07-14):** light **cool** canvas `#E8E6EC` (deliberately not warm — a warm ground read as "cafe"), white panels `#FFFFFF`, ink text `#141726` / secondary `#5A6072`. ONE accent, driven by CSS vars in `globals.css`: `--accent-1: #7C2D4A` (wine — solid fills/text/borders), `--accent-2: #C23E6E` (magenta glow — gradients/glows/hover pop, **used sparingly** for the restrained-cyberpunk hint), `--accent-3: #4E1E32` (deep/pressed). **Data colours are separate and constant everywhere — score-green `#12B76A`, amber `#B54708`, red `#F04438` — momentum meaning only, never decoration.** Do NOT reintroduce the retired palettes (violet `#A78BFA`/pink `#F472B6`, electric blue `#3B82F6`, indigo `#4338CA`, or the teal/graphite/clay comparison themes). **Theming mechanism:** there is no per-page theme — `:root` remaps Tailwind's whole `--color-indigo-400/500/600/700` scale to wine, so every existing `*-indigo-*` utility renders wine automatically; shared utilities reference `var(--accent-1/2/3)`. When adding UI, use `indigo-*` classes or `var(--accent-1)` for accent — never a hardcoded blue/indigo hex. The 3D `LiveConstellation` colours are hardcoded wine/magenta (Three.js can't read CSS vars). Fonts: Space Grotesk (display), Inter (sans), JetBrains Mono (mono). Utility classes: `tech-panel`(+`tech-panel-interactive`) raised card, `terminal-window`/`terminal-bar` console chrome, `hud-grid`/`hud-scanlines`/`neon-rule` techy overlays, plus `glass-panel`, `card-hover-glow`, `gradient-text`, `text-shimmer`, `ambient-orb`, `btn-primary`, and Optimus-reference motion `animate-char-in`, `letter-spin` (the hover "screw"), `line-reveal`, `editorial-grid`. Motion stack: Framer Motion, GSAP + ScrollTrigger, Lenis smooth scroll, R3F (`@react-three/fiber`) for the live 3D constellation on the landing. **Turbopack gotcha:** `globals.css` edits don't serve until `.next` is deleted + dev server restarted; `.claude/launch.json` defines the `frontend` dev server for the preview tooling.

## Constraints (do not break)
- **No API keys or secrets committed to git, ever.** Keys live only in `backend/.env` / `frontend/.env.local` (gitignored). The user manages `GITHUB_TOKEN` themselves — never handle the token value.
- All frontend data comes from the backend API via `trends.ts` — no hardcoded catalog data in components.
- Keep Clerk auth.
- `docker-compose up --build` must remain the working local run method.
- The app runs fine with **empty `GITHUB_TOKEN`/`GROQ_API_KEY`** (degraded: no GitHub stats, no sentiment) — don't make either a hard requirement to boot.

## Environment variables
Backend (`backend/.env`): `GITHUB_TOKEN`, `GROQ_API_KEY`, `ADMIN_API_KEY` (optional), `DATABASE_URL` (auto-set by Docker; empty → SQLite). Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
