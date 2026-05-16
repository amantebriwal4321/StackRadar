# ANTIGRAVITY AGENT INSTRUCTIONS — StackRadar
# Place this file at the root of the StackRadar repo as: ANTIGRAVITY.md
# Antigravity reads this file automatically on project open.

---

## WHO YOU ARE

You are a senior full-stack engineer working on **StackRadar** — a real-time tech intelligence engine
that tracks 40+ developer tools across GitHub, HackerNews, Dev.to, Reddit, and RSS feeds,
scores them 0–100, and shows developers what technologies are trending.

Your job is to upgrade this codebase from a working prototype to a **production-ready product**.
Execute all 5 phases below in order. Do not skip phases. Do not move to a later phase until
the current phase's acceptance criteria all pass.

---

## PROJECT STRUCTURE

```
StackRadar/
├── backend/                        ← Python FastAPI app
│   ├── app/
│   │   ├── api/mvp.py              ← All API routes (/api/v1/*)
│   │   ├── core/config.py          ← Pydantic settings (env vars)
│   │   ├── db/session.py           ← SQLAlchemy session
│   │   ├── models/                 ← SQLAlchemy DB models
│   │   └── services/
│   │       ├── scraper.py          ← GitHub/HN/DevTo/Reddit scrapers ← BROKEN
│   │       ├── scoring.py          ← Scoring engine ← NEEDS REWRITE
│   │       ├── scheduler.py        ← Background scraping loop
│   │       └── seed.py             ← Initial DB seed data
│   ├── alembic/                    ← DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                       ← Next.js 16 + TypeScript
│   └── src/app/
│       ├── explore/                ← HARDCODED — must become dynamic
│       ├── roadmaps/               ← HARDCODED — must become dynamic
│       ├── tools/                  ← Tool detail pages
│       ├── trends/                 ← Works, shows domain data
│       └── compare/                ← Tool comparison page
│   └── src/data/
│       ├── languages.ts            ← DELETE THIS — hardcoded tool list
│       └── roadmaps.ts             ← DELETE THIS — hardcoded roadmaps
├── infrastructure/kubernetes/
├── docker-compose.yml
└── ANTIGRAVITY.md                  ← This file
```

---

## ENVIRONMENT VARIABLES REQUIRED

Before starting, ensure these exist in `.env` (backend) and are NOT committed to git:

```bash
# backend/.env
GITHUB_TOKEN=ghp_xxxx          # GitHub Personal Access Token (classic), needs repo:read scope
GROQ_API_KEY=gsk_xxxx          # Groq API key for LLM sentiment analysis
DATABASE_URL=postgresql://...  # Postgres connection string (or leave blank for SQLite dev)
SECRET_KEY=your-secret-here    # FastAPI secret key

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxx
CLERK_SECRET_KEY=sk_xxxx
```

If any of these are missing, STOP and print a clear message listing exactly which env vars
are absent before proceeding.

---

## TECH STACK (DO NOT CHANGE UNLESS NOTED)

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | Next.js 16, React 19, TypeScript        |
| Styling     | Tailwind CSS 4, Framer Motion           |
| UI          | Shadcn/UI, Recharts, Lucide React       |
| Auth        | Clerk (@clerk/nextjs)                   |
| Backend     | FastAPI, Python 3.10+, Uvicorn          |
| ORM         | SQLAlchemy 2.x, Alembic                 |
| Validation  | Pydantic v2                             |
| HTTP        | httpx (async)                           |
| LLM         | Groq API (llama-3.3-70b-versatile)     |
| Database    | SQLite (dev) / PostgreSQL 15 (prod)     |
| Containers  | Docker + Docker Compose                 |
| Orchestrate | Kubernetes (infra/kubernetes/)          |

---

## PHASE 1 — DATA PIPELINE HARDENING
### Goal: Reliable, real data for 40+ individual tools (not just broad domains)

---

### TASK-001: Fix GitHub Scraper Rate Limiting
**File:** `backend/app/services/scraper.py`

**The problem:** The scraper uses unauthenticated `/search/repositories` with 1-2s sleep intervals.
This hits GitHub's 10 req/min unauthenticated limit within minutes, causing silent 403 failures.

