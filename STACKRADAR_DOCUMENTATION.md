# StackRadar (TechTrends.AI) - Comprehensive Project Documentation

This document provides a deep-dive overview of the entire StackRadar project, outlining its current state, folder structure, technology stack, and running mechanisms. This file serves as a reference for AI assistants (like Claude) to understand the project architecture and help build subsequent features, refactoring, or infrastructure updates.

## 1. Project Overview
**StackRadar** is a real-time tech intelligence engine designed to track the popularity, sentiment, and momentum of over 30 developer tools across various platforms (GitHub, HackerNews, Dev.to, Reddit, and Tech News). It scores tools on a 0-100 scale, classifying them into domains and providing automated recommendations and learning priorities for developers.

## 2. Technology Stack & Languages

### Languages
- **TypeScript**: Used exclusively across the frontend for strict typing.
- **Python (3.10+)**: Used in the backend for data aggregation, API serving, and scheduling.

### Frontend
- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4, Framer Motion (for animations), Lucide React (icons)
- **Components/UI**: Shadcn/UI (Radix UI primitives), Recharts (for data visualization)
- **Authentication**: Clerk (integrated via `@clerk/nextjs`)

### Backend
- **Framework**: FastAPI (high-performance async API)
- **Server**: Uvicorn
- **ORM & Data Validation**: SQLAlchemy, Alembic (migrations), Pydantic (data validation/settings)
- **External APIs & Scraping**: `requests`, `httpx` (async HTTP), `feedparser` (for RSS parsing)
- **AI/Sentiment**: Groq API (utilizing Llama 3 for batch sentiment analysis)

### Database
- **Local/Development**: SQLite
- **Production**: PostgreSQL 15

### Infrastructure & Orchestration
- **Containerization**: Docker (Dockerfiles for both frontend and backend)
- **Local Deployment**: Docker Compose (orchestrates `db`, `backend`, and `frontend` services)
- **Cloud Orchestration**: Kubernetes (Deployment and Service manifests exist for both frontend and backend under `infrastructure/kubernetes`)
- **CI/CD**: GitHub Actions (configured in `.github/workflows`)

## 3. What is Completed Till Now

### Working Features
- **Decoupled Architecture**: The separation of Next.js frontend and FastAPI backend is fully operational with CORS, env variables, and Docker.
- **Background Scraping**: An asynchronous background loop (`run_scraper_loop` in `scheduler.py`) effectively runs every 30 minutes inside the FastAPI backend, detached from user requests.
- **Real-Time Data Ingestion**: The system queries real external APIs (GitHub, HackerNews, Dev.to, Reddit JSON, RSS feeds) instead of relying solely on seed data.
- **Frontend Dashboard (Trends)**: The homepage and `/trends` pages successfully fetch dynamic domain-level aggregated data from backend APIs.

### Areas Needing Improvement (Current Flaws)
- **Fake/Hardcoded Data**: The "Explore" (Technology Map) and "Roadmaps" sections are currently hardcoded in static TypeScript arrays (`languages.ts` and `roadmaps.ts`). They do not utilize backend endpoints.
- **UI "False Promises"**: Features like historical growth are returned as empty arrays (`growth: []`) from the backend, so the Recharts graphs are missing historical trend lines.
- **Scraper Fragility (Rate Limits)**: The GitHub scraper relies on the broad `/search/repositories` API, hitting rate limits (403/401) easily due to short sleep intervals between requests.
- **Scoring Engine Granularity**: The backend currently focuses on broad domains (e.g., "AI/ML") via naive substring matching rather than providing granular insights for specific tools (e.g., "React" vs "Angular").

## 4. How It Is Actually Running

### Local Execution (Docker Compose)
The primary method to run the project is `docker-compose up --build`. This spins up:
1. **db**: A `postgres:15-alpine` container with a persistent volume.
2. **backend**: Builds from `backend/Dockerfile`, runs `uvicorn app.main:app`, and executes the `run_scraper_loop` inline as a background async task.
3. **frontend**: Builds from `frontend/Dockerfile`, passing `NEXT_PUBLIC_API_URL`, exposing the UI on port `3000`.

