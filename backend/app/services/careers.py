"""What the first job in a domain actually asks for.

THE HONESTY LINE, same as projects.py. These briefs are AUTHORED - a human
wrote them and the UI says so. The numbers beside them are MEASURED, from
`jobs.py`. Never blur the two: an authored sentence dressed as data is the
thing this product exists not to do.

Why authored content is here at all: the measured counts say React appears in
171 of 756 postings, which is useful and still does not tell a nineteen-year-old
what the job is, what a portfolio needs to contain, or that "DevOps engineer" is
almost never a first job. That context cannot be scraped, so it is written down,
dated, and owned.

Scope is deliberately three domains - web-development, ai-ml, devops. The other
five roadmaps are tracked and scored but have no career brief yet, and their
pages say exactly that rather than inventing one.
"""

from __future__ import annotations

from typing import Any

from app.services.catalog import CATALOG_SLUGS
from app.services.seed import SEED_ROADMAPS

# Reviewed 2026-09-21 against the Jul-Sep 2026 Ask HN hiring threads (756
# posts). Revisit when the measured counts move materially.
REVIEWED = "2026-09-21"

CAREERS: list[dict[str, Any]] = [
    {
        "slug": "web-development",
        "role_title": "Junior / associate frontend or full-stack engineer",
        "reality": (
            "This is the realistic first job in software, and the one with the most "
            "openings by a wide margin - React alone appears in 171 of the 756 postings "
            "we read. It is also the most crowded, so the portfolio does more work than "
            "the CV: teams hire the person who has shipped something they can open in a "
            "browser."
        ),
        "postings_ask": [
            "React, with TypeScript assumed rather than asked for",
            "One framework on top of it, usually Next.js - routing, data fetching, deployment",
            "CSS you can defend: flexbox, grid, and a component library you have actually used",
            "REST or GraphQL consumption, and enough backend to not be helpless (an API, a database, auth)",
            "Git in a team: branches, pull requests, review comments",
        ],
        "portfolio_expects": [
            "Two or three deployed things with public URLs - not repositories, URLs",
            "One of them with real data that changes, not a static mock",
            "A README that says what the hard part was and how you solved it",
            "Commit history that looks like work, not a single 'initial commit' dump",
        ],
        "first_90_days": [
            "Reading far more code than you write, in a codebase nobody will explain end to end",
            "Small, scoped tickets: a form field, a bug in a list view, a failing test",
            "Learning the team's review conventions, which matter more than your syntax preferences",
        ],
        "tool_slugs": ["react", "nextjs", "tailwindcss", "fastapi", "vite"],
    },
    {
        "slug": "ai-ml",
        "role_title": "Junior ML / applied AI engineer",
        "reality": (
            "Be clear-eyed: there are far fewer true junior roles here than the hype "
            "suggests, and many postings that say 'ML engineer' want three years of "
            "backend engineering with models attached. In our sample PyTorch appears in "
            "16 postings and LangChain in 13, against React's 171. The realistic route "
            "in is to be a competent software engineer who ships model-backed features - "
            "not a researcher."
        ),
        "postings_ask": [
            "Python you can be trusted with: packaging, typing, tests - not notebook-only Python",
            "PyTorch or TensorFlow, and honesty about which you actually know",
            "The practical LLM stack: embeddings, a vector store, retrieval, prompt evaluation",
            "Serving and cost: an API in front of a model, latency budgets, what a GPU hour costs",
            "Data handling before modelling - loading, cleaning, splitting, leakage",
        ],
        "portfolio_expects": [
            "A model you trained yourself, with the metric written down and the failure cases shown",
            "One thing deployed behind an API that a stranger can call",
            "Evidence you can evaluate, not just build: a baseline, a comparison, a held-out set",
            "No 'I fine-tuned a model' without the numbers before and after",
        ],
        "first_90_days": [
            "Mostly data and plumbing work, which is the job and not a detour",
            "Reproducing someone else's result before proposing your own",
            "Learning where the model is allowed to be wrong, and what happens when it is",
        ],
        "tool_slugs": ["pytorch", "tensorflow", "transformers", "langchain", "ollama"],
    },
    {
        "slug": "devops",
        "role_title": "Junior platform / DevOps engineer",
        "reality": (
            "DevOps is rarely a first job. Most people arrive after a year or two in "
            "development or IT support, because the work is trusted with production. The "
            "demand is real - Kubernetes appears in 72 postings, Docker 50, Terraform 43 - "
            "but it is demand for people who have already broken something and fixed it. "
            "Treat this as a second move, or as the thing that makes you unusually "
            "employable as a developer."
        ),
        "postings_ask": [
            "Linux and networking fundamentals - DNS, TLS, ports, processes - before any tool",
            "Containers properly: images, layers, registries, why your build is 1.2GB",
            "One orchestrator, usually Kubernetes, at the level of deploying and debugging a pod",
            "Infrastructure as code, usually Terraform, and why nobody clicks in the console",
            "CI/CD pipelines and at least one cloud, most often AWS",
            "Observability: metrics, logs, an alert that fires for a reason",
        ],
        "portfolio_expects": [
            "A service you containerised, deployed and can actually show running",
            "The infrastructure defined in code, in a repository, applied from scratch",
            "A dashboard and one alert you designed, with a sentence on what you would do when it fires",
            "A post-mortem of something you broke - this reads better than a green pipeline",
        ],
        "first_90_days": [
            "On-call shadowing and runbooks long before you own a change",
            "Small infrastructure pull requests with a senior reviewing every line",
            "Learning the blast radius of each system you touch",
        ],
        "tool_slugs": ["docker", "kubernetes", "terraform", "prometheus", "grafana"],
    },
]

FOCUS_DOMAINS = tuple(c["slug"] for c in CAREERS)

_REQUIRED = (
    "slug",
    "role_title",
    "reality",
    "postings_ask",
    "portfolio_expects",
    "first_90_days",
    "tool_slugs",
)


def _validate() -> None:
    """Fail at import, not at request time - the same rule projects.py follows."""
    roadmap_slugs = {r["slug"] for r in SEED_ROADMAPS}
    seen: set[str] = set()
    for career in CAREERS:
        slug = career.get("slug", "<missing>")
        missing = [key for key in _REQUIRED if not career.get(key)]
        if missing:
            raise ValueError(f"careers: '{slug}' is missing {missing}")
        if slug in seen:
            raise ValueError(f"careers: duplicate slug '{slug}'")
        seen.add(slug)
        if slug not in roadmap_slugs:
            raise ValueError(
                f"careers: '{slug}' is not a roadmap slug - a brief with no roadmap "
                f"renders nowhere. Known: {sorted(roadmap_slugs)}"
            )
        unknown = [t for t in career["tool_slugs"] if t not in CATALOG_SLUGS]
        if unknown:
            raise ValueError(
                f"careers: '{slug}' names tools not in the catalog: {unknown}"
            )


_validate()

_BY_SLUG = {c["slug"]: c for c in CAREERS}


def get_career(roadmap_slug: str) -> dict[str, Any] | None:
    """The brief for a roadmap, or None where none is written yet.

    None is a real answer: five roadmaps have no brief, and their pages say so
    rather than showing a generic one.
    """
    career = _BY_SLUG.get(roadmap_slug)
    if not career:
        return None
    return {**career, "authored": True, "reviewed": REVIEWED}
