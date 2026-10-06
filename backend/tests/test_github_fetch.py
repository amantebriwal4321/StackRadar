"""The GitHub fetchers: what a 200, 304, 404, 403, 5xx and a timeout each do.

test_github_auth.py pins the 401 path. This pins the rest of
fetch_github_repo_stats, because every score's star and fork inputs come through
it and the failure handling is where this function has already cost production
a two-hour hang: which statuses retry, which sleep, which give up at once, and
how the ETag cache lets an unchanged repo cost no rate limit.

No network: an httpx.MockTransport answers from a queue, and asyncio.sleep is
recorded rather than awaited.
"""

import asyncio
from datetime import timezone

import httpx
import pytest

from app.services import scraper as S

FULL = {"x-ratelimit-remaining": "4999", "x-ratelimit-limit": "5000"}
SPENT = {"x-ratelimit-remaining": "0", "x-ratelimit-limit": "5000"}

REPO = {
    "stargazers_count": 230000,
    "forks_count": 47000,
    "subscribers_count": 6500,
    "open_issues_count": 900,
    "description": "The library for web and native user interfaces",
    "homepage": "https://react.dev",
    "pushed_at": "2026-10-01T12:00:00Z",
}


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    S.reset_github_auth_state()
    S._etag_cache.clear()
    monkeypatch.setattr(S, "_rate_remaining", 5000)
    monkeypatch.setattr(S, "_rate_limit", 5000)
    yield
    S.reset_github_auth_state()
    S._etag_cache.clear()


