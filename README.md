<h1 align="center">
  🛰️ StackRadar
</h1>

<p align="center">
  <strong>Real-time tech intelligence engine</strong> — tracks 54+ tools across GitHub, HackerNews, Dev.to & Reddit, scored by an AI-powered pipeline with user authentication and personal watchlists.
</p>

<p align="center">
  <img alt="Phase" src="https://img.shields.io/badge/phase-production--ready-brightgreen" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-FastAPI-009688" />
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Next.js_16-black" />
  <img alt="Auth" src="https://img.shields.io/badge/auth-Clerk-6C47FF" />
  <img alt="DB" src="https://img.shields.io/badge/database-PostgreSQL-336791" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## 🎯 What is StackRadar?

StackRadar automatically monitors the developer ecosystem every 30 minutes, fetching signals from:

- ⭐ **GitHub** — Stars, forks, open issues, growth rate (authenticated API with rate limit handling)
- 🟠 **HackerNews** — Front-page mentions with sentiment
- 📝 **Dev.to** — Article mentions with engagement
- 🔴 **Reddit** — r/programming hot post mentions
- 📰 **Tech News** — TechCrunch, Ars Technica, The Verge RSS feeds
- 🤖 **AI Sentiment** — Groq LLM (Llama 3) analyzes community sentiment per tool

Each tool gets a **composite score (0–100)** using logarithmic normalization weighted by GitHub Stars (45%), Forks (20%), and community mentions (5% per source), with AI-generated recommendations and learning priority classification.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  Frontend                     │
│    Next.js 16 + Tailwind + Recharts + Clerk  │
│           ISR Caching (30 min)               │
│                 :3000                         │
└─────────────────┬────────────────────────────┘
                  │ REST API
┌─────────────────▼────────────────────────────┐
│                 Backend                       │
│     FastAPI + SQLAlchemy + slowapi + loguru   │
│               :8000                           │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Scraper  │ │  Scoring   │ │ Sentiment  │ │
│  │ (30min)  │ │  Engine    │ │ (Groq LLM) │ │
│  └──────────┘ └────────────┘ └────────────┘ │
└─────────────────┬────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────┐
│        PostgreSQL (Docker) / SQLite (Dev)     │
└──────────────────────────────────────────────┘
```

---

## 📸 Pages

| Page | Description |
|------|-------------|
| **Dashboard** (`/`) | Tool cards with scores, search bar, category filters, bookmark buttons |
| **Trends** (`/trends`) | Bar chart of all tool scores + compact cards |
| **Compare** (`/compare`) | Side-by-side comparison of 2–5 tools with metrics table + history overlay chart |
| **Explore** (`/explore`) | Domain-level view with expandable tool lists |
| **Roadmaps** (`/roadmaps`) | Curated learning roadmaps (e.g. "Become a DevOps Engineer") |
| **Tool Detail** (`/tools/[slug]`) | Deep-dive with history chart, sentiment, GitHub stats, SEO metadata |
| **Watchlist** (`/watchlist`) | Personal bookmarked tools (requires sign-in via Clerk) |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/amantebriwal4321/StackRadar.git
cd StackRadar

# Add your API keys
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit both files with your actual keys

# Start everything
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Local Development

**Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate    # Mac/Linux

pip install -r requirements.txt

# Create .env file with your keys (see Environment Variables below)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install

# Create .env.local with your Clerk keys (see Environment Variables below)
npm run dev
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token (classic, `repo:read` scope) |
| `GROQ_API_KEY` | ✅ | Groq API key for LLM sentiment analysis |
| `DATABASE_URL` | ❌ | PostgreSQL URL (auto-set by Docker; defaults to SQLite) |
| `ADMIN_API_KEY` | ❌ | Secret key for `POST /admin/scrape` manual trigger |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ❌ | Backend URL (defaults to `http://localhost:8000`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key from [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tools` | All tools (paginated: `?page=1&per_page=20&category=AI / ML`) |
| `GET` | `/api/v1/tools/compare?slugs=react,rust` | Compare 2–5 tools side by side |
| `GET` | `/api/v1/tools/{slug}` | Tool detail with decision intelligence |
| `GET` | `/api/v1/tools/{slug}/history?days=30` | Time-series score data (30/90/365 days) |
| `GET` | `/api/v1/domains` | Domain-level summaries |
| `GET` | `/api/v1/domains/{slug}/learning-path` | Ordered learning path for a domain |
| `GET` | `/api/v1/roadmaps` | All learning roadmaps |
| `GET` | `/api/v1/roadmaps/{slug}` | Full roadmap with steps and resources |
| `GET` | `/api/v1/status` | Scraper status with real-time progress |
| `GET` | `/api/v1/health` | Health check (DB connectivity + last scrape time) |
| `GET` | `/api/v1/ready` | Readiness probe (503 if < 10 tools seeded) |
| `POST` | `/api/v1/admin/scrape` | Manual scrape trigger (requires `X-Admin-Key` header) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Framer Motion, Lucide Icons |
| **Auth** | Clerk (`@clerk/nextjs`) — Google, email, social login |
| **Caching** | ISR (Incremental Static Regeneration) — 30-minute revalidation |
| **Backend** | Python 3.10, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 |
| **Logging** | Loguru (structured, rotating file logs, JSON in production) |
| **Security** | slowapi rate limiting (60 req/min per IP), CORS hardening |
| **AI/ML** | Groq LLM (Llama 3.3 70B) for batch sentiment analysis |
| **Data Sources** | GitHub API, HackerNews Firebase API, Dev.to API, Reddit RSS, News RSS |
| **Database** | PostgreSQL 15 (production, pooled connections), SQLite (development) |
| **Infrastructure** | Docker, Docker Compose, Kubernetes manifests, GitHub Actions CI |
| **SEO** | Dynamic `generateMetadata()`, `sitemap.xml`, `robots.txt` |

