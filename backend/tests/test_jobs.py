"""Job demand parsed from Hacker News hiring threads.

The numbers this produces are shown to learners as career evidence, so the
parsing has to be right about what it counts: job posts, not replies; companies
hiring, not candidates looking.
"""

import asyncio

import httpx
import pytest

from app.services import jobs as J

SLUGS = {"react", "rust", "kubernetes", "docker", "go"}


# --- which thread counts as demand -------------------------------------------


@pytest.mark.parametrize(
    "title",
    [
        "Ask HN: Who is hiring? (September 2026)",
        "ASK HN: WHO IS HIRING? (JULY 2026)",
    ],
)
def test_the_monthly_hiring_thread_is_demand(title):
    assert J.is_hiring_thread(title) is True


@pytest.mark.parametrize(
    "title",
    [
        # Candidates advertising themselves. Counting these would measure
        # supply and label it demand.
        "Ask HN: Who wants to be hired? (September 2026)",
        "Ask HN: Freelancer? Seeking freelancer? (September 2026)",
        None,
        "",
    ],
)
def test_everything_else_is_not(title):
    assert J.is_hiring_thread(title) is False


# --- parsing the posts --------------------------------------------------------


def test_only_top_level_comments_count_as_job_posts():
    thread = {
        "children": [
            {"text": "Acme | Senior <b>Rust</b> engineer | Remote", "children": [{"text": "Is this React?"}]},
            {"text": "Globex | Kubernetes SRE | Berlin"},
        ]
    }
    posts = J.job_posts_from_thread(thread)
    assert len(posts) == 2, "replies are discussion, not postings"
    assert "Rust" in posts[0] and "<b>" not in posts[0]


def test_deleted_and_empty_comments_are_skipped():
    thread = {"children": [{"text": None}, {"text": "   "}, {"text": "Acme | Go dev"}]}
    assert J.job_posts_from_thread(thread) == ["Acme | Go dev"]


def test_no_thread_at_all():
    assert J.job_posts_from_thread(None) == []
    assert J.job_posts_from_thread({}) == []


def test_html_entities_are_decoded_so_matching_sees_real_words():
    # "React&#x2F;Next" must become "React/Next", or the word-boundary matcher
    # never sees "React" and the post is counted as mentioning nothing.
    [post] = J.job_posts_from_thread({"children": [{"text": "Node.js &amp; React&#x2F;Next"}]})
    assert "&amp;" not in post and "&#x2F;" not in post
    assert J.count_skills([post], SLUGS)["react"] == 1


# --- counting -----------------------------------------------------------------


def test_a_post_counts_once_however_often_it_repeats_the_word():
    counts = J.count_skills(["We use React. React everywhere. Did we say React?"], SLUGS)
    assert counts["react"] == 1


def test_counts_are_per_post_across_the_sample():
    counts = J.count_skills(
        ["Rust and Kubernetes", "React shop", "Rust again"], SLUGS
    )
    assert counts["rust"] == 2 and counts["kubernetes"] == 1 and counts["react"] == 1


def test_every_requested_slug_is_present_even_at_zero():
    # A zero must be reportable as "not mentioned in this sample" rather than
    # silently missing from the payload.
    counts = J.count_skills(["Nothing relevant here"], SLUGS)
    assert set(counts) == SLUGS and set(counts.values()) == {0}


def test_word_boundaries_hold_in_job_prose():
    counts = J.count_skills(["We are going to Dockerize nothing"], SLUGS)
    assert counts["go"] == 0, "'going' is not Go"


# --- the period label ----------------------------------------------------------


def test_period_spans_the_threads_sampled():
    assert J.format_period(["2026-09-01T15:00:00Z", "2026-08-03T15:00:00Z", "2026-07-01T15:00:00Z"]) == "Jul-Sep 2026"


def test_period_of_a_single_month():
    assert J.format_period(["2026-09-01T15:00:00Z"]) == "Sep 2026"


def test_period_across_a_year_boundary():
    assert J.format_period(["2027-01-05T00:00:00Z", "2026-12-01T00:00:00Z"]) == "Dec 2026-Jan 2027"


def test_period_survives_garbage_timestamps():
    assert J.format_period(["not a date"]) == "unknown period"
    assert J.format_period([]) == "unknown period"


# --- fetch_job_demand end to end -------------------------------------------------


def thread_hit(object_id, title, created_at):
    return {"objectID": object_id, "title": title, "created_at": created_at}