### Data Flow Execution
1. The FastAPI backend starts and executes `startup_event`. It automatically runs Alembic/SQLAlchemy metadata creation and seeds the database with initial tools/domains.
2. The `scheduler.py` initializes `run_scraper_loop`, reaching out to external data sources.
3. The Groq LLM processes the scraped text for sentiment and the `scoring.py` engine updates the SQLite/PostgreSQL database with the latest metrics.
4. A user visits the Next.js frontend (`localhost:3000`). The Next.js app makes a REST call to `http://localhost:8000/api/v1/trends` to fetch and render the calculated metrics.

### Kubernetes Execution
The `infrastructure/kubernetes/deployment.yaml` specifies a production-ready cloud deployment:
- **Backend Deployment**: 3 replicas, resource limits (cpu: 1000m, memory: 1Gi), relying on ConfigMaps (`stackradar-config`) and Secrets (`stackradar-secrets`).
- **Backend Service**: ClusterIP on port 80 mapping to 8000.
- **Frontend Deployment**: 3 replicas, resource limits (cpu: 500m, memory: 512Mi).
- **Frontend Service**: LoadBalancer on port 80 mapping to 3000 for external traffic.

## 5. Folder Structure

```
TechTrends.AI/
├── .github/                   # CI/CD workflows
├── backend/                   # Python FastAPI Application
│   ├── alembic/               # Database migrations directory
│   ├── app/
│   │   ├── api/               # API endpoints (e.g., mvp.py for /api/v1 routes)
│   │   ├── core/              # Configuration & Pydantic settings
│   │   ├── db/                # SQLAlchemy session handling & base classes
│   │   ├── models/            # SQLAlchemy database models (Tool, Domain, Snapshot)
│   │   ├── services/          # Core logic (scheduler.py, scraper.py, scoring.py, seed.py)
│   │   └── main.py            # FastAPI application entry point
│   ├── logs/                  # Application log files
│   ├── Dockerfile             # Backend container definition
│   ├── alembic.ini            # Alembic configuration
│   ├── requirements.txt       # Python dependencies
│   └── run_scraper.py         # Script for manual scraper execution
├── frontend/                  # Next.js Application
│   ├── public/                # Static assets
│   ├── src/
│   │   └── app/               # Next.js App Router pages
│   │       ├── compare/       # Tool comparison page
│   │       ├── explore/       # Hardcoded explore page
│   │       ├── roadmap/       # Roadmap layouts
│   │       ├── roadmaps/      # Hardcoded roadmap data
│   │       ├── tools/         # Tool detail pages
│   │       ├── trends/        # Trends dashboard page
│   │       ├── layout.tsx     # Root layout
│   │       └── page.tsx       # Homepage
│   ├── Dockerfile             # Frontend container definition
│   ├── package.json           # Node.js dependencies and scripts
│   ├── tailwind.config.ts / postcss.config.mjs
│   └── tsconfig.json          # TypeScript configuration
├── infrastructure/            # Cloud Infrastructure
│   └── kubernetes/
│       └── deployment.yaml    # K8s manifests for backend & frontend (Deployments & Services)
├── docker-compose.yml         # Local container orchestration
├── PROJECT_STATUS.md          # Internal project status and next steps
└── README.md                  # Public project documentation
```

## 6. Required Documents / Next Steps (For AI Prompts)
To move forward with the project, you can use this document to ask an AI to:
1. **Rewrite `scraper.py`**: Fix the GitHub API rate-limiting issues by using authenticated GraphQL queries and improving sleep intervals.
2. **Database Refactoring Plan**: Move the hardcoded data from `frontend/src/app/roadmaps` and `explore` into the backend PostgreSQL schema.
3. **Time-Series Implementation**: Write the backend logic to save daily chronological snapshots of tool scores so the frontend can populate the `growth: []` arrays for real historical charts.
4. **Scoring Engine Update**: Shift the classification logic from broad substring matching to context-aware tool-level tracking (e.g., scoring React rather than "WebDev").
