# Project Progress: StackRadar
**Date:** May 16, 2026

## ✅ Phase 1: Data Pipeline Hardening (Completed)
**What it is:** This phase was all about the **Backend (API & Database)**.
**Why it was important:** The app used to scrape random generic domains and would frequently crash if GitHub rate-limited us. It also didn't save historical data, making the frontend charts useless. We had to fix the foundation before making the frontend dynamic.

### Changes Made:
1. **GitHub API Rate Limit Fix:** The scraper now intelligently pauses if we send too many requests, preventing random crashes. 
2. **Tool-Level Scoring:** Replaced generic "WebDev" scoring with tracking 40+ specific tools (like React, Next.js, PyTorch).
3. **Database History Snapshots:** Created a new database table that saves the score of every tool every single day.
4. **AI Sentiment Analysis:** Added Groq LLM to read developer headlines and give tools a "positive" or "negative" sentiment score.

**How to track these changes:**
Because this is purely backend, you cannot see it on the website yet. To see these changes, open **http://localhost:8000/docs** in your browser, click on `/api/v1/tools`, and click "Execute" to see the real data being served by the database.

---

## ✅ Phase 2: Frontend Data Decoupling & UI Polish (Completed)
**What it is:** This phase focused on connecting the Next.js **Frontend (Website)** directly to the live API and fixing UI/Scoring issues.
**Why it is important:** The website was using fake static data, and the scoring algorithm was brutally penalizing popular tools on slow news days. Also, the UI was displaying multiple columns of "0"s for news mentions, which looked broken.

### Changes Made:
1. **Dynamic Data Integration:** Connected the frontend charts and tool data interfaces to pull the real metrics directly from the backend API, replacing the fake data.
2. **Absolute Logarithmic Scoring:** Rewrote the backend scoring math (`scoring.py`) to heavily weight cumulative GitHub Stars (35%) and Forks (15%). This ensures massive tools like React, Kubernetes, and Docker receive properly high scores (70-90+) regardless of daily news cycles.
3. **TrendCard UI Revamp:** Consolidated the 4 columns of sparse news sources (HN, Reddit, Dev.to, News) into a single "Daily Mentions" column, and added a "Forks" column. This makes the tool cards look visually balanced and highly professional.

**How to track these changes:**
Go to **http://localhost:3000** and look at the tool cards on the Explore page. You will see high scores for popular tools, massive GitHub star numbers, and a clean 3-column layout (Stars, Forks, Daily Mentions) without any depressing walls of zeroes!

---

## ✅ Phase 3: Next.js Performance & Production Readiness (Completed)
**What it is:** This phase focused on making the frontend **blazingly fast** and **production-ready**.
**Why it was important:** Every page load was making a fresh API call to the backend (`cache: "no-store"`), which is extremely slow and would crash the server under real traffic. Also, a TypeScript error was blocking the production build entirely.

### Changes Made:
1. **ISR Caching (30-min revalidation):** Changed all 9 `fetch()` calls in `trends.ts` from `{ cache: "no-store" }` to `{ next: { revalidate: 1800 } }`. Now Next.js caches all API responses for 30 minutes. Pages load **instantly** for every user, and data auto-refreshes in sync with the backend scraper loop.
2. **TypeScript Fix (Compare Page):** Fixed a `Type error: Argument of type 'any' is not assignable to parameter of type 'never'` in the Compare page's metrics table by adding explicit type annotations to the row definition array.
3. **Production Build Verified:** Ran `npx next build` successfully with **zero errors**. All 8 routes compiled and the app is ready for deployment to Vercel/AWS/any hosting platform.

**How to track these changes:**
- Open **http://localhost:3000** and navigate around. Notice how page loads feel instant — that's ISR caching at work.
- The app is now fully deployable. Run `npm run build` in the `frontend/` folder to confirm zero errors yourself.

### Build Output (verified):
```
✓ Compiled successfully in 2.2s
✓ Running TypeScript — no errors
✓ Generating static pages (8/8) in 448.8ms

Routes:
  ○ /              (Static)
  ○ /compare       (Static)
  ○ /explore       (Static)
  ○ /roadmaps      (Static)
  ○ /trends        (Static)
  ƒ /tools/[slug]  (Dynamic)
  ƒ /roadmap/[tech](Dynamic)
```

---

