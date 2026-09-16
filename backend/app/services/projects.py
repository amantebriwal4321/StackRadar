"""
StackRadar — Project Catalog (single source of truth).

Every buildable project StackRadar suggests is defined ONCE here, the same way
every tracked technology is defined once in `catalog.py`. The API reads from
this list; nothing else authors projects.

WHY THIS EXISTS. The product answers "what is rising" and "what to learn in
what order", and then stops at the exact point where learning has to turn into
evidence. A roadmap you have finished reading looks identical to one you never
started. A project you have built does not.

WHAT IS AUTHORED AND WHAT IS VERIFIED — the line that keeps this honest.

`ToolResource` states the rule this repo runs on: nothing is model-generated,
because a hallucinated video id looks identical to a real one and sends a
learner to a dead page. That rule applies to CLAIMS ABOUT THE WORLD, and a
project splits cleanly into two halves:

  • The brief is a SPECIFICATION. "Build a URL shortener that persists to
    Postgres and handles collisions" is design work, like the roadmap step text
    already in this repo. Writing it is the job.

  • The walkthrough is a CLAIM. Every `video_id` below is checked live through
    `resources.verify_youtube` (oEmbed — no API key, no quota) before it can be
    served, and every `docs` URL points at first-party documentation. A dead or
    unrelated id fails closed and the project ships without a video rather than
    with a broken one.

So the briefs are hand-written and reviewed; the links are verified.

COVERAGE IS DELIBERATELY PARTIAL. Six tools are seeded properly rather than all
31 done badly. A tool with no project renders an honest empty state — the same
posture as the testimonial slot on the landing, and for the same reason.

TO ADD A PROJECT: append an entry here. `tool_slug` must exist in
`catalog.TOOLS` or import fails loudly (see `_validate` at the bottom) rather
than producing a project attached to nothing.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

from app.services.catalog import TOOLS

TIERS = ("beginner", "intermediate", "advanced")

# fmt: off
PROJECTS: list[dict[str, Any]] = [

    # ── React ──────────────────────────────────────────────────────────────
    {
        "slug": "react-quiz-app",
        "tool_slug": "react",
        "tier": "beginner",
        "title": "A quiz app that keeps score",
        "est_hours": 4,
        "summary": "Ten questions, one at a time, with a score at the end.",
        "brief": (
            "Build a single-page quiz. Questions come from a local array to "
            "begin with. Show one question at a time with its options, record "
            "the answer, and show a final score with which ones were wrong."
        ),
        "requirements": [
            "One question visible at a time, with a visible progress indicator",
            "Selecting an option locks it in and advances",
            "A final screen listing every wrong answer and the correct one",
            "A restart button that genuinely resets state",
        ],
        "skills": ["useState", "conditional rendering", "lists and keys", "lifting state up"],
        "starter": "npm create vite@latest quiz -- --template react-ts",
        "stack": ["react", "react-dom", "vite"],
        "walkthrough": {
            "must": ['quiz'],
            "any": ['react'],
            "video_id": "bMknfKXIFA8",
            "keywords": ["react"],
            "search": "build a react quiz app tutorial",
            "docs": [
                ["Thinking in React", "https://react.dev/learn/thinking-in-react"],
                ["State: a component's memory", "https://react.dev/learn/state-a-components-memory"],
            ],
            "steps": [
                {
                    "do": "Render one hardcoded question and its options",
                    "detail": "An array of { question, options[], answerIndex }. Render options with .map and a key — use the option text, not the array index, or React reuses the wrong DOM node when the list changes.",
                    "doc": ["Rendering lists", "https://react.dev/learn/rendering-lists"],
                },
                {
                    "do": "Move the current question index into state",
                    "detail": "const [current, setCurrent] = useState(0). A Next button does setCurrent(c => c + 1).",
                    "doc": ["State: a component's memory", "https://react.dev/learn/state-a-components-memory"],
                    "gotcha": "Use the updater form setCurrent(c => c + 1), not setCurrent(current + 1). The second reads a value captured when the component rendered, which is wrong the moment two updates land in one tick.",
                },
                {
                    "do": "Record each answer as it is chosen",
                    "detail": "const [answers, setAnswers] = useState([]) and setAnswers(a => [...a, chosenIndex]).",
                    "doc": ["Updating arrays in state", "https://react.dev/learn/updating-arrays-in-state"],
                    "gotcha": "Never answers.push(x). Mutating state in place does not re-render — React compares by reference and the array is the same object. Always build a new array.",
                },
                {
                    "do": "Swap to a results view when the questions run out",
                    "detail": "When current >= questions.length, render the score instead. Compare answers[i] against questions[i].answerIndex to list what was wrong.",
                    "doc": ["Conditional rendering", "https://react.dev/learn/conditional-rendering"],
                },
                {
                    "do": "Add restart, and reset every piece of state",
                    "detail": "setCurrent(0) and setAnswers([]) together.",
                    "gotcha": "This is where the bug usually is. Resetting only the index leaves the old answers, so the second run scores against the first run's data.",
                },
            ],
        },
    },
    {
        "slug": "react-github-explorer",
        "tool_slug": "react",
        "tier": "intermediate",
        "title": "A GitHub repository explorer",
        "est_hours": 10,
        "summary": "Search real repositories, handle loading and failure honestly.",
        "brief": (
            "Search the public GitHub API for repositories and show the "
            "results. The interesting part is not the happy path — it is "
            "debouncing the input, cancelling superseded requests, and being "
            "truthful about rate limits and empty results."
        ),
        "requirements": [
            "Debounced search against the real GitHub API",
            "In-flight requests cancelled when the query changes",
            "Distinct loading, empty, error and rate-limited states",
            "Repository detail: stars, language, last push, description",
        ],
        "skills": ["useEffect cleanup", "AbortController", "custom hooks", "async state"],
        "starter": "npm create vite@latest gh-explorer -- --template react-ts",
        "stack": ["react", "react-dom", "vite"],
        "walkthrough": {
            "must": ['react'],
            "any": ['github', 'search', 'fetch', 'api'],
            "video_id": "SqcY0GlETPk",
            "keywords": ["react"],
            "search": "react debounce search api abortcontroller tutorial",
            "docs": [
                ["Synchronizing with Effects", "https://react.dev/learn/synchronizing-with-effects"],
                ["GitHub REST: search repositories", "https://docs.github.com/en/rest/search/search"],
            ],
            "steps": [
                {
                    "do": "Fetch one fixed query and render the results",
                    "detail": "GET https://api.github.com/search/repositories?q=react - no auth needed. The array you want is data.items; each item carries full_name, description, stargazers_count, language and pushed_at.",
                    "doc": ["Search repositories", "https://docs.github.com/en/rest/search/search"],
                },
                {
                    "do": "Wire the input to state, then debounce it",
                    "detail": "Inside the effect: const id = setTimeout(() => search(q), 400); return () => clearTimeout(id). The cleanup cancels the previous timer, so only the last keystroke in a 400ms window fires.",
                    "doc": ["Synchronizing with Effects", "https://react.dev/learn/synchronizing-with-effects"],
                    "gotcha": "Debouncing without the clearTimeout cleanup does nothing. You still queue one request per keystroke and they all still fire, just late.",
                },
                {
                    "do": "Cancel superseded requests with AbortController",
                    "detail": "const ctrl = new AbortController(); fetch(url, { signal: ctrl.signal }); return () => ctrl.abort(). Catch AbortError and ignore it - it is expected, not a failure.",
                    "doc": ["AbortController", "https://developer.mozilla.org/en-US/docs/Web/API/AbortController"],
                    "gotcha": "Without this you get the race that ruins every search box: a slow response for 're' lands after the fast one for 'react' and overwrites it, so the list shows results for a query the user already replaced.",
                },
                {
                    "do": "Give every failure its own visible state",
                    "detail": "Four distinct states, not one spinner: loading, empty (items.length === 0), error, and rate-limited. Unauthenticated search is 60 requests per hour.",
                    "doc": ["Rate limits", "https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api"],
                    "gotcha": "Rate-limited comes back as 403 with x-ratelimit-remaining: 0, not as 429. Handle only 429 and you will show a generic error and never work out why it started failing.",
                },
                {
                    "do": "Extract it into a useRepoSearch hook",
                    "detail": "Return { results, status, error } and keep every effect inside it. The component should have no fetch logic left.",
                    "doc": ["Reusing logic with custom Hooks", "https://react.dev/learn/reusing-logic-with-custom-hooks"],
                },
            ],
        },
    },
    {
        "slug": "react-kanban-board",
        "tool_slug": "react",
        "tier": "advanced",
        "title": "A drag-and-drop kanban board",
        "est_hours": 20,
        "summary": "Columns, cards, drag between them, and it survives a reload.",
        "brief": (
            "Build a board with columns and draggable cards. Use the HTML "
            "drag-and-drop API rather than a library — the point is to "
            "understand the event model. Persist to localStorage and make the "
            "whole thing keyboard-operable."
        ),
        "requirements": [
            "Drag a card between columns and reorder within one",
            "State survives a page reload",
            "Cards can be created, edited and deleted",
            "Fully operable by keyboard, not only by pointer",
        ],
        "skills": ["useReducer", "HTML drag-and-drop", "persistence", "keyboard accessibility"],
        "walkthrough": {
            "must": ['kanban'],
            "any": [],
            "search": "build a kanban board in react with drag and drop",
            "docs": [
                ["HTML Drag and Drop API", "https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API"],
                ["Extracting state logic into a reducer", "https://react.dev/learn/extracting-state-logic-into-a-reducer"],
            ],
            "steps": [
                "Model the board as one reducer: columns holding ordered card ids.",
                "Render columns and cards from that state.",
                "Add dragstart/dragover/drop and move a card between columns.",
                "Handle reordering inside a column, which is the fiddly case.",
                "Persist the reducer state, then add keyboard move commands.",
            ],
        },
    },

    # ── Next.js ────────────────────────────────────────────────────────────
    {
        "slug": "nextjs-personal-site",
        "tool_slug": "nextjs",
        "tier": "beginner",
        "title": "A personal site with a real blog",
        "est_hours": 6,
        "summary": "Static pages, MDX posts, and metadata that actually unfurls.",
        "brief": (
            "Build your own site with the App Router: a home page, an about "
            "page, and a blog whose posts are MDX files on disk. Get the "
            "Open Graph metadata right so a shared link previews properly."
        ),
        "requirements": [
            "App Router with a shared layout",
            "Blog posts read from MDX files, listed newest first",
            "Per-post metadata that produces a real link preview",
            "Deployed and reachable at a URL",
        ],
        "skills": ["App Router", "file-based routing", "generateMetadata", "static rendering"],
        "starter": "npx create-next-app@latest my-site --typescript --app --tailwind",
        "stack": ["next", "react", "gray-matter", "next-mdx-remote"],
        "walkthrough": {
            "must": ['blog'],
            "any": ['next'],
            "video_id": "wm5gMKuwSYk",
            "keywords": ["next"],
            "search": "build a personal blog website with nextjs and mdx",
            "docs": [
                ["Routing fundamentals", "https://nextjs.org/docs/app/building-your-application/routing"],
                ["Metadata", "https://nextjs.org/docs/app/api-reference/functions/generate-metadata"],
            ],
            "steps": [
                {
                    "do": "Scaffold, then build layout.tsx and page.tsx",
                    "detail": "app/layout.tsx wraps every page and is where nav and fonts belong. app/page.tsx is the home route.",
                    "doc": ["Pages and Layouts", "https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts"],
                },
                {
                    "do": "List posts from MDX files on disk",
                    "detail": "Put .mdx files in content/. Read them in a Server Component with fs.readdirSync, parse front-matter with gray-matter, sort by date descending.",
                    "doc": ["Server Components", "https://nextjs.org/docs/app/building-your-application/rendering/server-components"],
                    "gotcha": "fs only works in a Server Component. The moment that file gains a use client directive the build breaks, because there is no filesystem in a browser.",
                },
                {
                    "do": "Render one post at /blog/[slug]",
                    "detail": "app/blog/[slug]/page.tsx. Add generateStaticParams returning every slug so all posts are prerendered at build time rather than on demand.",
                    "doc": ["generateStaticParams", "https://nextjs.org/docs/app/api-reference/functions/generate-static-params"],
                },
                {
                    "do": "Add per-post metadata so shared links unfurl",
                    "detail": "export async function generateMetadata({ params }) returning title, description and openGraph. Set metadataBase in the root layout.",
                    "doc": ["generateMetadata", "https://nextjs.org/docs/app/api-reference/functions/generate-metadata"],
                    "gotcha": "Without metadataBase your OG image path stays relative. It looks correct in your HTML and resolves to nothing once the link leaves your domain. Test with a real unfurler, not by eye.",
                },
                {
                    "do": "Deploy it",
                    "detail": "Push to GitHub, import the repo on Vercel. It detects Next.js with no configuration.",
                    "doc": ["Deploying", "https://nextjs.org/docs/app/building-your-application/deploying"],
                },
            ],
        },
    },
    {
        "slug": "nextjs-url-shortener",
        "tool_slug": "nextjs",
        "tier": "intermediate",
        "title": "A URL shortener with real redirects",
        "est_hours": 12,
        "summary": "Short codes, collision handling, click counts, live redirects.",
        "brief": (
            "Paste a long URL, get a short one, and have the short one issue a "
            "real HTTP redirect. Store links in Postgres. The part worth doing "
            "carefully is collision handling and validating that the input is "
            "actually a URL you are willing to redirect to."
        ),
        "requirements": [
            "POST a long URL, receive a short code",
            "The short code issues a real redirect, not a client-side hop",
            "Collisions handled deliberately, not by hoping",
            "A click count per link, and rejection of invalid or unsafe URLs",
        ],
        "skills": ["Route Handlers", "Server Actions", "Postgres", "HTTP redirects"],
        "starter": "npx create-next-app@latest shortener --typescript --app --tailwind",
        "stack": ["next", "@vercel/postgres", "nanoid", "zod"],
        "walkthrough": {
            "must": ['short'],
            "any": ['next'],
            "deny": ['razorpay', 'pro plans'],
            "video_id": "ZVnjOPwW4ZA",
            "keywords": ["next"],
            "search": "build url shortener nextjs postgres tutorial",
            "docs": [
                ["Route Handlers", "https://nextjs.org/docs/app/building-your-application/routing/route-handlers"],
                ["redirect()", "https://nextjs.org/docs/app/api-reference/functions/redirect"],
            ],
            "steps": [
                {
                    "do": "Create the links table",
                    "detail": "code TEXT PRIMARY KEY, target TEXT NOT NULL, clicks INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(). Making code the primary key gives you the uniqueness constraint and the lookup index in one.",
                    "doc": ["Vercel Postgres quickstart", "https://vercel.com/docs/storage/vercel-postgres/quickstart"],
                },
                {
                    "do": "Build the form and a Server Action that inserts a row",
                    "detail": "A Server Action is an async function with the use server directive; the form calls it directly with no API route in between. Validate the URL with zod before it reaches the database.",
                    "doc": ["Server Actions", "https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations"],
                },
                {
                    "do": "Generate short codes and handle collisions",
                    "detail": "nanoid(7) from a 64-character alphabet. Do not check-then-insert: insert and catch the unique-violation error (Postgres code 23505), then retry with a new code. Give up after three attempts.",
                    "doc": ["Postgres error codes", "https://www.postgresql.org/docs/current/errcodes-appendix.html"],
                    "gotcha": "Checking whether a code exists and then inserting is a race. Two requests can both see it free and both try to write. Let the database be the arbiter - that is what the constraint is for.",
                },
                {
                    "do": "Add /[code] as a route that looks up and redirects",
                    "detail": "app/[code]/page.tsx, look the code up, then call redirect(target) from next/navigation. That issues a real 307 - the browser never renders your page.",
                    "doc": ["redirect()", "https://nextjs.org/docs/app/api-reference/functions/redirect"],
                    "gotcha": "redirect() works by throwing. Call it inside a try/catch and your own catch swallows it and the redirect silently never happens. Call it outside, or rethrow.",
                },
                {
                    "do": "Count the click, and refuse URLs you should not follow",
                    "detail": "UPDATE links SET clicks = clicks + 1 WHERE code = $1 - increment in SQL, never read-then-write in JS. Reject anything that is not http or https: javascript: and data: URLs are how a shortener becomes an XSS vector.",
                    "doc": ["Unvalidated redirects", "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"],
                    "gotcha": "This is the security bug in almost every tutorial shortener. If you will redirect to any string a stranger submits, you have built an open redirect that lends your domain to a phishing link.",
                },
            ],
        },
    },

    # ── FastAPI ────────────────────────────────────────────────────────────
    {
        "slug": "fastapi-bookmarks-api",
        "tool_slug": "fastapi",
        "tier": "beginner",
        "title": "A bookmarks API with real validation",
        "est_hours": 5,
        "summary": "CRUD over SQLite, typed with Pydantic, documented for free.",
        "brief": (
            "Build a small REST API for saving bookmarks. Every endpoint takes "
            "and returns a Pydantic model, so the interactive docs at /docs "
            "are generated rather than written."
        ),
        "requirements": [
            "Create, list, update and delete bookmarks",
            "Pydantic models for request and response, not raw dicts",
            "SQLite via SQLAlchemy",
            "A real 404 for a missing id, not a 200 with null",
        ],
        "skills": ["path and query params", "Pydantic validation", "SQLAlchemy", "HTTP status codes"],
        "starter": "python -m venv venv && pip install \"fastapi[standard]\" sqlalchemy",
        "stack": ["fastapi", "uvicorn", "sqlalchemy", "pydantic"],
        "walkthrough": {
            "must": ['fastapi'],
            "any": ['api', 'crud', 'build'],
            "search": "build a rest api from scratch fastapi sqlalchemy project",
            "docs": [
                ["FastAPI tutorial", "https://fastapi.tiangolo.com/tutorial/"],
                ["SQL databases", "https://fastapi.tiangolo.com/tutorial/sql-databases/"],
            ],
            "steps": [
                {
                    "do": "Get one endpoint running under uvicorn",
                    "detail": "uvicorn main:app --reload, then open /docs. The interactive documentation is generated from your type hints - you never write it.",
                    "doc": ["First steps", "https://fastapi.tiangolo.com/tutorial/first-steps/"],
                },
                {
                    "do": "Define the Pydantic models and put them on the routes",
                    "detail": "Two models, not one: BookmarkCreate for the request and BookmarkRead for the response. Use response_model=BookmarkRead so the shape you return is enforced.",
                    "doc": ["Request body", "https://fastapi.tiangolo.com/tutorial/body/"],
                    "gotcha": "One shared model leaks fields you did not mean to expose and forces the client to send an id it cannot know. Splitting them is the whole discipline.",
                },
                {
                    "do": "Add SQLAlchemy and a real table",
                    "detail": "A separate declarative model from your Pydantic ones. Get a session per request with Depends(get_db) so it is opened and closed for you.",
                    "doc": ["SQL databases", "https://fastapi.tiangolo.com/tutorial/sql-databases/"],
                    "gotcha": "The SQLAlchemy model and the Pydantic model are different objects with the same field names. Conflating them is the most common beginner error in FastAPI.",
                },
                {
                    "do": "Implement create, list, update and delete",
                    "detail": "POST returns 201, DELETE returns 204 with no body. Add limit and offset as query parameters on the list route.",
                    "doc": ["Query parameters", "https://fastapi.tiangolo.com/tutorial/query-params/"],
                },
                {
                    "do": "Return a real 404 for a missing id",
                    "detail": "raise HTTPException(status_code=404, detail=\"Bookmark not found\").",
                    "doc": ["Handling errors", "https://fastapi.tiangolo.com/tutorial/handling-errors/"],
                    "gotcha": "Returning 200 with null is the lazy version and it breaks every client. Callers check the status code before they look at the body.",
                },
            ],
        },
    },
    {
        "slug": "fastapi-rss-aggregator",
        "tool_slug": "fastapi",
        "tier": "intermediate",
        "title": "An RSS aggregator that refreshes itself",
        "est_hours": 12,
        "summary": "Async fetching of many feeds, cached, on a background schedule.",
        "brief": (
            "Pull a set of RSS feeds concurrently, normalise them into one "
            "list, and serve it. Refresh on a background task rather than on "
            "the request path, so a slow feed never makes your API slow."
        ),
        "requirements": [
            "Feeds fetched concurrently with httpx, not one after another",
            "One failing feed does not fail the whole response",
            "Results cached with a TTL, refreshed in the background",
            "A status endpoint reporting when each feed was last read",
        ],
        "skills": ["async/await", "asyncio.gather", "background tasks", "caching and TTLs"],
        "walkthrough": {
            "must": ['rss', 'feed'],
            "any": [],
            "search": "build an rss feed aggregator with python and fastapi",
            "docs": [
                ["Concurrency and async/await", "https://fastapi.tiangolo.com/async/"],
                ["Background tasks", "https://fastapi.tiangolo.com/tutorial/background-tasks/"],
            ],
            "steps": [
                "Fetch and parse a single feed synchronously.",
                "Move to httpx.AsyncClient and gather several at once.",
                "Wrap each fetch so one failure cannot take down the batch.",
                "Cache the merged result and serve from cache.",
                "Refresh on a loop started at app startup, and report status.",
            ],
        },
    },

    # ── Docker ─────────────────────────────────────────────────────────────
    {
        "slug": "docker-containerize-app",
        "tool_slug": "docker",
        "tier": "beginner",
        "title": "Containerise an app you already wrote",
        "est_hours": 3,
        "summary": "A Dockerfile that builds, runs, and is not 1.2GB.",
        "brief": (
            "Take something you have already built and put it in a container. "
            "Then make the image small: a multi-stage build, a slim base, and "
            "a .dockerignore that actually excludes things."
        ),
        "requirements": [
            "A Dockerfile that builds and runs the app",
            "A multi-stage build separating build from runtime",
            "A .dockerignore excluding node_modules, .git and secrets",
            "Final image measurably smaller than the naive first attempt",
        ],
        "skills": ["Dockerfile layers", "multi-stage builds", "image size", "port mapping"],
        "starter": "docker --version && docker build -t myapp . && docker images myapp",
        "stack": ["docker"],
        "walkthrough": {
            "must": ['docker'],
            "any": ['image', 'size', 'dockerfile', 'multi'],
            "video_id": "3c-iBn73dDE",
            "keywords": ["docker"],
            "search": "docker multi stage build reduce image size tutorial",
            "docs": [
                ["Dockerfile reference", "https://docs.docker.com/reference/dockerfile/"],
                ["Multi-stage builds", "https://docs.docker.com/build/building/multi-stage/"],
            ],
            "steps": [
                {
                    "do": "Write the simplest Dockerfile that works, and record the size",
                    "detail": "FROM, WORKDIR, COPY . ., install, CMD. Run docker images and write the number down - every later step is measured against it.",
                    "doc": ["Dockerfile reference", "https://docs.docker.com/reference/dockerfile/"],
                },
                {
                    "do": "Add a .dockerignore and rebuild",
                    "detail": "node_modules, .git, .env, dist, __pycache__. Rebuild and compare.",
                    "doc": [".dockerignore", "https://docs.docker.com/build/concepts/context/#dockerignore-files"],
                    "gotcha": "Without it, COPY . . ships your .git history and local node_modules into the image - and any .env sitting in the folder goes with them. That is a secret leak, not just wasted megabytes.",
                },
                {
                    "do": "Order layers so the cache actually works",
                    "detail": "Copy the manifest alone (package.json, requirements.txt), install, and only then copy the source. Docker caches per layer and invalidates everything after the first change.",
                    "doc": ["Build cache", "https://docs.docker.com/build/cache/"],
                    "gotcha": "COPY . . before installing means every one-character source edit reinstalls all dependencies. This single line is the difference between a two-second rebuild and a two-minute one.",
                },
                {
                    "do": "Split into a build stage and a runtime stage",
                    "detail": "FROM node AS build, then a second FROM with COPY --from=build of only the built output. Compilers and dev dependencies never reach the final image.",
                    "doc": ["Multi-stage builds", "https://docs.docker.com/build/building/multi-stage/"],
                },
                {
                    "do": "Move to a slim runtime base and compare",
                    "detail": "node:20-slim or python:3.12-slim. Run docker images against your first number and be able to say where each saving came from.",
                    "doc": ["Base images", "https://docs.docker.com/build/building/base-images/"],
                    "gotcha": "alpine is smaller still but uses musl instead of glibc, which breaks native modules in subtle ways. Reach for slim first; take alpine only when the size genuinely matters.",
                },
            ],
        },
    },
    {
        "slug": "docker-compose-stack",
        "tool_slug": "docker",
        "tier": "intermediate",
        "title": "A three-service stack with Compose",
        "est_hours": 8,
        "summary": "API, database and frontend, talking to each other by name.",
        "brief": (
            "Run an API, a Postgres database and a frontend together with "
            "docker-compose. Services address each other by service name, the "
            "database survives a restart, and the API waits for it properly."
        ),
        "requirements": [
            "Three services in one compose file",
            "The API reaches the database by service name, not localhost",
            "A named volume, so data survives docker compose down",
            "A healthcheck the API actually waits on",
        ],
        "skills": ["compose networking", "volumes", "healthchecks", "environment config"],
        "walkthrough": {
            "must": ['docker'],
            "any": ['compose', 'postgres'],
            "search": "docker compose multi container app with postgres tutorial",
            "docs": [
                ["Compose file reference", "https://docs.docker.com/reference/compose-file/"],
                ["Startup order", "https://docs.docker.com/compose/how-tos/startup-order/"],
            ],
            "steps": [
                "Define the database service with a named volume.",
                "Add the API and point it at the database by service name.",
                "Add the frontend and pass it the API's address.",
                "Add a healthcheck and depends_on with a condition.",
                "docker compose down, then up, and confirm the data is still there.",
            ],
        },
    },

    # ── PyTorch ────────────────────────────────────────────────────────────
    {
        "slug": "pytorch-mnist-classifier",
        "tool_slug": "pytorch",
        "tier": "beginner",
        "title": "A digit classifier, trained from scratch",
        "est_hours": 6,
        "summary": "The training loop, written out by hand rather than imported.",
        "brief": (
            "Train a small network on MNIST, writing the training loop "
            "yourself. The goal is not the accuracy — it is being able to say "
            "what every line of the loop does and why."
        ),
        "requirements": [
            "A Dataset and DataLoader feeding batches",
            "A training loop you wrote: forward, loss, backward, step",
            "Evaluation on a held-out test set, not on training data",
            "Loss and accuracy plotted per epoch",
        ],
        "skills": ["tensors", "autograd", "nn.Module", "the training loop"],
        "walkthrough": {
            "must": ['pytorch'],
            "any": ['mnist', 'digit', 'classifier', 'neural'],
            "search": "pytorch mnist handwritten digit classifier from scratch",
            "docs": [
                ["Learn the Basics", "https://pytorch.org/tutorials/beginner/basics/intro.html"],
                ["Optimization loop", "https://pytorch.org/tutorials/beginner/basics/optimization_tutorial.html"],
            ],
            "steps": [
                "Load MNIST and look at a few images and their labels.",
                "Define the model as an nn.Module.",
                "Write the loop: zero_grad, forward, loss, backward, step.",
                "Add a separate evaluation pass with no_grad.",
                "Plot loss and accuracy, and explain the shape of the curves.",
            ],
        },
    },
    {
        "slug": "pytorch-transfer-learning",
        "tool_slug": "pytorch",
        "tier": "intermediate",
        "title": "Fine-tune a pretrained model on your own images",
        "est_hours": 12,
        "summary": "Take a trained backbone, retrain the head on data you collected.",
        "brief": (
            "Collect a few hundred images in two or three classes that matter "
            "to you. Fine-tune a pretrained ResNet on them. Handle the fact "
            "that your dataset is small and probably imbalanced."
        ),
        "requirements": [
            "Your own images, not a packaged dataset",
            "A pretrained backbone with a replaced classification head",
            "Augmentation, and a train/validation split that does not leak",
            "A confusion matrix, not just a single accuracy number",
        ],
        "skills": ["transfer learning", "torchvision transforms", "overfitting", "evaluation"],
        "walkthrough": {
            "must": ['pytorch'],
            "any": ['transfer learning', 'fine-tun', 'fine tun'],
            "search": "pytorch transfer learning fine tune a pretrained model",
            "docs": [
                ["Transfer learning tutorial", "https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html"],
                ["torchvision transforms", "https://pytorch.org/vision/stable/transforms.html"],
            ],
            "steps": [
                "Collect and label the images; split them before anything else.",
                "Build the Dataset and confirm a batch looks right.",
                "Load a pretrained ResNet and replace the final layer.",
                "Freeze the backbone, train the head, then unfreeze and compare.",
                "Produce a confusion matrix and read what it tells you.",
            ],
        },
    },

    # ── Rust ───────────────────────────────────────────────────────────────
    {
        "slug": "rust-cli-grep",
        "tool_slug": "rust",
        "tier": "beginner",
        "title": "A grep you can actually use",
        "est_hours": 6,
        "summary": "Search files from the command line, with real error handling.",
        "brief": (
            "Build a command-line search tool. Read arguments, open files, "
            "print matching lines. Every failure — missing file, bad "
            "permissions, invalid UTF-8 — is handled with Result rather than "
            "unwrap."
        ),
        "requirements": [
            "Takes a pattern and one or more file paths",
            "Case-insensitive mode behind a flag",
            "Errors surface as messages and a non-zero exit code",
            "Not a single unwrap on a fallible operation",
        ],
        "skills": ["ownership and borrowing", "Result and ?", "pattern matching", "cargo"],
        "walkthrough": {
            "must": ['rust'],
            "any": ['grep', 'cli', 'command line'],
            "search": "build a grep clone command line tool in rust",
            "docs": [
                ["An I/O Project: Building a Command Line Program", "https://doc.rust-lang.org/book/ch12-00-an-io-project.html"],
                ["Error handling", "https://doc.rust-lang.org/book/ch09-00-error-handling.html"],
            ],
            "steps": [
                "Read args and print them back.",
                "Open a file and print every line.",
                "Filter to lines containing the pattern.",
                "Replace each unwrap with ? and a real error type.",
                "Add the case-insensitive flag and set the exit code.",
            ],
        },
    },
    {
        "slug": "rust-http-server",
        "tool_slug": "rust",
        "tier": "advanced",
        "title": "An HTTP server on raw TCP",
        "est_hours": 20,
        "summary": "No framework. Parse requests yourself, then make it concurrent.",
        "brief": (
            "Write an HTTP/1.1 server directly on TcpListener. Parse the "
            "request line and headers by hand, serve static files, and then "
            "make it handle concurrent connections with a thread pool you "
            "also wrote."
        ),
        "requirements": [
            "Request line and headers parsed by hand",
            "Static files served with correct Content-Type and Content-Length",
            "A real 404 and a real 400 for a malformed request",
            "Concurrent connections via your own thread pool",
        ],
        "skills": ["TcpListener", "byte parsing", "threads and channels", "Arc and Mutex"],
        "walkthrough": {
            "must": ['rust'],
            "any": ['http', 'tcp', 'server'],
            "search": "build an http server in rust from scratch with tcp",
            "docs": [
                ["Final Project: Building a Multithreaded Web Server", "https://doc.rust-lang.org/book/ch20-00-final-project-a-web-server.html"],
                ["Fearless Concurrency", "https://doc.rust-lang.org/book/ch16-00-concurrency.html"],
            ],
            "steps": [
                "Accept a connection and print the raw bytes.",
                "Parse the request line into method, path and version.",
                "Serve a file from disk with the right headers.",
                "Return 404 and 400 where they belong.",
                "Build a thread pool and hand each connection to a worker.",
            ],
        },
    },
]
# fmt: on


def _validate() -> None:
    """Fail at import if the catalog is internally inconsistent.

    A project attached to a tool that does not exist would render as an orphan
    card linking to a 404, and a duplicate slug would make one project
    unreachable. Both are cheap to catch here and expensive to notice in the UI.
    """
    known = {t["slug"] for t in TOOLS}
    seen: set[str] = set()
    for p in PROJECTS:
        if p["tool_slug"] not in known:
            raise ValueError(
                f"projects.py: '{p['slug']}' is attached to unknown tool "
                f"'{p['tool_slug']}'. Add it to catalog.TOOLS or fix the slug."
            )
        if p["tier"] not in TIERS:
            raise ValueError(
                f"projects.py: '{p['slug']}' has invalid tier '{p['tier']}'."
            )
        if p["slug"] in seen:
            raise ValueError(f"projects.py: duplicate project slug '{p['slug']}'.")
        seen.add(p["slug"])


_validate()


# ── Read helpers. The API layer uses these; nothing else reads PROJECTS. ──

_TOOL_BY_SLUG = {t["slug"]: t for t in TOOLS}

# Tier ordering for display — beginner first, always, regardless of list order.
_TIER_RANK = {tier: i for i, tier in enumerate(TIERS)}


def _decorate(p: dict[str, Any]) -> dict[str, Any]:
    """Attach the tool's display fields so the UI never has to join manually."""
    tool = _TOOL_BY_SLUG.get(p["tool_slug"], {})
    return {
        **{k: v for k, v in p.items() if k != "walkthrough"},
        "tool_name": tool.get("name"),
        "tool_icon": tool.get("icon"),
        "category": tool.get("category"),
        "starter": p.get("starter"),
        "stack": p.get("stack") or [],
        "has_video": bool(p.get("walkthrough", {}).get("video_id")),
        "step_count": len(p.get("walkthrough", {}).get("steps", []) or []),
        "doc_count": len(p.get("walkthrough", {}).get("docs", []) or []),
    }