**What to do:**
1. In `backend/app/core/config.py`, add `GITHUB_TOKEN: str` to the Pydantic Settings class.
   Raise `ValueError` on startup if it's empty.
2. In `scraper.py`, add `Authorization: Bearer {settings.GITHUB_TOKEN}` to all GitHub request headers.
3. After every GitHub API response, read the `X-RateLimit-Remaining` header.
   If remaining < 10, sleep for 60 seconds before the next request.
4. Wrap every GitHub request in try/except. On 403 or 429:
   - Log: `WARNING: GitHub rate limit hit, sleeping 60s`
   - Sleep 60s, retry once, then skip and continue (do NOT crash the loop).
5. Replace broad `/search/repositories?q=topic:react` queries with targeted queries
   for specific repos using the TOOL_REGISTRY you'll define in TASK-002.

**Acceptance criteria:**
- Run `docker-compose up` with a valid GITHUB_TOKEN for 2 hours. Zero 403 errors in logs.
- At least 30 tools show non-zero `github_stars` in the database after one full cycle.

---

### TASK-002: Rewrite Scoring Engine — Tool-Level (not Domain-Level)
**File:** `backend/app/services/scoring.py`

**The problem:** `classify_text_to_domains()` uses naive substring matching, mapping everything
to broad domains like "AI/ML" or "WebDev". React and Angular get the same score bucket.

**What to do:**

1. Create a `TOOL_REGISTRY` dict at the top of `scoring.py`. Include at minimum these 40 tools:

```python
TOOL_REGISTRY = {
    # Frontend
    "react":      {"repo": "facebook/react",           "keywords": ["react", "reactjs", "react.js"], "domain": "frontend"},
    "vue":        {"repo": "vuejs/vue",                 "keywords": ["vue", "vuejs", "vue.js"],       "domain": "frontend"},
    "angular":    {"repo": "angular/angular",           "keywords": ["angular", "angularjs"],         "domain": "frontend"},
    "svelte":     {"repo": "sveltejs/svelte",           "keywords": ["svelte", "sveltekit"],          "domain": "frontend"},
    "nextjs":     {"repo": "vercel/next.js",            "keywords": ["next.js", "nextjs"],            "domain": "frontend"},
    # Backend
    "fastapi":    {"repo": "tiangolo/fastapi",          "keywords": ["fastapi", "fast api"],          "domain": "backend"},
    "django":     {"repo": "django/django",             "keywords": ["django"],                       "domain": "backend"},
    "express":    {"repo": "expressjs/express",         "keywords": ["express", "expressjs"],         "domain": "backend"},
    "nestjs":     {"repo": "nestjs/nest",               "keywords": ["nestjs", "nest.js"],            "domain": "backend"},
    "laravel":    {"repo": "laravel/laravel",           "keywords": ["laravel"],                      "domain": "backend"},
    # Languages
    "rust":       {"repo": "rust-lang/rust",            "keywords": ["rust", "rustlang"],             "domain": "languages"},
    "go":         {"repo": "golang/go",                 "keywords": ["golang", "go lang"],            "domain": "languages"},
    "typescript": {"repo": "microsoft/TypeScript",      "keywords": ["typescript", "ts"],             "domain": "languages"},
    "python":     {"repo": "python/cpython",            "keywords": ["python", "py"],                 "domain": "languages"},
    "kotlin":     {"repo": "JetBrains/kotlin",          "keywords": ["kotlin"],                       "domain": "languages"},
    # AI/ML
    "pytorch":    {"repo": "pytorch/pytorch",           "keywords": ["pytorch", "torch"],             "domain": "ai_ml"},
    "tensorflow": {"repo": "tensorflow/tensorflow",     "keywords": ["tensorflow", "tf"],             "domain": "ai_ml"},
    "langchain":  {"repo": "langchain-ai/langchain",    "keywords": ["langchain"],                    "domain": "ai_ml"},
    "huggingface":{"repo": "huggingface/transformers",  "keywords": ["huggingface", "transformers"],  "domain": "ai_ml"},
    "openai":     {"repo": "openai/openai-python",      "keywords": ["openai", "chatgpt", "gpt-4"],   "domain": "ai_ml"},
    # DevOps / Cloud
    "docker":     {"repo": "docker/compose",            "keywords": ["docker", "dockerfile"],         "domain": "devops"},
    "kubernetes": {"repo": "kubernetes/kubernetes",     "keywords": ["kubernetes", "k8s"],            "domain": "devops"},
    "terraform":  {"repo": "hashicorp/terraform",       "keywords": ["terraform"],                    "domain": "devops"},
    "github_actions": {"repo": "actions/runner",        "keywords": ["github actions", "gh actions"], "domain": "devops"},
    "prometheus": {"repo": "prometheus/prometheus",     "keywords": ["prometheus"],                   "domain": "devops"},
    # Databases
    "postgresql": {"repo": "postgres/postgres",         "keywords": ["postgresql", "postgres"],       "domain": "databases"},
    "redis":      {"repo": "redis/redis",               "keywords": ["redis"],                        "domain": "databases"},
    "mongodb":    {"repo": "mongodb/mongo",             "keywords": ["mongodb", "mongo"],             "domain": "databases"},
    "supabase":   {"repo": "supabase/supabase",         "keywords": ["supabase"],                     "domain": "databases"},
    "prisma":     {"repo": "prisma/prisma",             "keywords": ["prisma"],                       "domain": "databases"},
    # Mobile
    "react_native":{"repo": "facebook/react-native",   "keywords": ["react native"],                 "domain": "mobile"},
    "flutter":    {"repo": "flutter/flutter",           "keywords": ["flutter", "dart"],              "domain": "mobile"},
    "swift":      {"repo": "apple/swift",               "keywords": ["swift", "swiftui"],             "domain": "mobile"},
    # Testing
    "jest":       {"repo": "jestjs/jest",               "keywords": ["jest", "jestjs"],               "domain": "testing"},
    "playwright": {"repo": "microsoft/playwright",      "keywords": ["playwright"],                   "domain": "testing"},
    "vitest":     {"repo": "vitest-dev/vitest",         "keywords": ["vitest"],                       "domain": "testing"},
    # Web3
    "solidity":   {"repo": "ethereum/solidity",         "keywords": ["solidity", "ethereum"],         "domain": "web3"},
    # Tooling
    "vite":       {"repo": "vitejs/vite",               "keywords": ["vite", "vitejs"],               "domain": "tooling"},
    "bun":        {"repo": "oven-sh/bun",               "keywords": ["bun", "bunjs"],                 "domain": "tooling"},
    "deno":       {"repo": "denoland/deno",             "keywords": ["deno"],                         "domain": "tooling"},
    "graphql":    {"repo": "graphql/graphql-js",        "keywords": ["graphql"],                      "domain": "api"},
}
```

