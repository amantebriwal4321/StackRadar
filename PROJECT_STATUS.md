# PROJECT_STATUS.md

## Current State

The **StackRadar (TechTrends.AI)** project is currently structured as a full-stack, decoupled application:
- **Frontend**: Built with Next.js (React 19), Tailwind CSS, Recharts, and Framer Motion. It heavily utilizes a modern UI aesthetic with interactive components mimicking a dashboard.
- **Backend**: Built with FastAPI (Python) and SQLAlchemy, utilizing SQLite locally (with a Docker setup prepared for PostgreSQL/Redis/Meilisearch in production).
- **Data Flow**: 
  - An asynchronous background task (`run_scraper_loop` in `scheduler.py`) runs every 30 minutes inside the FastAPI backend.
  - This loop fetches data from 5 external sources (GitHub Search, HackerNews Firebase, Dev.to API, Reddit JSON, Tech News RSS).
  - The fetched text is parsed via keyword string matching (`scoring.py`) and assigned to broad "Domains" (e.g., AI/ML, Web3, Cloud Native). 
  - The aggregate metrics (domain scores, mention counts) are stored in the database.
  - The Next.js frontend calls the `/api/v1/trends` endpoint on load to fetch and display these high-level domain metrics.

## What is Working

- **System Architecture**: The decoupled Next.js + FastAPI setup is fundamentally sound and well-configured (CORS, ENV variables, Docker).
- **Backend Scheduling**: The async background loop successfully executes the data pipeline independently of user requests.
- **Real-Time Data Ingestion**: The backend successfully reaches out to real external APIs to pull dynamic data instead of relying solely on seed data.
- **Frontend Integration (Trends)**: The homepage and Trends overview successfully fetch and display dynamic domain-level data from the backend APIs.

## What is Not Working

- **False Promises in UI**: The frontend maps the backend data but leaves critical fields empty (e.g., `growth: []`). Historical trend lines and data points are absent; it only shows a current "snapshot", reducing the value of the intelligence.
- **Fragile GitHub Search**: The backend uses the GitHub `/search/repositories` API. This API has brutal rate limits (30 req/min authenticated, 10 req/min unauthenticated). The `scraper.py` iterates over topics with a mere 1-2 second sleep interval, meaning it is highly likely to hit 403 Rate Limit or 401 Unauthorized errors (if token is misconfigured), halting data collection.
- **Hardcoded Core Features**: The "Explore" (Technology Map) and "Roadmaps" sections of the platform do not utilize the backend APIs. They are currently hardcoded in static TypeScript arrays (`frontend/src/data/languages.ts` and `frontend/src/data/roadmaps.ts`). 

## Data Analysis

1. **Is the data REAL or FAKE?**
   - **Trends Page**: **REAL** (Dynamically scraped domain-level aggregations).
   - **Explore/Languages**: **FAKE** (Hardcoded static lists).
   - **Roadmaps**: **FAKE** (Hardcoded static paths).

2. **Is it Hardcoded, Scraped, or API?**
   - A mix. Broad domain intelligence is scraped in real-time from APIs. Specific language data and roadmaps are completely hardcoded.

3. **If scraping is used, is it real-time?**
   - Yes, the FastAPI background job scrapes native APIs (HN, DevTo, Reddit) in near real-time (30-minute intervals). It is not returning mock data for the trend dashboard.

4. **GitHub-related data:**
   - The GitHub requests are genuinely dynamic. The backend executes live queries for repositories matching terms like "machine-learning" or "kubernetes" and counts the stars/forks. However, because it searches broadly by topic, it only retrieves generic repositories rather than tracking the momentum of specific tools (e.g., React vs. Angular).

5. **Is the data useful for a student?**
   - **Marginally.** Telling a beginner student "AI/ML has a score of 85 and 50 GitHub mentions" is not actionable. Students need to know exactly *which* framework to learn (e.g., "PyTorch demand grew 20% this month"). The current domain-level keyword counting is too broad to dictate a career or learning decision. 

## Core Problems

- **Superficial "Intelligence"**: The classification logic (`classify_text_to_domains`) relies on simple substring matching. If an article says "Why AI is terrible", it will count as a positive point for the AI/ML domain. There is no sentiment analysis or context tracking.
- **Domain vs. Tool Disconnect**: The platform tracks massive umbrella domains (Cybersecurity) instead of actionable tools (C++, Kali Linux, Rust). The legacy code in the backend *attempts* to track individual tools, but the frontend's main interface focuses heavily on domains, diluting the platform's value. 
- **Hardcoded Product Pillars**: Two of the main three features (Explore & Roadmaps) are entirely static. The illusion of a dynamic application breaks immediately when a user investigates these tabs.

## Limitations

- **Scalability**: Fetching data using simple REST requests and `asyncio.sleep` to dodge rate limits will rapidly fail as the number of tracked frameworks increases.
- **Data Depth**: The lack of historical time-series data prevents the platform from showing actual "trends" (lines going up or down over time). It currently only calculates a single real-time "momentum score".
- **API Fragility**: The heavy reliance on unauthenticated Reddit and RSS feeds makes the data pipeline susceptible to arbitrary blocking or structural changes by external sites.

## Recommended Next Steps (Priority-wise)

1. **Fix the GitHub Pipeline (Critical)**  
   Restructure `scraper.py` to handle rate limits gracefully, strictly enforce Bearer Token authentication, and shift from broad `/search` queries to targeted GraphQL/API queries of specific foundational repositories.

2. **Shift Focus from Domains to Specific Tools (High)**  
   Update the scoring engine to track granular tools (React, Rust, PyTorch, Docker) rather than broad domains (WebDev, AI/ML, DevOps). Students need tool-level insights for learning paths.

3. **De-Hardcode "Explore" and "Roadmap" Data (High)**  
   Move `languages.ts` and `roadmaps.ts` into the SQLite database. Ensure that the frontend fetches these from new backend endpoints so the platform acts as a unified, dynamic system.

4. **Implement Time-Series Tracking (Medium)**  
   Chronologically save daily/weekly snapshots of technology scores in the database so the frontend Recharts can display actual historical growth instead of empty `growth: []` arrays.

5. **Improve Keyword Classification Logic (Low)**  
   Upgrade the naive string-matching scraper to utilize lightweight NLP or an LLM to determine the sentiment and actual relevance of a HackerNews/Reddit post before assigning it to a technology's score.