def list_projects(
    tool: str | None = None,
    category: str | None = None,
    tier: str | None = None,
) -> list[dict[str, Any]]:
    """Summaries, filtered. Sorted by tier then title so the order is stable."""
    out = [
        _decorate(p)
        for p in PROJECTS
        if (tool is None or p["tool_slug"] == tool)
        and (tier is None or p["tier"] == tier)
    ]
    if category:
        low = category.lower()
        out = [p for p in out if (p.get("category") or "").lower() == low]
    return sorted(out, key=lambda p: (_TIER_RANK[p["tier"]], p["title"]))


# Bump when video_matches changes behaviour. The cached winner is a
# product of the gate as much as of the query, so a logic fix that does
# not touch the query must still invalidate what the old logic chose -
# otherwise the fix looks like it did nothing for 24 hours.
GATE_VERSION = 2

NEGATED = "(?:^|[^a-z])(?:no|not|without|instead of)[^a-z][^.,;:!?]{0,24}?%s"


def video_cache_slug(project: dict[str, Any]) -> str:
    """ToolResource key for a project's chosen walkthrough video.

    The cached winner depends on the query, all three gate fields and the gate's
    logic, so the key hashes every one of them. Each omission already shipped
    once as a fix that looked like it changed nothing for 24 hours: the search
    string, then `deny`, then the matching logic itself (hence GATE_VERSION).
    """
    w = project.get("walkthrough") or {}
    digest = hashlib.sha1(
        repr(
            (w.get("search"), w.get("must"), w.get("any"), w.get("deny"), GATE_VERSION)
        ).encode()
    ).hexdigest()[:8]
    return f"project:{project['slug']}:{digest}"


