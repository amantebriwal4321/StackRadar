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
Alembic is configured (`backend/alembic.ini`, versions in `backend/alembic/versions/`), but the app **also auto-creates tables** on startup via `Base.metadata.create_all` and seeds them. Because `create_all` never adds a column to a table that already exists, `app/db/migrate.py:ensure_columns` runs on startup and additively `ALTER TABLE ADD COLUMN`s any missing model fields (nullable/defaulted only — it never drops/retypes). Adding a plain nullable column to a model needs no Alembic step; anything structural still does. For schema changes:
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
4. **`app/api/endpoints/mvp.py`** — the single router, mounted at `settings.API_V1_STR` (`/api/v1`). All endpoints live here: `/tools`, `/tools/{slug}`, `/tools/{slug}/history`, `/tools/{slug}/resources` (learning videos + platforms, see below), `/tools/compare`, `/tools/by-domain`, `/domains`, `/domains/{slug}/learning-path`, `/roadmaps`, `/roadmaps/{slug}` (steps hydrated with per-step tools + each tool's top video), `/progress/{summary,/{slug},toggle}` (learning progress, auth-gated), `/notifications/{subscribe,status,unsubscribe}` (daily-nudge opt-in), `/overview`, `/status`, `/health`, `/ready`, `/admin/scrape` + `/admin/send-daily-digests` (gated by `ADMIN_API_KEY`).
5. **`app/models/all_models.py`** — tables: `Domain`, `Tool` (now also carries `homepage`/`latest_version`/`latest_release_at` for the resource docs-link + stale-tutorial warning), `ToolSnapshot` (time series, incl. `stars`), `ToolRoadmap`, `UserProgress` (completed roadmap steps per user), `ToolResource` (cached learning videos/platforms), `NotificationPref` (daily-nudge opt-in). Roadmaps are keyed by **domain slug**. New model fields are reconciled onto existing DBs at startup by `app/db/migrate.py:ensure_columns` (additive `ALTER TABLE ADD COLUMN` only — `create_all` never adds columns to an existing table).

### Learning layer (the retention + growth product)
- **Resources — `app/services/resources.py`** (`GET /tools/{slug}/resources`). Best videos/playlists + platform links per tool. **Nothing is model-generated:** video links come from the YouTube Data API (ranked by `rank_resource`: reach/engagement/freshness/depth) when `YOUTUBE_API_KEY` is set, else from a hand-curated `CURATED_VIDEOS` list where **every id is verified live via YouTube oEmbed** (`verify_youtube`) before it ships — a bad/unrelated id fails closed. `videos_source` = `youtube_api` | `curated` | `search`. `warm_resource_cache` pre-warms on startup; results cached in `ToolResource` (24h TTL). Curated platform links are always-valid search/listing deep-links (DevDocs, freeCodeCamp, NPTEL/SWAYAM…). Release data (for the "predates current version" warning) comes from `scraper.fetch_github_latest_release`.
- **Progress — `/progress/*`.** `UserProgress` rows exist only for COMPLETED steps; `build_progress_summary` computes streak + active roadmaps + today's focus. **Auth: `app/core/auth.py` verifies the Clerk session JWT** (issuer/JWKS derived from the public `CLERK_PUBLISHABLE_KEY`, no secret) and uses its `sub`; a client-supplied `user_id` is ignored when Clerk is configured, and falls back only in keyless dev.
- **Daily nudge — `app/services/notifications.py`.** Opt-in only (`NotificationPref`). `run_daily_digests` builds each user's "next lesson" digest (reusing the progress summary) and sends via Resend, or logs a no-op when `RESEND_API_KEY` is empty. Triggered by an external daily cron hitting `POST /admin/send-daily-digests` (`X-Admin-Key`).

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
- **App Router** (`frontend/src/app/`). Key routes: `/` (landing — repositioned so **roadmaps are the hero**, momentum is the proof; leads with the `FiveMinutePlan` goal→roadmap chooser), `/explore`, `/trends`, `/compare`, `/tools/[slug]` (renders `LearningResources`), `/roadmap/[technology]` (interactive path — per-step "Watch on YouTube" + per-tool "Best course" videos, progress check-off), `/roadmaps`, `/watchlist`, plus the growth surfaces: `/plan/[slug]` (public shareable career-plan landing, per-goal OG preview), `/learn/[slug]` (SSR SEO guide "How to Learn X in 2026" with Course/FAQ JSON-LD), and `/api/og` (dynamic Open Graph card via `next/og`). `ShareButton` (native share + copy) drives the acquisition loop; goal→roadmap mapping lives in `src/data/goals.ts`. `sitemap.ts` lists all learn/roadmap/plan/tool pages. Set `NEXT_PUBLIC_SITE_URL` in production so OG/canonical/sitemap URLs are absolute.
- **`frontend/src/data/trends.ts` is the only place the frontend talks to the backend.** Every page imports typed `fetchX()` helpers from here (`fetchTools`, `fetchOverview`, `fetchToolDetail`, `fetchLearningPath`, `fetchCompareTools`, etc.). Fetches use Next.js ISR (`revalidate`). **Do not hardcode tool/score/roadmap data in components — it must come through this layer.**
- **Same-origin API proxy (do not undo).** The browser calls its OWN origin `/api/v1/*`; `frontend/next.config.ts` rewrites that to `BACKEND_ORIGIN` server-side. So there is **no CORS** and only the page's own port must be reachable (this fixed the class of bug where a hardcoded `http://<LAN-IP>:8000` was unreachable from the same machine/phone). `API_BASE` in `trends.ts` = `window.location.origin` on the client, `process.env.BACKEND_ORIGIN || "http://localhost:8000"` on the server (SSR/ISR). **`NEXT_PUBLIC_API_URL` was removed — do not reintroduce it.** Gotchas: `BACKEND_ORIGIN` is read at BUILD time by `rewrites()`, so it must be set before the build (docker-compose passes `http://backend:8000` as a build arg; Vercel sets the public backend URL); the rewrite is scoped to `/api/v1/*` so the app's own `/api/og` route is NOT proxied. Absolute site URL (OG/canonical/sitemap/JSON-LD) has a single source of truth: `frontend/src/lib/site.ts` (`SITE_URL` ← `NEXT_PUBLIC_SITE_URL`).
- **Mobile:** the landing renders a dedicated `MobileHome` tree below 768px, chosen by a JS breakpoint in `page.tsx` (NOT a CSS hidden/block split) so the heavy R3F 3D constellation never mounts on phones. Entrance animations there (and in `FiveMinutePlan`) are fail-safe: content only starts hidden once a visible tab is confirmed (`canAnimate` gate), else it paints visible — never stranded by an animation that doesn't fire. The `Navbar` is transparent (no bg box) with a scroll-progress bar; `template.tsx`'s page transition is opacity-only (a transform there breaks the fixed navbar's stick).
- **Auth:** Clerk, wired via `<ClerkProvider>` in `frontend/src/app/layout.tsx`. Keep it.
- **Design system ("Mercury" — onyx + cobalt, DARK-FIRST, adopted 2026-08-25, replacing the retired wine "Neon Noir"):** dark is the DEFAULT — the pre-paint script in `layout.tsx` adds `.dark` to `<html>` unless the visitor explicitly chose light, and `Navbar.tsx` is the only writer of that class. Dark values live in `html.dark`, light values in `:root`. Dark: onyx canvas `#171721`, graphite cards `#1e1e2a`, obsidian insets `#272735`, ivory text `#ededf3` (**never pure white**), ash secondary `#c3c3cc`. Light: canvas `#f4f5f9`, white cards, ink `#171721`. ONE accent — cobalt: `--accent-1` `#5266eb` light / `#6478ee` dark, `--accent-2` a lighter cobalt TINT (`#7b8bf2`/`#8f9cf5`) for gradients+glows (**not a second hue**), `--accent-3` pressed. **Data colours stay separate and constant in both themes — score-green `#12B76A`, amber `#B54708`, red `#F04438` — momentum meaning only, never decoration.** Do NOT reintroduce the retired palettes (wine `#7C2D4A`/magenta `#C23E6E`, violet `#A78BFA`/pink `#F472B6`, electric blue `#3B82F6`, indigo `#4338CA`, or the teal/graphite/clay comparison themes). **Mercury shape rules:** cards are FLAT — 12px radius, 1px border, `box-shadow: none` (elevation reads from value contrast, not shadow); buttons/inputs are pills; headings use medium weights, never `font-black`. **Theming mechanism:** there is no per-page theme — `:root`/`html.dark` remap Tailwind's whole `--color-indigo-400/500/600/700` scale to cobalt, so every existing `*-indigo-*` utility (350 of them) follows automatically; shared utilities reference `var(--accent-1/2/3)`. When adding UI, use `indigo-*` classes or `var(--accent-1)` — never a hardcoded hex. Colours a token swap cannot reach are hardcoded per-file and must be updated by hand: `3d/LiveConstellation.tsx` + `3d/TechSphere.tsx` (Three.js can't read CSS vars), `ChartContainer.tsx` (chart series ramp), and `api/og/route.tsx` (renders server-side without CSS). `--c-scrim` (`#171721`) is the full-bleed dark chrome used by the preloader panels and terminal bar — deliberately dark in BOTH themes, since white text sits on it. Fonts: Space Grotesk (display), Inter (sans), JetBrains Mono (mono — the terminal voice, ~258 usages; keep it for labels/data). Utility classes: `tech-panel`(+`tech-panel-interactive`) flat card, `terminal-window`/`terminal-bar` console chrome, `hud-grid`/`neon-rule` overlays, plus `glass-panel`, `gradient-text`, `text-shimmer`, `ambient-orb`, `btn-primary`, `ticker-rail` (edge-masked marquee), `split-reveal` (masked word reveal), `sr-loader` (Uiverse spinner), `confetti-piece`, and motion `animate-char-in`, `letter-spin`, `line-reveal`, `editorial-grid`. Motion stack: Framer Motion, GSAP + ScrollTrigger, Lenis smooth scroll, R3F for the landing constellation. **Animation fail-safe rule (learned the hard way, 4×):** never let a JS-clock animation be the ONLY thing that reveals content — framer-motion pauses on a backgrounded tab and never writes the final value, stranding content invisible. Prefer CSS for anything load-bearing (the accordion fold, `SplitReveal`), and make the resting state the readable one. **Turbopack gotcha:** `globals.css` edits don't serve until `.next` is deleted + dev server restarted — this bites every single time; a stale cache also silently breaks client data fetching on the landing page.

## Constraints (do not break)
- **No API keys or secrets committed to git, ever.** Keys live only in `backend/.env` / `frontend/.env.local` (gitignored). The user manages `GITHUB_TOKEN` themselves — never handle the token value.
- All frontend data comes from the backend API via `trends.ts` — no hardcoded catalog data in components.
- Keep Clerk auth.
- `docker-compose up --build` must remain the working local run method. (Its frontend service sets `BACKEND_ORIGIN=http://backend:8000` — build arg + env — so the same-origin proxy resolves to the backend service, not the frontend container.)
- The app runs fine with **empty `GITHUB_TOKEN`/`GROQ_API_KEY`** (degraded: no GitHub stats, no sentiment) — don't make either a hard requirement to boot.

## Environment variables
Backend (`backend/.env`): `GITHUB_TOKEN`, `GROQ_API_KEY`, `YOUTUBE_API_KEY` (optional — enables ranked video results on `/tools/{slug}/resources`; without it the endpoint returns curated platform links and reports `videos_live: false`), `CLERK_PUBLISHABLE_KEY` (optional but required in production — the same public `pk_...` value as the frontend; when set, `/progress` verifies the Clerk session token server-side via `app/core/auth.py` and ignores any client-supplied `user_id`; when empty it falls back to a client id for local dev), `RESEND_API_KEY` + `DIGEST_FROM` + `SITE_URL` (optional — the daily learning-nudge email; empty → the `/admin/send-daily-digests` batch runs as a safe no-op and sends nothing; trigger it from an external daily cron with the `X-Admin-Key` header), `ADMIN_API_KEY` (optional), `DATABASE_URL` (auto-set by Docker; empty → SQLite). Frontend (`frontend/.env.local`): `BACKEND_ORIGIN` (where the Next server proxies `/api/v1/*` — **read at build time**; local `http://localhost:8000`, docker-compose `http://backend:8000`, prod = the public backend URL), `NEXT_PUBLIC_SITE_URL` (absolute site URL for OG/canonical/sitemap; single source `src/lib/site.ts`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. (`NEXT_PUBLIC_API_URL` was removed in favour of the proxy.)

## Deployment
Live (beta): **frontend on Vercel** (root `frontend`), **backend + Postgres on Render + Neon** (root `backend`, Docker). The same-origin proxy means Vercel forwards `/api/v1/*` to the Render backend — no CORS to configure. Full step-by-step (env-var tables, Clerk/scraper/cron notes, single-VPS docker-compose alternative) is in **`DEPLOY.md`**. Set `BACKEND_ORIGIN` in Vercel *before* the first build (it's baked into the rewrite), and `NEXT_PUBLIC_SITE_URL` to the real domain. The Render free tier sleeps on inactivity (~50s cold start on the first request) — expected for the beta.