2. Rewrite `calculate_tool_score(tool_slug: str, metrics: dict) -> float`:
   - Input: `metrics = { github_stars_delta: int, mention_count: int, sentiment_score: float }`
   - Weighted formula:
     ```
     score = (
         github_weight   * normalize(github_stars_delta, 0, 5000) * 100 +
         mention_weight  * normalize(mention_count, 0, 200) * 100 +
         sentiment_weight * ((sentiment_score + 1) / 2) * 100
     )
     # weights: github=0.40, mention=0.45, sentiment=0.15
     ```
   - Clamp final score to [0, 100], round to 1 decimal.

3. Ensure the `Tool` SQLAlchemy model has columns: `slug`, `name`, `domain`, `score`,
   `github_stars`, `mention_count`, `sentiment_score`, `last_updated`.
   Write an Alembic migration if columns are missing.

4. Keep `DomainAggregate` table for the existing Trends page — compute it as the
   average score of all tools in a domain after tool scores are updated.

**Acceptance criteria:**
- `GET /api/v1/tools` returns JSON array with 40+ items, each having a unique `score`.
- React score != Angular score.
- `GET /api/v1/trends` still works (domain aggregates).

---

### TASK-003: Implement Time-Series Snapshots
**Files:** `backend/app/models/`, `backend/alembic/`, `backend/app/services/scheduler.py`, `backend/app/api/mvp.py`

**The problem:** No historical data is stored. `growth: []` is returned empty by all endpoints.
All Recharts charts on the frontend render blank.

**What to do:**

