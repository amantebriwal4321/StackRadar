# Deploying StackRadar

Recommended: **Vercel** (frontend) + **Railway** (backend + Postgres). Both deploy
straight from this GitHub repo, give you HTTPS automatically, and have free/cheap
tiers. The frontend proxies `/api/v1/*` to the backend server-side
(`next.config.ts`), so there's **no CORS to configure** and the browser only ever
talks to one origin.

> Why Railway for the backend and not Render's free tier: the scraper runs an
> always-on 30-minute loop (`RUN_SCRAPER_INLINE=1`). Render's free web service
> spins down when idle, which would freeze the loop. Railway (or any always-on
> paid service) keeps it running.

---

## 1. Backend + Postgres on Railway

1. **New Project → Deploy from GitHub repo**, pick this repo, set **Root Directory** to `backend`.
   Railway detects the `Dockerfile` and builds it. The image's start command already
   honours `$PORT`, which Railway injects.
2. **Add a Postgres plugin** (New → Database → PostgreSQL). Railway exposes it as
   `DATABASE_URL`. Reference it on the backend service as `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
   Tables are auto-created and reconciled on startup — **no manual migration step**.
3. Set the backend **Variables** (see the table below). At minimum: `DATABASE_URL`,
   `RUN_SCRAPER_INLINE=1`, and ideally `GITHUB_TOKEN` (raises the GitHub rate limit
   from 60→5000/hr so scrapes are complete).
4. Deploy, then note the **public backend URL** (e.g. `https://stackradar-backend.up.railway.app`).
   Health check path: `/api/v1/ready`.

## 2. Frontend on Vercel

1. **Add New → Project**, import this repo, set **Root Directory** to `frontend`
   (Vercel auto-detects Next.js — ignore the Dockerfile, Vercel builds natively).
2. Set **Environment Variables** (Production) *before the first build* —
   `BACKEND_ORIGIN` is read at build time by the rewrite:
   - `BACKEND_ORIGIN` = the Railway backend URL from step 1.4
   - `NEXT_PUBLIC_SITE_URL` = your final Vercel/prod domain (e.g. `https://stackradar.app`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
   - `CLERK_SECRET_KEY` = `sk_live_...`
3. Deploy. Vercel gives you the public URL.

## 3. Post-deploy wiring

- **Clerk**: in the Clerk dashboard, switch to a **Production** instance and add your
  Vercel domain to the allowed origins. Put the *same* `pk_live_...` value in the
  backend's `CLERK_PUBLISHABLE_KEY` so it verifies `/progress` session tokens.
- **Daily nudge email** (optional): set `RESEND_API_KEY`, `DIGEST_FROM` (a verified
  sender), and `SITE_URL` on the backend, then have a daily cron
  (Railway cron, GitHub Actions, cron-job.org) `POST /api/v1/admin/send-daily-digests`
  with header `X-Admin-Key: <ADMIN_API_KEY>`.
- **Custom domain**: point it at Vercel, then update `NEXT_PUBLIC_SITE_URL` (and the
  backend `SITE_URL`) and redeploy so OG/canonical/sitemap URLs are correct.

---

## Environment variables

### Backend (Railway)
| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | From the Railway Postgres plugin. |
| `RUN_SCRAPER_INLINE` | ✅ | `1` to run the 30-min scraper loop in-process. |
| `GITHUB_TOKEN` | recommended | 60→5000 req/hr; without it GitHub stats are thin. Never commit it. |
| `GROQ_API_KEY` | optional | Enables sentiment analysis; no-op if empty. |
| `YOUTUBE_API_KEY` | optional | Ranked learning videos; falls back to curated links if empty. |
| `CLERK_PUBLISHABLE_KEY` | recommended | Same `pk_live_...` as the frontend; turns on server-side `/progress` auth. |
| `RESEND_API_KEY`, `DIGEST_FROM`, `SITE_URL` | optional | Daily nudge email; no-op if `RESEND_API_KEY` empty. |
| `ADMIN_API_KEY` | optional | Guards `/admin/*` endpoints. |

### Frontend (Vercel)
| Var | Required | Notes |
|---|---|---|
| `BACKEND_ORIGIN` | ✅ | Public backend URL. **Read at build time** — set before building. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Absolute prod URL for OG/canonical/sitemap. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | `pk_live_...` |
| `CLERK_SECRET_KEY` | ✅ | `sk_live_...` |

Secrets live only in the platform dashboards — never commit them (`.env`/`.env.local`
are gitignored).

---

## Alternative: single VPS with Docker Compose

If you'd rather run everything on one server (DigitalOcean/Hetzner/etc.):

```bash
cp backend/.env.example backend/.env   # fill in keys
docker-compose up --build -d
```

This brings up Postgres + backend + frontend. Put a reverse proxy (Caddy or Nginx)
in front for HTTPS and a domain, pointing `:80/:443` → the frontend on `:3000`.
`docker-compose.yml` already wires the frontend's `BACKEND_ORIGIN` to the `backend`
service, so the proxy works inside the compose network.

> The `infrastructure/kubernetes/` manifest and its instructions are older and
> reference services this app no longer uses — prefer the paths above.
