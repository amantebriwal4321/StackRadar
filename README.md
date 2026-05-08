<h1 align="center">
  🛰️ StackRadar
</h1>

<p align="center">
  <strong>Real-time tech intelligence engine</strong> — tracks 30+ tools across GitHub, HackerNews, Dev.to & Reddit, scored by an AI-powered pipeline.
</p>

<p align="center">
  <img alt="Phase" src="https://img.shields.io/badge/phase-production--ready-brightgreen" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-FastAPI-009688" />
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Next.js_16-black" />
  <img alt="DB" src="https://img.shields.io/badge/database-PostgreSQL-336791" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## 🎯 What is StackRadar?

StackRadar automatically monitors the developer ecosystem every 30 minutes, fetching signals from:

- ⭐ **GitHub** — Stars, forks, open issues, growth rate
- 🟠 **HackerNews** — Front-page mentions with sentiment
- 📝 **Dev.to** — Article mentions with engagement
- 🔴 **Reddit** — r/programming hot post mentions
- 📰 **Tech News** — TechCrunch, Ars Technica, The Verge RSS feeds

Each tool gets a **composite score (0–100)** based on weighted signals, with AI-generated recommendations and learning priority classification.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  Frontend                     │
│        Next.js 16 + Tailwind + Recharts      │
│                 :3000                         │
└─────────────────┬────────────────────────────┘
                  │ REST API
┌─────────────────▼────────────────────────────┐
│                 Backend                       │
│          FastAPI + SQLAlchemy                 │
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
| **Dashboard** (`/`) | Tool cards with scores, search bar, category filters, "Last Updated" indicator |
| **Trends** (`/trends`) | Bar chart of all tool scores + compact cards |
| **Compare** (`/compare`) | Side-by-side comparison of 2–5 tools with metrics table + history overlay chart |
| **Explore** (`/explore`) | Domain-level view with expandable tool lists |
| **Roadmaps** (`/roadmaps`) | Curated learning roadmaps (e.g. "Become a DevOps Engineer") |
| **Tool Detail** (`/tools/[slug]`) | Deep-dive with history chart, sentiment, GitHub stats |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/your-username/StackRadar.git
cd StackRadar

# Add your API keys
cp backend/.env.example backend/.env
# Edit backend/.env with your GITHUB_TOKEN and GROQ_API_KEY

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

# Create .env file with your keys
# GITHUB_TOKEN=ghp_...
# GROQ_API_KEY=gsk_...

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token for API calls |
| `GROQ_API_KEY` | ✅ | Groq API key for sentiment analysis |
| `DATABASE_URL` | ❌ | PostgreSQL URL (auto-set by Docker; defaults to SQLite) |
| `ADMIN_API_KEY` | ❌ | Secret key for `POST /admin/scrape` manual trigger |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ❌ | Backend URL (defaults to `http://localhost:8000`) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tools` | All tools (paginated: `?page=1&per_page=20`) |
| `GET` | `/api/v1/tools/compare?slugs=react,rust` | Compare 2–5 tools side by side |
| `GET` | `/api/v1/tools/{slug}` | Tool detail with decision intelligence |
| `GET` | `/api/v1/tools/{slug}/history` | 30-day time-series data |
| `GET` | `/api/v1/domains` | Domain-level summaries |
| `GET` | `/api/v1/roadmaps` | All learning roadmaps |
| `GET` | `/api/v1/status` | Scraper status with real-time progress |
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/admin/scrape` | Manual scrape trigger (requires `X-Admin-Key`) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide Icons |
| **Backend** | Python 3.10, FastAPI, SQLAlchemy, Alembic, Pydantic |
| **AI/ML** | Groq LLM (Llama 3) for batch sentiment analysis |
| **Data Sources** | GitHub API, HackerNews Firebase API, Dev.to API, Reddit RSS, News RSS |
| **Database** | PostgreSQL 15 (production), SQLite (development) |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions CI |

---

## 📂 Project Structure

```
StackRadar/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/mvp.py   # All API routes
│   │   ├── core/config.py         # Settings & env vars
│   │   ├── db/                    # SQLAlchemy session & base
│   │   ├── models/all_models.py   # Tool, Domain, Snapshot, Roadmap
│   │   └── services/
│   │       ├── scheduler.py       # Background scraper loop
│   │       ├── scraper.py         # Data fetching from sources
│   │       ├── scoring.py         # Score calculation engine
│   │       └── seed.py            # Initial data seeding
│   ├── alembic/                   # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js pages (/, /trends, /compare, etc.)
│   │   ├── components/            # Navbar, Sidebar, TrendCard, ChartContainer
│   │   └── data/trends.ts         # API client & TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .github/workflows/ci.yml
└── CHANGELOG.md
```

---

## 🧪 Development

```bash
# Run backend tests (if added)
cd backend && python -m pytest

# Lint backend
pip install ruff
ruff check app/

# Type-check frontend
cd frontend && npx tsc --noEmit

# Run Alembic migrations
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of all changes with rationale and benefits.

---

## 📜 License

MIT — see [LICENSE](./LICENSE) for details.