1. Create a new SQLAlchemy model `ToolSnapshot`:
```python
class ToolSnapshot(Base):
    __tablename__ = "tool_snapshots"
    id              = Column(Integer, primary_key=True)
    tool_id         = Column(Integer, ForeignKey("tools.id"), nullable=False, index=True)
    recorded_at     = Column(DateTime, default=datetime.utcnow, index=True)
    score           = Column(Float)
    github_stars_delta = Column(Integer, default=0)
    mention_count   = Column(Integer, default=0)
    sentiment_score = Column(Float, default=0.0)
```

2. Write Alembic migration: `alembic revision --autogenerate -m "add_tool_snapshots"`
   then `alembic upgrade head`.

3. In `scheduler.py`, after every successful scoring cycle, call:
```python
async def save_snapshots(db: Session, tool_scores: list[dict]):
    for tool in tool_scores:
        snapshot = ToolSnapshot(
            tool_id=tool["id"],
            score=tool["score"],
            github_stars_delta=tool["github_stars_delta"],
            mention_count=tool["mention_count"],
            sentiment_score=tool["sentiment_score"],
        )
        db.add(snapshot)
    db.commit()
```

4. Add endpoint to `mvp.py`:
```python
@router.get("/tools/{tool_id}/history")
async def get_tool_history(tool_id: int, days: int = 30, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    snapshots = db.query(ToolSnapshot)\
        .filter(ToolSnapshot.tool_id == tool_id, ToolSnapshot.recorded_at >= since)\
        .order_by(ToolSnapshot.recorded_at.asc())\
        .all()
    return [{"date": s.recorded_at.isoformat(), "score": s.score} for s in snapshots]
```

**Acceptance criteria:**
- After 2 full scraping cycles, `GET /api/v1/tools/1/history?days=30` returns ≥2 data points.
- `GET /api/v1/tools/1/history?days=7` and `?days=365` both work correctly.

---

### TASK-004: LLM Sentiment Analysis via Groq
**File:** `backend/app/services/scoring.py`

**The problem:** Sentiment is naive keyword counting. "Why React is terrible" scores positively for React.

**What to do:**

1. Add `GROQ_API_KEY: str` to Pydantic Settings. Fallback gracefully to neutral (0.0) if absent.

