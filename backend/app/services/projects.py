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
        "walkthrough": {
            "video_id": "bMknfKXIFA8",
            "keywords": ["react"],
            "docs": [
                ["Thinking in React", "https://react.dev/learn/thinking-in-react"],
                ["State: a component's memory", "https://react.dev/learn/state-a-components-memory"],
            ],
            "steps": [
                "Render one hardcoded question and its options.",
                "Move the current question index into state and add a Next button.",
                "Record each answer in an array as it is chosen.",
                "Swap the question view for a results view when the index runs out.",
                "Add the restart, and make sure every piece of state resets.",
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
        "walkthrough": {
            "video_id": "SqcY0GlETPk",
            "keywords": ["react"],
            "docs": [
                ["Synchronizing with Effects", "https://react.dev/learn/synchronizing-with-effects"],
                ["GitHub REST: search repositories", "https://docs.github.com/en/rest/search/search"],
            ],
            "steps": [
                "Fetch a fixed query on mount and render the results.",
                "Wire the input to state, then debounce it.",
                "Add an AbortController and cancel on cleanup.",
                "Give every failure mode its own visible state.",
                "Extract the whole thing into a useRepoSearch hook.",
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
        "walkthrough": {
            "video_id": "wm5gMKuwSYk",
            "keywords": ["next"],
            "docs": [
                ["Routing fundamentals", "https://nextjs.org/docs/app/building-your-application/routing"],
                ["Metadata", "https://nextjs.org/docs/app/api-reference/functions/generate-metadata"],
            ],
            "steps": [
                "Scaffold the app and build the layout and home page.",
                "Add a /blog route listing posts from a local folder.",
                "Render one post at /blog/[slug] from its MDX.",
                "Add generateMetadata per post and check the preview.",
                "Deploy it.",
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
        "walkthrough": {
            "video_id": "ZVnjOPwW4ZA",
            "keywords": ["next"],
            "docs": [
                ["Route Handlers", "https://nextjs.org/docs/app/building-your-application/routing/route-handlers"],
                ["redirect()", "https://nextjs.org/docs/app/api-reference/functions/redirect"],
            ],
            "steps": [
                "Create the links table: code, target, clicks, created_at.",
                "Build the form and a Server Action that inserts a row.",
                "Generate short codes, and decide what happens on a collision.",
                "Add /[code] as a route that looks up and redirects.",
                "Increment the click count, and validate the target URL.",
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
        "walkthrough": {
            "docs": [
                ["FastAPI tutorial", "https://fastapi.tiangolo.com/tutorial/"],
                ["SQL databases", "https://fastapi.tiangolo.com/tutorial/sql-databases/"],
            ],
            "steps": [
                "Get one hardcoded GET endpoint running under uvicorn.",
                "Define the Pydantic models and use them on the routes.",
                "Add SQLAlchemy and a real table.",
                "Implement the four operations against the database.",
                "Handle the missing-id case with a proper 404.",
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
        "walkthrough": {
            "video_id": "3c-iBn73dDE",
            "keywords": ["docker"],
            "docs": [
                ["Dockerfile reference", "https://docs.docker.com/reference/dockerfile/"],
                ["Multi-stage builds", "https://docs.docker.com/build/building/multi-stage/"],
            ],
            "steps": [
                "Write the simplest Dockerfile that works. Record the size.",
                "Add a .dockerignore and rebuild. Record the size again.",
                "Split into a build stage and a runtime stage.",
                "Move to a slim or alpine runtime base.",
                "Compare against your first image and understand each saving.",
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
            raise ValueError(f"projects.py: '{p['slug']}' has invalid tier '{p['tier']}'.")
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
