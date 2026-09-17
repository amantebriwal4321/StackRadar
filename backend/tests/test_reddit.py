"""Reddit fetching against Reddit's real rate-limit behaviour, with no network.

Measured against the live endpoint: after a successful unauthenticated RSS
request Reddit sends x-ratelimit-remaining: 0 and x-ratelimit-reset: 27-51.
The old fetcher ignored that, paused a fixed 2s between 35 single-subreddit
requests, and quit after three 429s - production read 50 posts a cycle.
"""
import asyncio

import httpx
import pytest

from app.services import scraper as S


def rss(*posts):
    items = "".join(
        f"""<entry><title>{title}</title><link href="https://reddit.com/{i}"/>
        <category term="{sub}" label="r/{sub}"/><content type="html">{body}</content></entry>"""
        for i, (sub, title, body) in enumerate(posts)
    )
    return f'<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">{items}</feed>'


# --- _reddit_wait_seconds ------------------------------------------------------

def test_no_wait_while_budget_remains():
    assert S._reddit_wait_seconds({"x-ratelimit-remaining": "5", "x-ratelimit-reset": "40"}) == 0.0


def test_spent_budget_waits_for_the_reset_plus_margin():
    assert S._reddit_wait_seconds({"x-ratelimit-remaining": "0.0", "x-ratelimit-reset": "27"}) == 28.0


def test_wait_is_capped_so_a_bad_header_cannot_stall_the_scrape():
    assert S._reddit_wait_seconds({"x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999"}) == S.REDDIT_MAX_WAIT


def test_missing_or_garbage_headers():
    assert S._reddit_wait_seconds({}) == 0.0
    assert S._reddit_wait_seconds({"x-ratelimit-remaining": "0", "x-ratelimit-reset": "soon"}) == 61.0


# --- _reddit_posts_from_feed ---------------------------------------------------------

def test_subreddit_comes_from_each_entry_not_the_request():
    posts = S._reddit_posts_from_feed(
        rss(("rust", "Rust 2.0", "borrowck"), ("golang", "Go generics", "")), fallback_subreddit="MachineLearning"
    )
    assert [p["subreddit"] for p in posts] == ["rust", "golang"]
    assert posts[0]["title"] == "Rust 2.0" and posts[0]["source"] == "reddit"
    assert "borrowck" in posts[0]["description"]


def test_groups_cover_every_subreddit_once():
    assert len(S.REDDIT_SUBREDDITS) == len(set(S.REDDIT_SUBREDDITS)) == 35
    # One request per group is the whole point.
    assert len(S.REDDIT_SUBREDDIT_GROUPS) <= 5


# --- fetch_reddit end to end ----------------------------------------------------------

@pytest.fixture
def fake_reddit(monkeypatch):
    """Replay a scripted sequence of Reddit responses and record every sleep."""
    script, calls, sleeps = [], [], []

    def handler(request):
        calls.append(str(request.url))
        status, headers, body = script.pop(0)
        return httpx.Response(status, headers=headers, text=body)

    real_client = httpx.AsyncClient

    def client(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_client(*args, **kwargs)

    clock = [1000.0]

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        clock[0] += seconds  # time passes exactly as much as we slept

    monkeypatch.setattr(S.httpx, "AsyncClient", client)
    monkeypatch.setattr(S.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(S, "_reddit_clock", lambda: clock[0])
    return script, calls, sleeps


SPENT = {"x-ratelimit-remaining": "0.0", "x-ratelimit-reset": "30"}


def test_honours_the_reset_between_groups_and_reads_every_group(fake_reddit):
    script, calls, sleeps = fake_reddit
    for g in S.REDDIT_SUBREDDIT_GROUPS:
        script.append((200, SPENT, rss((g[0], "React 19 released", ""), (g[-1], "hello", ""))))

    posts = asyncio.run(S.fetch_reddit())

    assert len(calls) == len(S.REDDIT_SUBREDDIT_GROUPS)
    assert len(posts) == 2 * len(S.REDDIT_SUBREDDIT_GROUPS)
    assert sleeps == [31.0] * (len(S.REDDIT_SUBREDDIT_GROUPS) - 1)
    assert "r/programming+webdev+" in calls[0] and "limit=100" in calls[0]


def test_a_429_is_waited_out_and_retried_once(fake_reddit):
    script, calls, sleeps = fake_reddit
    script.append((429, {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "12"}, ""))
    script.append((200, {"x-ratelimit-remaining": "3"}, rss(("programming", "a", ""))))
    for g in S.REDDIT_SUBREDDIT_GROUPS[1:]:
        script.append((200, {"x-ratelimit-remaining": "3"}, rss((g[0], "b", ""))))

    posts = asyncio.run(S.fetch_reddit())

    assert sleeps == [13.0]
    assert calls[0] == calls[1]  # the same group, asked again
    assert len(posts) == len(S.REDDIT_SUBREDDIT_GROUPS)


def test_a_second_429_skips_only_that_group(fake_reddit):
    script, calls, sleeps = fake_reddit
    script.append((429, SPENT, ""))
    script.append((429, SPENT, ""))
    for g in S.REDDIT_SUBREDDIT_GROUPS[1:]:
        script.append((200, {"x-ratelimit-remaining": "3"}, rss((g[0], "b", ""))))

    posts = asyncio.run(S.fetch_reddit())

    assert len(posts) == len(S.REDDIT_SUBREDDIT_GROUPS) - 1
    assert len(calls) == len(S.REDDIT_SUBREDDIT_GROUPS) + 1


def test_stops_at_the_deadline_and_keeps_what_it_has(fake_reddit, monkeypatch):
    script, calls, sleeps = fake_reddit
    monkeypatch.setattr(S, "REDDIT_DEADLINE", 45.0)
    for g in S.REDDIT_SUBREDDIT_GROUPS:
        script.append((200, SPENT, rss((g[0], "x", ""))))

    posts = asyncio.run(S.fetch_reddit())

    # The first 31s wait fits inside 45s; a second one (62s) would not.
    assert len(calls) == 2 and len(posts) == 2