## ✅ Phase 4: Infrastructure & Observability (Completed)
**What it is:** This phase focused on making the app **production-grade** with proper logging, monitoring endpoints, and CI/CD automation.
**Why it was important:** The app was using basic `print()`-style logging, had no way for Kubernetes to know if it was healthy, and had no automated CI pipeline to catch broken builds.

### Changes Made:
1. **Structured Logging (loguru):** Replaced all `logging.basicConfig()` with [loguru](https://github.com/Delgan/loguru). Console output is colorful and human-readable. File logs rotate at 5MB with 3 backups. In production mode (`ENV=production`), logs output as JSON for tools like Datadog/ELK.
2. **Health Endpoint (`/api/v1/health`):** Now verifies actual DB connectivity via `SELECT 1`, reports the timestamp of the last scrape from the database, and returns a version string. Used by Kubernetes liveness probes.
3. **Readiness Endpoint (`/api/v1/ready`):** Returns HTTP 503 if fewer than 10 tools are seeded, telling Kubernetes to not route traffic until the app is ready. Returns `{"ready": true, "tools": 54}` when healthy.
4. **API Rate Limiting (slowapi):** Added `slowapi` middleware to protect public endpoints from abuse (60 requests/minute per IP).
5. **CI/CD GitHub Actions:** Created `.github/workflows/backend.yml` (validates Python imports + Docker build on main) and `.github/workflows/frontend.yml` (runs `npm ci` + `npm run build` with TypeScript checks).
6. **Kubernetes Probes:** Updated `infrastructure/kubernetes/deployment.yaml` with `livenessProbe` → `/api/v1/health` and `readinessProbe` → `/api/v1/ready`.

**How to track these changes:**
- Open **http://localhost:8000/api/v1/health** in your browser. You will see `{"status": "ok", "db": "connected", "tools_tracked": 54, ...}`.
- Open **http://localhost:8000/api/v1/ready** in your browser. You will see `{"ready": true, "tools": 54}`.
- Check your terminal running the backend — the logs now have colorful timestamps and structured formatting.
- Push to GitHub and check the **Actions** tab — both CI workflows will run automatically.

---

## ✅ Phase 5: UX & Retention (Completed)
**What it is:** This phase added **user authentication** (Clerk), a **personal watchlist**, and **SEO optimization** for search engines.
**Why it was important:** Without auth, there was no way for users to save their favorite tools. Without SEO, Google couldn't properly index the 54 tool pages.

### Changes Made:
1. **Clerk Authentication:** Integrated `@clerk/nextjs` with dark theme. Users see a "Sign In" button in the navbar. Clicking it opens a modal login (Google, email, etc.) — no redirect needed.
2. **User Watchlist Page (`/watchlist`):** Signed-in users can bookmark tools from any card via a ⭐ icon. Bookmarked tools appear on a dedicated `/watchlist` page with scores, stars, and a remove button.
3. **Bookmark Button on Tool Cards:** Every tool card now has a bookmark icon (top-right corner). If not signed in → clicking opens the sign-in modal. If signed in → toggles the bookmark with a micro-toast animation.
4. **SEO — Dynamic Metadata:** Created `layout.tsx` in `tools/[slug]/` with `generateMetadata()`. Each tool page now has a unique `<title>` like "React — Score 85/100 | StackRadar" and OpenGraph/Twitter card metadata.
5. **Dynamic Sitemap (`/sitemap.xml`):** Auto-generates a sitemap listing all 54 tools + static pages for Google crawling.
6. **Robots.txt (`/robots.txt`):** Allows all search engines, disallows API routes and private watchlist, points to sitemap.

**How to track these changes:**
- Open **http://localhost:3000** — you will see a "Sign In" button in the navbar. Click it and sign in with Google.
- After signing in, you'll see your profile avatar + a "Watchlist" button in the navbar.
- Click the bookmark icon on any tool card → it gets saved. Go to `/watchlist` to see all your bookmarked tools.
- Open **http://localhost:3000/sitemap.xml** to see the dynamic sitemap.
- Right-click → View Page Source on any tool detail page to see the SEO metadata.

---

## 🎉 ALL 5 PHASES COMPLETE!

StackRadar is now a production-ready application with:
- ✅ Real-time data pipeline (GitHub, HN, Reddit, Dev.to)
- ✅ AI sentiment analysis (Groq LLM)
- ✅ Dynamic frontend with ISR caching
- ✅ Structured logging & health monitoring
- ✅ CI/CD pipelines
- ✅ User authentication & personal watchlist
- ✅ SEO-optimized pages with dynamic sitemap