@pytest.fixture
def fake_hn(monkeypatch):
    routes, calls = {}, []

    def handler(request):
        calls.append(str(request.url))
        for fragment, payload in routes.items():
            if fragment in str(request.url):
                status, body = payload
                return httpx.Response(status, json=body)
        return httpx.Response(404, json={})

    real = httpx.AsyncClient

    def client(*a, **kw):
        kw["transport"] = httpx.MockTransport(handler)
        return real(*a, **kw)

    async def no_sleep(_):
        return None

    monkeypatch.setattr(J.httpx, "AsyncClient", client)
    monkeypatch.setattr(J.asyncio, "sleep", no_sleep)
    return routes, calls


def test_counts_across_three_threads_with_sample_size_and_period(fake_hn):
    routes, calls = fake_hn
    routes["search_by_date"] = (
        200,
        {
            "hits": [
                thread_hit("3", "Ask HN: Who is hiring? (September 2026)", "2026-09-01T15:00:00Z"),
                # Must be ignored: these are candidates, not employers.
                thread_hit("99", "Ask HN: Who wants to be hired? (September 2026)", "2026-09-01T15:00:00Z"),
                thread_hit("2", "Ask HN: Who is hiring? (August 2026)", "2026-08-03T15:00:00Z"),
                thread_hit("1", "Ask HN: Who is hiring? (July 2026)", "2026-07-01T15:00:00Z"),
            ]
        },
    )
    routes["items/3"] = (200, {"children": [{"text": "Acme | React"}, {"text": "Globex | Kubernetes"}]})
    routes["items/2"] = (200, {"children": [{"text": "Initech | React and Docker"}]})
    routes["items/1"] = (200, {"children": [{"text": "Hooli | Rust"}]})

    demand = asyncio.run(J.fetch_job_demand(SLUGS))

    assert demand["sample_size"] == 4
    assert demand["period"] == "Jul-Sep 2026"
    assert demand["counts"]["react"] == 2
    assert demand["counts"]["go"] == 0
    assert not any("99" in c for c in calls), "the candidates thread must never be fetched"


def test_only_the_requested_number_of_threads_is_fetched(fake_hn):
    routes, calls = fake_hn
    routes["search_by_date"] = (
        200,
        {"hits": [thread_hit(str(i), f"Ask HN: Who is hiring? ({i})", "2026-09-01T15:00:00Z") for i in range(1, 6)]},
    )
    for i in range(1, 6):
        routes[f"items/{i}"] = (200, {"children": [{"text": "Acme | Go"}]})

    demand = asyncio.run(J.fetch_job_demand(SLUGS, threads=2))
    assert demand["sample_size"] == 2
    assert len([c for c in calls if "items/" in c]) == 2


def test_a_failed_search_returns_none_rather_than_zeroes(fake_hn):
    routes, _ = fake_hn
    routes["search_by_date"] = (503, {})
    # None means "keep what you had". Zeroes would publish "nobody is hiring
    # for React", which is a false claim, not a missing one.
    assert asyncio.run(J.fetch_job_demand(SLUGS)) is None


def test_no_hiring_thread_in_the_results_returns_none(fake_hn):
    routes, _ = fake_hn
    routes["search_by_date"] = (
        200,
        {"hits": [thread_hit("1", "Ask HN: Who wants to be hired? (September 2026)", "2026-09-01T15:00:00Z")]},
    )
    assert asyncio.run(J.fetch_job_demand(SLUGS)) is None


def test_threads_that_parse_to_nothing_return_none(fake_hn):
    routes, _ = fake_hn
    routes["search_by_date"] = (
        200,
        {"hits": [thread_hit("1", "Ask HN: Who is hiring? (September 2026)", "2026-09-01T15:00:00Z")]},
    )
    routes["items/1"] = (200, {"children": []})
    assert asyncio.run(J.fetch_job_demand(SLUGS)) is None


def test_one_unreachable_thread_does_not_lose_the_others(fake_hn):
    routes, _ = fake_hn
    routes["search_by_date"] = (
        200,
        {
            "hits": [
                thread_hit("3", "Ask HN: Who is hiring? (September 2026)", "2026-09-01T15:00:00Z"),
                thread_hit("2", "Ask HN: Who is hiring? (August 2026)", "2026-08-03T15:00:00Z"),
            ]
        },
    )
    routes["items/3"] = (500, {})
    routes["items/2"] = (200, {"children": [{"text": "Initech | Rust"}]})

    demand = asyncio.run(J.fetch_job_demand(SLUGS))
    assert demand["sample_size"] == 1 and demand["counts"]["rust"] == 1