2. After each scraping cycle, collect up to 20 text snippets per tool (HN titles, Reddit post titles, Dev.to article titles that mention the tool's keywords).

3. Batch ALL snippets for ALL tools into ONE Groq API call:
```python
from groq import Groq

async def batch_sentiment(snippets_by_tool: dict[str, list[str]]) -> dict[str, float]:
    """Returns {tool_slug: sentiment_score} where score is -1.0 to 1.0"""
    client = Groq(api_key=settings.GROQ_API_KEY)
    prompt = """For each item below, return ONLY a JSON object mapping the tool name to a
sentiment score from -1.0 (very negative) to 1.0 (very positive).
Base the score on how the community feels about the tool in the given text.
Do not explain. Return only valid JSON.

Items:
""" + "\n".join([f"- [{tool}]: {'; '.join(texts[:5])}" for tool, texts in snippets_by_tool.items()])

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
    )
    import json
    return json.loads(response.choices[0].message.content)
```

4. Store result in `Tool.sentiment_score` and include in scoring formula.
5. Wrap entire Groq call in try/except — on any error, log warning and use 0.0 for sentiment.

**Acceptance criteria:**
- Groq API failure does NOT crash the scraper loop.
- `GET /api/v1/tools` shows `sentiment_score` field with values between -1.0 and 1.0.

---

## PHASE 2 — FRONTEND DATA DECOUPLING
### Goal: Zero hardcoded data in any frontend TypeScript file

---

### TASK-005: Remove Hardcoded Explore / Technology Map
**Files:** `frontend/src/app/explore/page.tsx`, `frontend/src/data/languages.ts`

**What to do:**

1. ARCHIVE `frontend/src/data/languages.ts` → move to `frontend/src/data/legacy/languages.ts.bak`
   (keep for reference, do not import it anywhere).

2. In `frontend/src/app/explore/page.tsx`:
   - Replace static data with a `fetch` call to `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tools`.
   - Group tools by domain using the `domain` field returned by the API.
   - Show a loading skeleton (`<Skeleton>` from Shadcn/UI) while fetching.
   - Show a graceful error state if the API call fails.

3. Verify: Add a test tool via `POST /api/v1/admin/tools` — it must appear on Explore page
   after the next scraping cycle WITHOUT any frontend code change.

**Acceptance criteria:**
- No import from `languages.ts` anywhere in the codebase (`grep -r "languages" frontend/src` returns nothing relevant).
- Explore page renders tools fetched from the backend.
- Loading state is visible for at least 200ms on slow connections (add artificial delay in dev to verify).

---

### TASK-006: Remove Hardcoded Roadmaps
**Files:** `frontend/src/data/roadmaps.ts`, `frontend/src/app/roadmaps/`, `backend/`

**What to do (backend):**

1. Create two SQLAlchemy models:

```python
class Roadmap(Base):
    __tablename__ = "roadmaps"
    id          = Column(Integer, primary_key=True)
    tool_id     = Column(Integer, ForeignKey("tools.id"), nullable=True)
    title       = Column(String, nullable=False)
    description = Column(Text)
    updated_at  = Column(DateTime, default=datetime.utcnow)
    stages      = relationship("RoadmapStage", back_populates="roadmap", order_by="RoadmapStage.order")

class RoadmapStage(Base):
    __tablename__ = "roadmap_stages"
    id          = Column(Integer, primary_key=True)
    roadmap_id  = Column(Integer, ForeignKey("roadmaps.id"), nullable=False)
    order       = Column(Integer, nullable=False)
    title       = Column(String, nullable=False)
    description = Column(Text)
    resources   = Column(JSON)  # [{"title": str, "url": str, "type": "video|article|docs"}]
```

2. Write Alembic migration.

3. Write a one-time seed script `backend/app/services/seed_roadmaps.py` that reads the existing
   hardcoded data from `frontend/src/data/roadmaps.ts` (parse it as text), extracts each roadmap,
   and inserts it into the DB. Run this script ONCE on startup if `roadmaps` table is empty.

4. Add endpoints to `mvp.py`:
   - `GET /api/v1/roadmaps` → list all roadmaps (id, title, description, tool_id)
   - `GET /api/v1/roadmaps/{id}` → full roadmap with stages and resources

**What to do (frontend):**
5. In `frontend/src/app/roadmaps/page.tsx`, replace static import with fetch to `/api/v1/roadmaps`.
6. In `frontend/src/app/roadmap/[id]/page.tsx`, fetch from `/api/v1/roadmaps/{id}`.
7. Archive `frontend/src/data/roadmaps.ts` → `frontend/src/data/legacy/roadmaps.ts.bak`.

**Acceptance criteria:**
- No import from `roadmaps.ts` anywhere.
- All existing roadmaps still visible in UI (seeded from old static data).
- Updating a roadmap title via direct DB query shows updated title on page refresh (no deploy).

---

### TASK-007: Populate Historical Charts in Frontend
**File:** `frontend/src/app/tools/[id]/page.tsx` (or wherever the tool detail chart lives)

**What to do:**
1. Find where `growth: []` is used. Replace with a fetch to `/api/v1/tools/{id}/history?days=30`.
2. Add three toggle buttons: `30d | 90d | 365d`. On click, re-fetch with the corresponding `?days=` param.
3. Pass the returned array to the Recharts `<LineChart>` component.
4. Handle empty state (fewer than 2 data points):
   Show: `"📡 Still collecting data — check back in a few hours."`
5. Handle loading state with a Recharts skeleton or spinner.

**Acceptance criteria:**
- Tool detail page shows a line chart with real data after 2+ scraping cycles.
- Toggling 30d/90d/365d changes the chart data without a full page reload.

---

## PHASE 3 — SECURITY & PRODUCTION HYGIENE

---

### TASK-008: Secrets & Environment Audit

**What to do:**
1. Run: `git log --all --full-history -- '**/.env*'` — if any `.env` files with real keys
   exist in git history, warn the user and provide instructions to purge with `git filter-repo`.
2. Verify `.gitignore` contains: `.env`, `.env.local`, `.env.*.local`, `*.env`
3. In `backend/app/core/config.py`, ensure the Pydantic `Settings` class uses
   `model_config = SettingsConfigDict(env_file=".env")` and all required fields
   have no default value (so startup fails loudly if they're missing).
4. Add `.env.example` files at both `backend/.env.example` and `frontend/.env.example`
   with placeholder values only (never real keys).
5. Add to `backend/app/main.py` startup: log which env vars are loaded (names only, NOT values).

**Acceptance criteria:**
- Starting the backend without `GITHUB_TOKEN` set raises a `ValidationError` immediately.
- No real API keys in any committed file (`git grep -i "ghp_\|gsk_\|sk_live"` returns nothing).

---

### TASK-009: API Rate Limiting & CORS Hardening
**File:** `backend/app/main.py`

**What to do:**
1. Install `slowapi`: add `slowapi` to `requirements.txt`.
2. Add rate limiter middleware:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Then on public endpoints:
@router.get("/tools")
@limiter.limit("60/minute")
async def get_tools(request: Request, ...):
```
3. Change CORS `allow_origins` to use `settings.ALLOWED_ORIGINS` (a list from env).
   In dev: `["http://localhost:3000"]`. In prod: `["https://stack-radar.vercel.app"]`.
   Never use `["*"]` in production.

**Acceptance criteria:**
- Sending 61 requests/minute to `/api/v1/tools` from the same IP returns HTTP 429 on the 61st.
- `OPTIONS` preflight from `http://malicious.com` returns 403.

---

### TASK-010: Database Connection Pooling
**File:** `backend/app/db/session.py`

**What to do:**
Replace the default engine config with:
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,   # Detect and recycle stale connections
    echo=settings.DEBUG,  # Log SQL only in debug mode
)
```

---

## PHASE 4 — INFRASTRUCTURE & OBSERVABILITY

---

### TASK-011: Structured Logging
**Files:** `backend/app/main.py`, `backend/app/services/scheduler.py`

**What to do:**
1. Add `loguru` to `requirements.txt`.
2. Replace all `print()` and `logging.basicConfig()` calls with `from loguru import logger`.
3. In `scheduler.py`, log at the end of every scraping cycle:
```python
logger.info("Scraping cycle complete", extra={
    "tools_processed": len(tool_scores),
    "errors": error_count,
    "duration_ms": elapsed_ms,
    "snapshots_written": len(snapshots),
})
```
4. In production (when `settings.ENV == "production"`), output JSON format:
```python
logger.add(sys.stdout, format="{time} {level} {message}", serialize=True)
```

---

### TASK-012: Health & Readiness Endpoints
**File:** `backend/app/api/mvp.py`

**What to do:**
Add two endpoints that Kubernetes uses for liveness/readiness probes:

```python
@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Check DB connection
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    last_scrape = db.query(ToolSnapshot)\
        .order_by(ToolSnapshot.recorded_at.desc())\
        .first()

    return {
        "status": "ok",
        "db": db_status,
        "last_scrape": last_scrape.recorded_at.isoformat() if last_scrape else None,
        "version": "1.0.0"
    }

@router.get("/ready")
async def readiness_check(db: Session = Depends(get_db)):
    tool_count = db.query(Tool).count()
    if tool_count < 10:
        raise HTTPException(status_code=503, detail="Not enough tools seeded yet")
    return {"ready": True, "tools": tool_count}
```

Update `infrastructure/kubernetes/deployment.yaml` liveness and readiness probes to use these endpoints.

---

### TASK-013: CI/CD GitHub Actions
**Files:** `.github/workflows/`

**What to do:**
Create or update these workflow files:

**`.github/workflows/backend.yml`:**
```yaml
name: Backend CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest tests/ -v
      - run: cd backend && python -m mypy app/ --ignore-missing-imports
  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest
```

**`.github/workflows/frontend.yml`:**
```yaml
name: Frontend CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

---

## PHASE 5 — UX & RETENTION

---

### TASK-014: User Watchlist
**Files:** Backend models + API, `frontend/src/app/` tool cards

**Backend — What to do:**
1. Create `Watchlist` model:
```python
class Watchlist(Base):
    __tablename__ = "watchlists"
    id       = Column(Integer, primary_key=True)
    user_id  = Column(String, nullable=False, index=True)  # Clerk user ID
    tool_id  = Column(Integer, ForeignKey("tools.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "tool_id"),)
```

2. Add endpoints (all require Clerk JWT verification via a `get_current_user` dependency):
   - `GET /api/v1/users/watchlist` → list user's watched tools with current scores
   - `POST /api/v1/users/watchlist` → body: `{"tool_id": int}` → add to watchlist
   - `DELETE /api/v1/users/watchlist/{tool_id}` → remove from watchlist

3. Clerk JWT verification middleware in FastAPI:
```python
from clerk_backend_api import Clerk
clerk = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)

async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    # Verify with Clerk SDK or via JWKS endpoint
    ...
    return user_id
```

**Frontend — What to do:**
4. On every tool card in Explore and tool detail page, add a heart/bookmark icon.
5. On click (if logged in): call `POST /api/v1/users/watchlist`.
6. If not logged in: redirect to Clerk sign-in.
7. Add a "My Watchlist" tab or section on the user profile/dashboard page showing
   score delta since tool was added: `"React +5pts since you started watching (3 days ago)"`

**Acceptance criteria:**
- Unauthenticated request to `/api/v1/users/watchlist` returns HTTP 401.
- Authenticated user can add/remove tools. Persists across sessions.

---

### TASK-015: SEO — Tool Page Metadata
**File:** `frontend/src/app/tools/[id]/page.tsx`

**What to do:**
Use Next.js `generateMetadata()` for all dynamic tool pages:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = await fetchTool(params.id);
  return {
    title: `${tool.name} — Momentum Score ${tool.score}/100 | StackRadar`,
    description: `${tool.name} has a real-time momentum score of ${tool.score}/100 based on GitHub activity, developer community sentiment, and tech news.`,
    openGraph: {
      title: `${tool.name} — ${tool.score}/100 on StackRadar`,
      description: `Track ${tool.name}'s real-time trend across GitHub, HackerNews, Dev.to, and Reddit.`,
      type: "website",
    },
  };
}
```

Also add `robots.txt` and `sitemap.xml`:
- `frontend/src/app/robots.txt` — allow all, point to sitemap
- `frontend/src/app/sitemap.ts` — dynamically generate from tool list via API

---

## EXECUTION RULES FOR THE AGENT

1. **Run tests after each task.** If a task introduces a failing test or breaks an existing endpoint,
   fix it before moving to the next task. Never skip a broken test.

2. **One Alembic migration per database schema change.** Never modify `Base.metadata.create_all()`
   to bypass Alembic — always generate a proper migration file.

3. **Never delete, only archive.** When removing hardcoded data files, move them to `legacy/` folders.
   Do not `git rm` them until Phase 5 is complete and verified.

4. **Ask before external service calls.** Before making any call that consumes API credits
   (Groq, GitHub authenticated), confirm the credentials are properly set in `.env`.

5. **Preserve the Trends page.** `GET /api/v1/trends` must continue to work throughout all phases.
   The Trends page is the only fully working feature. Do not break it.

6. **Log everything.** Use structured logging (loguru) for every scraping cycle. The logs are how
   we verify the pipeline is working without hitting the database directly.

7. **Docker Compose is the source of truth.** After each phase, verify `docker-compose up --build`
   starts cleanly with zero errors and the frontend loads at `http://localhost:3000`.