def video_matches(title: str, walkthrough: dict[str, Any]) -> bool:
    """Does this video's REAL title match what the project is about?

    rank_resource scores reach, engagement, freshness and depth - and nothing
    at all for relevance. Re-ranking therefore discards YouTube's own relevance
    ordering, so the most-watched video in the candidate pool wins even when it
    has nothing to do with the query. That is harmless on a tool page, where any
    popular React video is a fine React resource, and wrong for a project, where
    matching the project IS the point: "build a grep clone in rust" returned
    "How to Run Claude Code Completely Free forever".

    Same discipline as resources.verify_youtube, for the same reason: a
    walkthrough link is a claim about the video, so check it against the title
    the platform actually reports and fail closed. No match leaves the docs and
    the written steps, which teach the project on their own.
    """
    t = (title or "").lower()

    for term in walkthrough.get("deny") or []:
        if term in t:
            return False

    for term in walkthrough.get("must") or []:
        if term not in t:
            return False
        # A required term can appear as the thing the video says it does NOT
        # use. "Building a neural network FROM SCRATCH (no Tensorflow/PyTorch)"
        # contains "pytorch" and is the opposite of a PyTorch walkthrough.
        # Substring matching cannot see that; this can.
        if re.search(NEGATED % re.escape(term), t):
            return False

    anyof = walkthrough.get("any") or []
    return not anyof or any(term in t for term in anyof)


