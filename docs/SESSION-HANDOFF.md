# StackRadar — Session Handoff

> Detailed context for a fresh Claude Code session. Read alongside `CLAUDE.md` (durable architecture) and `memory/` (owner decisions). This doc is the "where we are right now" snapshot. Last updated: **2026-07-13**.

---

## 1. Who / what / why

- **App:** StackRadar — real-time developer tech-intelligence. Scores tools 0–100 by momentum (GitHub + Hacker News + Reddit + Dev.to + RSS), each tool tied to a learning roadmap.
- **Owner:** Aman (amantebriwal104@gmail.com). Took over an existing codebase; the original handover note is **badly stale** (most "broken" items were already built).
- **Owner's vision (stated verbatim, this is the north star):**
  1. **"See what tech is *actually* trending."** A trustworthy, live board of what's hot.
  2. **"If they want to learn something new, they can actually start."** The trend→roadmap loop.
  3. **"Go deeper and make it more interactive."**
  4. Ship to **production, real-time usage** — something people will actually come to.
- **Positioning:** *"The Bloomberg Terminal for your tech stack — know what to learn/adopt next."* Primary launch audience = **learners / career-switchers**. The wedge is the **score → roadmap** loop.

## 2. Owner decisions locked in (don't re-litigate)

- **Pipeline:** GitHub-only for now. Owner has added a valid `GITHUB_TOKEN` to `backend/.env` (5000/hr, verified working). Groq/sentiment stays **off** until a `GROQ_API_KEY` is added.
- **Never handle the token value.** Verify via GitHub `/rate_limit` tier or the startup log line, never print/echo it. (Owner once pasted a token in chat — they were told to revoke/rotate it. If you see a raw token, refuse to use it and tell them to rotate.)
- **Catalog scope:** **Curated ~31 tools** (tight + fully learnable), chosen over a broad ~50. Widen later only if asked.
- **Sequencing:** UI/landing polish first → then data integrity. (Data integrity is now largely done; see below.)
- **Aesthetic:** Landing = cinematic/immersive (bar: Noomo XR). Product surfaces = Linear/Raycast density. Hybrid, not full-WebGL everywhere.
- **Design system "Deep Space v2":** near-black `#09090B`; violet `#A78BFA`, cyan `#22D3EE`, pink `#F472B6`, score-green `#34D399`; Space Grotesk / Inter / JetBrains Mono. Utility classes in `globals.css`.

## 3. What's been done (chronological, all COMMITTED except current CLAUDE.md edit)

