"""A rejected GitHub token must fail fast, not stall the scrape.

Production sat on "4/8 Fetching GitHub stats" for 90+ minutes and went 36
hours without fresh data. The cause: 401 was handled in the same branch as
429, so a rejected token slept 60s per attempt per repo. One repo took 253
seconds measured locally; 31 repos is over two hours. The log even read
"rate limit hit (rate: 5000/5000)" - a full budget and a rate limit at once.
"""
import asyncio

import httpx
import pytest

from app.services import scraper as S


@pytest.fixture(autouse=True)
def fresh_auth_state():
    S.reset_github_auth_state()
    yield
    S.reset_github_auth_state()


@pytest.fixture
def github(monkeypatch):
    responses, calls, sleeps = [], [], []

    def handler(request):
        calls.append(str(request.url))
        status, headers, payload = responses.pop(0)
        return httpx.Response(status, headers=headers, json=payload)

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(S.asyncio, "sleep", fake_sleep)
    return responses, calls, sleeps, lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))


FULL_BUDGET = {"x-ratelimit-remaining": "5000", "x-ratelimit-limit": "5000"}
SPENT_BUDGET = {"x-ratelimit-remaining": "0", "x-ratelimit-limit": "5000"}


def test_401_returns_immediately_without_sleeping(github):
    responses, calls, sleeps, client = github
    responses.append((401, FULL_BUDGET, {"message": "Bad credentials"}))

    async def run():
        async with client() as c:
            return await S.fetch_github_repo_stats("facebook/react", client=c)

    assert asyncio.run(run()) is None
    assert sleeps == [], "a rejected token must never sleep; that is the 2-hour hang"
    assert len(calls) == 1, "and must not retry"


def test_401_skips_the_remaining_repos_in_the_cycle(github):
    responses, calls, sleeps, client = github
    responses.append((401, FULL_BUDGET, {"message": "Bad credentials"}))

    async def run():
        async with client() as c:
            first = await S.fetch_github_repo_stats("facebook/react", client=c)
            second = await S.fetch_github_repo_stats("rust-lang/rust", client=c)
            third = await S.fetch_github_latest_release("rust-lang/rust", client=c)
            return first, second, third

    assert asyncio.run(run()) == (None, None, None)
    assert len(calls) == 1, "one 401 is enough; the other 30 repos are not asked"
    assert S.github_auth_failed() is True


def test_a_new_cycle_gives_a_rotated_token_another_chance(github):
    responses, calls, sleeps, client = github
    responses.append((401, FULL_BUDGET, {"message": "Bad credentials"}))
    responses.append((200, FULL_BUDGET, {"stargazers_count": 5, "forks_count": 1, "open_issues_count": 0}))

    async def run():
        async with client() as c:
            await S.fetch_github_repo_stats("facebook/react", client=c)
            S.reset_github_auth_state()
            return await S.fetch_github_repo_stats("facebook/react", client=c)

    stats = asyncio.run(run())
    assert stats and stats["stars"] == 5
    assert len(calls) == 2


def test_403_with_budget_left_is_not_treated_as_a_rate_limit(github):
    responses, calls, sleeps, client = github
    responses.append((403, FULL_BUDGET, {"message": "Forbidden"}))

    async def run():
        async with client() as c:
            return await S.fetch_github_repo_stats("some/repo", client=c)

    assert asyncio.run(run()) is None
    assert sleeps == []


def test_a_genuinely_exhausted_budget_still_waits(github):
    responses, calls, sleeps, client = github
    responses.append((429, SPENT_BUDGET, {"message": "rate limited"}))
    responses.append((200, SPENT_BUDGET, {"stargazers_count": 9, "forks_count": 2, "open_issues_count": 0}))

    async def run():
        async with client() as c:
            return await S.fetch_github_repo_stats("some/repo", client=c)

    stats = asyncio.run(run())
    assert sleeps == [60], "a real rate limit is still waited out"
    assert stats and stats["stars"] == 9


def test_success_leaves_the_auth_flag_clear(github):
    responses, calls, sleeps, client = github
    responses.append((200, FULL_BUDGET, {"stargazers_count": 1, "forks_count": 0, "open_issues_count": 0}))

    async def run():
        async with client() as c:
            return await S.fetch_github_repo_stats("a/b", client=c)

    assert asyncio.run(run())["stars"] == 1
    assert S.github_auth_failed() is False