---

## 📂 Project Structure

```
StackRadar/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/mvp.py   # All API routes (tools, domains, roadmaps, health)
│   │   ├── core/config.py         # Pydantic settings & env vars
│   │   ├── db/                    # SQLAlchemy session, base, connection pooling
│   │   ├── models/all_models.py   # Tool, Domain, ToolSnapshot, Roadmap models
│   │   └── services/
│   │       ├── scheduler.py       # Background scraper loop (30-min cycle)
│   │       ├── scraper.py         # GitHub, HN, Dev.to, Reddit, News fetchers
│   │       ├── scoring.py         # TOOL_REGISTRY + logarithmic scoring engine
│   │       └── seed.py            # Initial data seeding (tools, domains, roadmaps)
│   ├── logs/                      # Rotating log files (loguru)
│   ├── alembic/                   # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js pages (/, /trends, /compare, /watchlist, etc.)
│   │   │   ├── sitemap.ts         # Dynamic sitemap for SEO
│   │   │   ├── robots.ts          # robots.txt configuration
│   │   │   └── watchlist/         # User watchlist (Clerk auth required)
│   │   ├── components/            # Navbar, TrendCard, WatchlistButton, ChartContainer
│   │   └── data/trends.ts         # API client & TypeScript types (ISR cached)
│   ├── Dockerfile
│   └── package.json
├── infrastructure/
│   └── kubernetes/deployment.yaml # K8s deployment with health/readiness probes
├── .github/workflows/
│   ├── backend.yml                # Backend CI (lint + Docker build)
│   └── frontend.yml               # Frontend CI (TypeScript + build)
├── docker-compose.yml
├── CHANGELOG.md
└── changelog_2026-05-16.md        # Detailed phase-by-phase changelog
```

---

## 🧪 Development

```bash
# Run backend with hot reload
cd backend && python -m uvicorn app.main:app --reload

# Production build check (frontend)
cd frontend && npm run build

# Type-check frontend
cd frontend && npx tsc --noEmit

# Run Alembic migrations
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the original development history, and [changelog_2026-05-16.md](./changelog_2026-05-16.md) for the Phase 1-5 production upgrade changelog.

---

## 📜 License

MIT — see [LICENSE](./LICENSE) for details.