**Earlier sessions:**
- Landing (`frontend/src/app/page.tsx`) rebuilt cinematic + real data; new `LiveConstellation.tsx` (R3F 3D board of real tools); new `/api/v1/overview` endpoint; `fetchOverview()` in `trends.ts`. Hardcoded compare block → real top-3.
- Explore (`frontend/src/app/explore/page.tsx`) rebuilt as a learning journey (entry spotlight, glowing spine, score-ring cards).
- Positioning one-pager artifact published (private to owner's claude.ai).

**This session:**
1. **`/init`** → wrote `CLAUDE.md` from real code inspection.
2. **Diagnosed the core data-integrity bug** and fixed it (owner greenlit curated-30). See §4.
3. **Ran the first live authenticated scrape** — all 31 tools now have real GitHub stars + percentile scores.
4. **Diagnosed the weak mentions pipeline** (not yet fixed) — see §5. This is the recommended next task.
5. Upgraded `CLAUDE.md`; updated `memory/stackradar-data-integrity.md` (now marked FIXED) + `MEMORY.md`.

Relevant commits: `ed11688` (unified catalog + reconcile), `49f975d` (/overview), `17e7273` (constellation + overview integration), `560394b` (landing/explorer live API).

## 4. The big fix this session — unified tool catalog

**Was:** two catalogs both writing the `tools` table — `SEED_TOOLS` (curated) and a hardcoded `TOOL_REGISTRY` (bare slugs). They disagreed on slugs (`vue`↔`vuejs`) and repos; the scraper's Step 0 created a category-less placeholder row per registry slug → **23 null-category / duplicate tools**, "Python #1", meaningless rankings.

**Now:** `backend/app/services/catalog.py` is the **single source of truth** (`TOOLS`, 31 curated tools, each with display + learning + scraping/`keywords` fields).
- `seed.py` imports it as `SEED_TOOLS`.
- `scoring.py` derives `TOOL_REGISTRY` + regex patterns from it.
- `scheduler.py` Step 0 no longer creates rows (only warns).
- `seed.reconcile_catalog(db)` runs every startup and deletes any `tools` row not in the catalog → purged the 23; DB went **54 → 31**, zero nulls.
- Add/edit/remove a tool = edit `catalog.py` only. `category` must match a `Domain` name in `SEED_DOMAINS`.

Result leaderboard (live): React 76.4 (Mature), TensorFlow 74.1, Hugging Face 72.7, Kubernetes, Next.js, **Ollama 71.7 / 176k★ (was 0)**, LangChain, Go, PyTorch, Rust, Supabase, Docker…

## 5. Known issue / recommended NEXT task — the "mentions" signal is weak

After a live scrape, nearly every tool shows `mentions = 0`. The GitHub half of scoring works; the **developer-conversation half doesn't register.** Causes (all in `scoring.py` / `scheduler.py`):
1. **Rounding sink (real bug).** Groq off → every mention weighted `0.5` (neutral) → `round(0.5) = 0` in `scheduler.py` (~line 239). Single/double mentions per cycle are silently dropped. Fix: `math.ceil` for any positive weighted value, store the float, or raise the neutral weight.
2. **Dev.to `description` ignored.** `count_weighted_mentions` matches only `title + tag_list + subreddit`. Feed in `description` for a big signal gain.
3. **Thin volume** — one ~170-item snapshot; HN is title-only. Mentions do accumulate across cycles in `ToolSnapshot.mention_count`.

The matcher itself is correct (`classify_text_to_tools` tagged rust/react/ollama/kubernetes in a live test). **Owner was asked "want me to fix this now?" — awaiting the go-ahead.** This is the highest-value work for the "what people are talking about" promise.

Other candidate next steps (owner's broader direction): cinematic polish for **Trends / Compare / tool-detail** surfaces to match landing+explore; real rising/falling **trend arrows + sparklines** (needs time-series accumulation — snapshots exist); make the board **interactive** (filters, watchlist wiring).

## 6. Current running state

- **Backend:** `uvicorn` on `127.0.0.1:8000`, started with `RUN_SCRAPER_INLINE=1` (30-min live scrape loop ON, token active). Launched via `backend/venv/Scripts/python.exe`. Logs → `backend/logs/dev-uvicorn.out` (+ utf-8 `stackradar.log`).
- **Frontend:** `npm run dev` (Next 16 / Turbopack) on `localhost:3000`.
- Both are background processes from this session; a fresh session may need to restart them (they are not daemonized).
- SQLite dev DB `backend/test.db` holds the 31 clean tools with live data.

## 7. Hard constraints (do not break)

- **No API keys/secrets in git, ever.** Keys live only in gitignored `backend/.env` / `frontend/.env.local`.
- **All frontend data via `frontend/src/data/trends.ts`** — no hardcoded tool/score/roadmap data in components.
- **Keep Clerk auth** (`<ClerkProvider>` in `layout.tsx`).
- **`docker-compose up --build` must stay the canonical local run.**
- App must still **boot with empty `GITHUB_TOKEN`/`GROQ_API_KEY`** (degraded, not crashing).

## 8. Pointers

- Durable architecture + commands + gotchas: **`CLAUDE.md`**.
- Owner decisions / positioning: **`memory/stackradar-direction.md`**.
- Data-integrity history (now FIXED): **`memory/stackradar-data-integrity.md`**.
- API surface: single router `backend/app/api/endpoints/mvp.py` under `/api/v1`.
- No test suite exists yet.