def normalise_steps(steps: list[Any] | None) -> list[dict[str, Any]]:
    """Give every step the same shape, whatever it was written as.

    Six projects carry rich steps — an instruction, the concrete detail, the
    exact doc page and the trap people fall into. The rest are still single
    strings. Normalising here rather than in the API or the UI means the seven
    that have not been upgraded keep working and the frontend has one code path
    instead of a type check at every render.
    """
    out: list[dict[str, Any]] = []
    for st in steps or []:
        if isinstance(st, str):
            out.append({"do": st, "detail": None, "doc": None, "gotcha": None})
        else:
            doc = st.get("doc")
            out.append(
                {
                    "do": st.get("do", ""),
                    "detail": st.get("detail"),
                    "doc": {"label": doc[0], "url": doc[1]} if doc else None,
                    "gotcha": st.get("gotcha"),
                }
            )
    return out


def get_project(slug: str) -> dict[str, Any] | None:
    """One project, raw — the caller verifies the walkthrough before serving."""
    for p in PROJECTS:
        if p["slug"] == slug:
            return p
    return None


def projects_for_tools(slugs: list[str]) -> dict[str, list[dict[str, Any]]]:
    """Summaries grouped by tool slug, for hydrating roadmap steps in one pass."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for p in sorted(PROJECTS, key=lambda x: _TIER_RANK[x["tier"]]):
        if p["tool_slug"] in slugs:
            grouped.setdefault(p["tool_slug"], []).append(_decorate(p))
    return grouped


def tool_slugs_with_projects() -> set[str]:
    return {p["tool_slug"] for p in PROJECTS}