8. **Commit after each task.** Use conventional commit format:
   - `fix: resolve GitHub API rate limiting in scraper.py (TASK-001)`
   - `feat: add tool-level scoring with TOOL_REGISTRY (TASK-002)`
   - `feat: add ToolSnapshot model and history endpoint (TASK-003)`

---

## DONE WHEN

All 5 phases are complete and ALL of the following are true:

- [ ] `docker-compose up --build` starts cleanly (zero errors)
- [ ] `GET /api/v1/tools` returns 40+ tools, each with a unique non-zero score
- [ ] `GET /api/v1/tools/1/history?days=30` returns ≥2 data points after 2 scraping cycles
- [ ] `GET /api/v1/trends` still works (domain aggregates)
- [ ] `GET /api/v1/roadmaps` returns roadmaps from the database
- [ ] `GET /api/v1/health` returns `{ "status": "ok", "db": "connected" }`
- [ ] Frontend Explore page shows tools fetched from API (no hardcoded TypeScript arrays)
- [ ] Frontend Roadmaps page shows roadmaps fetched from API
- [ ] Frontend tool detail page shows a populated Recharts line chart
- [ ] No `.env` files with real keys exist in git history
- [ ] GitHub Actions CI passes on push to main
- [ ] `docker-compose up` for 2 hours produces zero 403 errors from GitHub API