@pytest.fixture
def gh(monkeypatch):
    """(queue, requests, sleeps, make_client). Queue items are Response args or
    an Exception to raise."""
    queue, requests, sleeps = [], [], []

    def handler(request):
        requests.append(request)
        item = queue.pop(0)
        if isinstance(item, Exception):
            raise item
        status, headers, body = item
        return httpx.Response(status, headers=headers, json=body)

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(S.asyncio, "sleep", fake_sleep)
    return (
        queue,
        requests,
        sleeps,
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


def fetch(make_client, repo="facebook/react"):
    async def go():
        async with make_client() as c:
            return await S.fetch_github_repo_stats(repo, client=c)

    return asyncio.run(go())


# --- a 200 ----------------------------------------------------------------------


def test_a_200_is_mapped_to_the_fields_the_scorer_reads(gh):
    queue, requests, sleeps, client = gh
    queue.append((200, FULL, REPO))

    result = fetch(client)

    assert result == {
        "stars": 230000,
        "forks": 47000,
        "watchers": 6500,
        "open_issues": 900,
        "description": "The library for web and native user interfaces",
        "homepage": "https://react.dev",
        "pushed_at": "2026-10-01T12:00:00Z",
    }
    assert sleeps == []
    assert str(requests[0].url) == "https://api.github.com/repos/facebook/react"


def test_a_sparse_repo_payload_degrades_to_zeroes_and_none(gh):
    queue, _, _, client = gh
    queue.append((200, FULL, {"homepage": ""}))

    result = fetch(client)

    assert result["stars"] == 0
    assert result["forks"] == 0
    assert result["homepage"] is None  # "" must not render as a docs link


def test_the_request_asks_for_the_pinned_api_version(gh):
    queue, requests, _, client = gh
    queue.append((200, FULL, REPO))
    fetch(client)
    assert requests[0].headers["x-github-api-version"] == "2022-11-28"
    assert "v3+json" in requests[0].headers["accept"]


def test_a_token_is_sent_as_a_bearer_credential_and_never_without_one(
    gh, monkeypatch
):
    queue, requests, _, client = gh
    monkeypatch.setattr(S.settings, "GITHUB_TOKEN", "ghp_test_token")
    queue.append((200, FULL, REPO))
    fetch(client)
    assert requests[0].headers["authorization"] == "Bearer ghp_test_token"

    monkeypatch.setattr(S.settings, "GITHUB_TOKEN", "")
    queue.append((200, FULL, REPO))
    fetch(client)
    assert "authorization" not in requests[1].headers


def test_a_moved_repo_is_followed_to_its_new_home(gh):
    """facebook/react answers 301 after a transfer; losing it loses the stats."""
    requests = []

    def handler(request):
        requests.append(str(request.url))
        if request.url.path == "/repos/old/name":
            return httpx.Response(
                301, headers={"location": "https://api.github.com/repos/new/name"}
            )
        return httpx.Response(200, headers=FULL, json=REPO)

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await S.fetch_github_repo_stats("old/name", client=c)

    assert asyncio.run(go())["stars"] == 230000
    assert requests == [
        "https://api.github.com/repos/old/name",
        "https://api.github.com/repos/new/name",
    ]


# --- the ETag cache ---------------------------------------------------------------


def test_a_304_returns_the_cached_stats_and_sends_the_etag(gh):
    queue, requests, sleeps, client = gh
    queue.append((200, {**FULL, "etag": 'W/"abc123"'}, REPO))
    first = fetch(client)

    queue.append((304, FULL, None))
    second = fetch(client)

    assert second == first
    assert "if-none-match" not in requests[0].headers
    assert requests[1].headers["if-none-match"] == 'W/"abc123"'
    assert sleeps == []


def test_a_new_200_replaces_the_cached_entry(gh):
    queue, requests, _, client = gh
    queue.append((200, {**FULL, "etag": '"v1"'}, REPO))
    fetch(client)
    queue.append((200, {**FULL, "etag": '"v2"'}, {**REPO, "stargazers_count": 231000}))
    fetch(client)
    queue.append((304, FULL, None))
    third = fetch(client)

    assert requests[2].headers["if-none-match"] == '"v2"'
    assert third["stars"] == 231000


def test_a_response_without_an_etag_is_not_cached(gh):
    queue, requests, _, client = gh
    queue.append((200, FULL, REPO))
    fetch(client)
    queue.append((200, FULL, REPO))
    fetch(client)
    assert "if-none-match" not in requests[1].headers


def test_the_etag_cache_is_per_repo(gh):
    queue, requests, _, client = gh
    queue.append((200, {**FULL, "etag": '"react"'}, REPO))
    fetch(client, "facebook/react")
    queue.append((200, FULL, REPO))
    fetch(client, "vuejs/core")
    assert "if-none-match" not in requests[1].headers


# --- errors: which ones retry, which sleep, which give up --------------------------


def test_a_404_gives_up_at_once_without_sleeping(gh):
    queue, requests, sleeps, client = gh
    queue.append((404, FULL, {"message": "Not Found"}))
    assert fetch(client, "ghost/repo") is None
    assert len(requests) == 1
    assert sleeps == []


def test_a_403_with_budget_left_is_not_a_rate_limit_and_does_not_wait(gh):
    """A permissions/abuse 403 with 4999 requests left: sleeping helps nothing."""
    queue, requests, sleeps, client = gh
    queue.append((403, FULL, {"message": "Forbidden"}))
    assert fetch(client) is None
    assert len(requests) == 1
    assert sleeps == []


def test_an_exhausted_rate_limit_waits_a_minute_then_succeeds(gh):
    queue, requests, sleeps, client = gh
    queue.append((403, SPENT, {"message": "API rate limit exceeded"}))
    queue.append((200, FULL, REPO))

    result = fetch(client)

    assert result["stars"] == 230000
    assert sleeps == [60]
    assert len(requests) == 2


def test_a_429_is_treated_like_an_exhausted_limit(gh):
    queue, _, sleeps, client = gh
    queue.append((429, SPENT, {}))
    queue.append((200, FULL, REPO))
    assert fetch(client)["stars"] == 230000
    assert sleeps == [60]


def test_a_limit_that_never_lifts_stops_after_three_attempts(gh):
    queue, requests, sleeps, client = gh
    queue.extend([(403, SPENT, {})] * 3)
    assert fetch(client) is None
    assert len(requests) == 3
    assert sleeps == [60, 60, 60]


def test_a_5xx_retries_with_backoff_then_gives_up(gh):
    queue, requests, sleeps, client = gh
    queue.extend([(502, FULL, {})] * 3)
    assert fetch(client) is None
    assert len(requests) == 3
    assert sleeps == [2.0, 5.0]


def test_a_5xx_that_recovers_returns_the_data(gh):
    queue, _, sleeps, client = gh
    queue.append((503, FULL, {}))
    queue.append((200, FULL, REPO))
    assert fetch(client)["stars"] == 230000
    assert sleeps == [2.0]


def test_an_unexpected_status_is_retried_not_trusted(gh):
    queue, requests, _, client = gh
    queue.extend([(418, FULL, {})] * 3)
    assert fetch(client) is None
    assert len(requests) == 3


def test_a_timeout_is_retried(gh):
    queue, requests, sleeps, client = gh
    queue.append(httpx.ReadTimeout("slow"))
    queue.append((200, FULL, REPO))
    assert fetch(client)["stars"] == 230000
    assert len(requests) == 2
    assert sleeps == [2.0]


def test_a_connection_error_gives_up_immediately(gh):
    """No point retrying a host we cannot reach three times over 7 seconds."""
    queue, requests, sleeps, client = gh
    queue.append(httpx.ConnectError("no route"))
    assert fetch(client) is None
    assert len(requests) == 1
    assert sleeps == []


def test_an_unparseable_200_is_retried_rather_than_crashing(gh):
    requests = []

    def handler(request):
        requests.append(1)
        return httpx.Response(200, headers=FULL, content=b"<html>not json</html>")

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await S.fetch_github_repo_stats("facebook/react", client=c)

    assert asyncio.run(go()) is None
    assert len(requests) == 3


# --- the rate budget --------------------------------------------------------------


def test_the_budget_is_read_from_every_response(gh):
    queue, _, _, client = gh
    queue.append((200, {"x-ratelimit-remaining": "321", "x-ratelimit-limit": "5000"}, REPO))
    fetch(client)
    assert S._rate_remaining == 321
    assert S._rate_limit == 5000


def test_a_missing_or_garbled_budget_header_keeps_the_last_known_value(gh):
    queue, _, _, client = gh
    queue.append((200, {"x-ratelimit-remaining": "lots"}, REPO))
    fetch(client)
    assert S._rate_remaining == 5000


@pytest.mark.parametrize(
    ("remaining", "delay"),
    [
        (5000, 0.3),
        (500, 0.3),
        (499, 1.0),
        (100, 1.0),
        (99, 5.0),
        (50, 5.0),
        (49, 15.0),
        (10, 15.0),
        (9, 60.0),
        (0, 60.0),
    ],
)
def test_the_delay_between_requests_grows_as_the_budget_shrinks(
    monkeypatch, remaining, delay
):
    monkeypatch.setattr(S, "_rate_remaining", remaining)
    assert S._adaptive_delay() == delay


# --- validate_github_token ---------------------------------------------------------


def validate(handler):
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await S.validate_github_token(c)

    return asyncio.run(go())


def test_a_valid_token_reports_the_authenticated_budget():
    core = validate(
        lambda r: httpx.Response(
            200, json={"resources": {"core": {"limit": 5000, "remaining": 4821}}}
        )
    )
    assert core == {"limit": 5000, "remaining": 4821}
    assert S._rate_limit == 5000
    assert S._rate_remaining == 4821


def test_a_missing_token_shows_up_as_the_unauthenticated_60():
    core = validate(
        lambda r: httpx.Response(
            200, json={"resources": {"core": {"limit": 60, "remaining": 58}}}
        )
    )
    assert core["limit"] == 60
    assert S._rate_limit == 60


def test_a_failing_rate_limit_check_returns_empty_not_an_exception():
    assert validate(lambda r: httpx.Response(500)) == {}

    def boom(request):
        raise httpx.ConnectError("down")

    assert validate(boom) == {}


# --- fetch_github_latest_release ----------------------------------------------------


def release(handler, repo="facebook/react"):
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await S.fetch_github_latest_release(repo, client=c)

    return asyncio.run(go())


def test_the_latest_release_gives_a_version_and_an_aware_date():
    got = release(
        lambda r: httpx.Response(
            200, json={"tag_name": "v19.1.0", "published_at": "2026-03-04T10:30:00Z"}
        )
    )
    assert got["version"] == "v19.1.0"
    assert got["published_at"].tzinfo is not None
    assert got["published_at"].utcoffset() == timezone.utc.utcoffset(None)
    assert got["published_at"].year == 2026


def test_a_release_with_no_tag_falls_back_to_its_name():
    got = release(
        lambda r: httpx.Response(
            200, json={"name": "Spring release", "published_at": None}
        )
    )
    assert got == {"version": "Spring release", "published_at": None}


def test_a_repo_that_cuts_no_releases_yields_none():
    assert release(lambda r: httpx.Response(404, json={"message": "Not Found"})) is None


def test_a_release_lookup_never_raises():
    def boom(request):
        raise httpx.ReadTimeout("slow")

    assert release(boom) is None
    assert release(lambda r: httpx.Response(200, json={"published_at": "garbage"})) is None


def test_a_rejected_token_skips_the_release_lookup_entirely():
    S._note_github_auth_failure()
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={})

    assert release(handler) is None
    assert calls == []
