"""Job demand, measured from Hacker News "Ask HN: Who is hiring?" threads.

WHY THIS EXISTS. The momentum score is ~75% GitHub stars and forks, so it
measures how popular a project is, not whether the skill gets anyone hired. The
product's advice to a learner rested entirely on popularity. This is one
measured demand signal to put beside it.

WHY THIS SOURCE. It is free, needs no API key, and every post is a real company
saying what they will pay for this month. Measured while building: three threads
(Jul-Sep 2026) parse to 756 job posts covering 24 of the 31 tracked tools -
React 171, Kubernetes 72, Rust 65, Docker 50, Terraform 43, Next.js 42.
Arbeitnow covered 12/31 and Remotive's free feed caps at 20 postings, so both
were rejected as thinner.

WHAT IT IS NOT. One monthly thread from one (US, startup-heavy) community is a
sample, not the job market, and it is deliberately NOT fed into the score - see
scoring.SIGNAL_EPOCH for why changing the score's inputs is expensive. Every
surface that shows these numbers must show the sample size and the period with
them, so the reader can judge the claim: "53 of 260 companies hiring on Hacker
News in September 2026 mentioned React."
"""

from __future__ import annotations

import asyncio
import html
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from app.services.scoring import classify_text_to_tools

logger = logging.getLogger(__name__)

HIRING_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date"
HN_ITEM_URL = "https://hn.algolia.com/api/v1/items"

# Three months smooths a quiet month without reaching back to postings that have
# been filled. Each thread is one request.
HIRING_THREADS = 3

# The monthly threads are posted by the `whoishiring` account, which also posts
# "Who wants to be hired?" (candidates) and "Freelancer?" - neither is demand.
HIRING_AUTHOR_TAG = "story,author_whoishiring"

_TAG_RE = re.compile(r"<[^>]+>")


def is_hiring_thread(title: str | None) -> bool:
    """True only for the monthly "Who is hiring?" thread.

    The companion "Who WANTS to be hired?" thread is people looking for work.
    Counting it would measure supply and label it demand.
    """
    t = (title or "").lower()
    return "who is hiring" in t and "wants to be hired" not in t


def strip_html(text: str | None) -> str:
    """HN comment bodies are HTML fragments; matching needs plain text."""
    return html.unescape(_TAG_RE.sub(" ", text or ""))


def job_posts_from_thread(item: dict[str, Any] | None) -> list[str]:
    """The job posts in one thread: its TOP-LEVEL comments, as plain text.

    Only top-level comments are postings. Replies are discussion ("is this
    remote?"), and counting them would weight a chatty thread as more hiring.
    """
    posts: list[str] = []
    for child in (item or {}).get("children") or []:
        text = strip_html(child.get("text"))
        if text.strip():
            posts.append(text)
    return posts


def count_skills(posts: list[str], slugs: set[str]) -> dict[str, int]:
    """How many POSTS mention each tool - one per post, never per occurrence.

    Reuses the same word-boundary matcher the mention pipeline uses, so "go"
    does not match "going" and a job post repeating "React" six times still
    counts once.
    """
    counts = dict.fromkeys(slugs, 0)
    for post in posts:
        for slug in classify_text_to_tools(post) & slugs:
            counts[slug] += 1
    return counts


def format_period(created_ats: list[str]) -> str:
    """Human label for the span the sample covers, e.g. "Jul-Sep 2026"."""
    months: list[datetime] = []
    for raw in created_ats:
        try:
            months.append(datetime.fromisoformat(str(raw).replace("Z", "+00:00")))
        except ValueError:
            continue
    if not months:
        return "unknown period"
    lo, hi = min(months), max(months)
    if (lo.year, lo.month) == (hi.year, hi.month):
        return lo.strftime("%b %Y")
    if lo.year == hi.year:
        return f"{lo:%b}-{hi:%b} {hi.year}"
    return f"{lo:%b %Y}-{hi:%b %Y}"


async def _get_json(
    client: httpx.AsyncClient, url: str, **kwargs: Any
) -> dict[str, Any] | None:
    try:
        response = await client.get(url, timeout=30.0, **kwargs)
        if response.status_code != 200:
            logger.warning(f"HN hiring: {url} returned {response.status_code}")
            return None
        return response.json()
    except (httpx.HTTPError, ValueError) as e:
        logger.warning(f"HN hiring: {url} failed: {e}")
        return None


async def fetch_job_demand(
    slugs: set[str], threads: int = HIRING_THREADS
) -> dict[str, Any] | None:
    """Count how many recent job posts mention each tool.

    Returns None on any failure, so callers keep whatever they had rather than
    publishing a zero that reads as "nobody is hiring for this".
    """
    async with httpx.AsyncClient(follow_redirects=True) as client:
        found = await _get_json(
            client,
            HIRING_SEARCH_URL,
            params={"tags": HIRING_AUTHOR_TAG, "hitsPerPage": threads * 3},
        )
        if not found:
            return None

        hits = [h for h in found.get("hits", []) if is_hiring_thread(h.get("title"))][
            :threads
        ]
        if not hits:
            logger.warning(
                "HN hiring: no 'Who is hiring?' thread in the search results"
            )
            return None

        posts: list[str] = []
        for hit in hits:
            item = await _get_json(client, f"{HN_ITEM_URL}/{hit['objectID']}")
            posts.extend(job_posts_from_thread(item))
            await asyncio.sleep(0.3)

    if not posts:
        logger.warning("HN hiring: threads found but no job posts parsed")
        return None

    counts = count_skills(posts, slugs)
    period = format_period([h.get("created_at", "") for h in hits])
    logger.info(
        f"HN hiring: {len(posts)} job posts across {len(hits)} threads ({period}); "
        f"{sum(1 for v in counts.values() if v)} of {len(slugs)} tools mentioned"
    )
    return {
        "counts": counts,
        "sample_size": len(posts),
        "period": period,
        "threads": [h.get("title") for h in hits],
        "fetched_at": datetime.now(timezone.utc),
    }
