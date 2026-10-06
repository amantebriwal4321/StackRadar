"""The Dev.to and RSS fetchers.

Each returns "no data from this source" ([]) on any failure, which is the
contract the scheduler depends on: it concatenates every source as a list, so a
source that raised - or returned something that is not a list - would abort the
whole scrape cycle rather than cost one source. No network: the AsyncClient the
fetchers build internally is replaced with one on a MockTransport.
"""

import asyncio

import httpx
import pytest

from app.services import scraper as S


@pytest.fixture
def serve(monkeypatch):
    """serve(handler) routes every request the fetchers make to `handler`."""
    real = httpx.AsyncClient

    def install(handler):
        monkeypatch.setattr(
            S.httpx,
            "AsyncClient",
            lambda **kw: real(transport=httpx.MockTransport(handler), **kw),
        )

    return install


# --- Dev.to -------------------------------------------------------------------


def devto():
    return asyncio.run(S.fetch_devto())


ARTICLES = [
    {"title": "Learning Rust", "description": "a first week", "tag_list": ["rust"]},
    {"title": "Docker tips", "description": "layers", "tag_list": ["docker", "devops"]},
]


def test_devto_articles_are_returned_as_the_api_sent_them(serve):
    serve(lambda r: httpx.Response(200, json=ARTICLES))
    assert devto() == ARTICLES


def test_devto_asks_for_the_top_hundred(serve):
    seen = {}

    def handler(request):
        seen.update(dict(request.url.params))
        return httpx.Response(200, json=[])

    serve(handler)
    devto()
    assert seen == {"per_page": "100", "top": "1"}


@pytest.mark.parametrize("status", [404, 429, 500, 503])
def test_a_devto_http_error_means_no_data_not_a_crash(serve, status):
    # A body that WOULD be accepted as articles, so only the status check can
    # be what rejects it (an error object would be caught by the list guard and
    # hide whether the status check does anything).
    serve(lambda r: httpx.Response(status, json=ARTICLES))
    assert devto() == []


def test_a_devto_network_error_means_no_data(serve):
    def down(request):
        raise httpx.ConnectError("unreachable")

    serve(down)
    assert devto() == []


def test_a_devto_body_that_is_not_json_means_no_data(serve):
    serve(lambda r: httpx.Response(200, content=b"<html>maintenance</html>"))
    assert devto() == []


@pytest.mark.parametrize(
    "body",
    [
        {"error": "rate limited", "status": 429},  # an error object with a 200
        "ok",
        42,
        None,
    ],
)
def test_a_devto_200_that_is_not_a_list_means_no_data(serve, body):
    """The scheduler does hn + devto + reddit + news; a dict there is a TypeError
    that kills the cycle, not just this source."""
    serve(lambda r: httpx.Response(200, json=body))
    assert devto() == []


def test_non_object_entries_in_the_devto_list_are_dropped(serve):
    serve(lambda r: httpx.Response(200, json=[ARTICLES[0], "stray", None, 7, ARTICLES[1]]))
    assert devto() == ARTICLES


# --- RSS ------------------------------------------------------------------------


def rss(*items, title="Feed"):
    body = "".join(
        f"<item><title>{t}</title><link>{link}</link>"
        + (f"<description>{d}</description>" if d is not None else "")
        + "</item>"
        for t, link, d in items
    )
    return (
        '<?xml version="1.0"?><rss version="2.0"><channel>'
        f"<title>{title}</title>{body}</channel></rss>"
    )


def news():
    return asyncio.run(S.fetch_tech_news())


def test_each_entry_carries_title_link_summary_source_and_feed(serve):
    serve(
        lambda r: httpx.Response(
            200, text=rss(("Kubernetes 1.34 ships", "https://x.test/k8s", "Sidecars are GA"))
        )
    )
    articles = news()

    first = articles[0]
    assert first["title"] == "Kubernetes 1.34 ships"
    assert first["url"] == "https://x.test/k8s"
    assert first["description"] == "Sidecars are GA"
    assert first["source"] == "news"
    assert first["feed"] == S.RSS_FEEDS[0]


def test_an_entry_without_a_summary_gets_an_empty_description(serve):
    serve(lambda r: httpx.Response(200, text=rss(("No blurb", "https://x.test/a", None))))
    assert news()[0]["description"] == ""


def test_every_configured_feed_is_asked_once(serve):
    asked = []

    def handler(request):
        asked.append(str(request.url))
        return httpx.Response(200, text=rss())

    serve(handler)
    news()
    assert asked == S.RSS_FEEDS


def test_at_most_25_entries_are_taken_per_feed(serve):
    many = [(f"Post {n}", f"https://x.test/{n}", "b") for n in range(40)]
    serve(lambda r: httpx.Response(200, text=rss(*many)))
    articles = news()
    per_feed = len(articles) // len(S.RSS_FEEDS)
    assert per_feed == 25
    assert articles[24]["title"] == "Post 24"
    assert articles[25]["feed"] == S.RSS_FEEDS[1]  # the 26th starts the next feed


def test_a_non_200_feed_is_skipped_and_the_rest_still_read(serve):
    good = rss(("Item", "https://x.test/i", "b"))

    def handler(request):
        if str(request.url) == S.RSS_FEEDS[0]:
            # A valid feed body behind a 503: only the status check excludes it.
            return httpx.Response(503, text=good)
        return httpx.Response(200, text=good)

    serve(handler)
    articles = news()
    assert len(articles) == len(S.RSS_FEEDS) - 1
    assert all(a["feed"] != S.RSS_FEEDS[0] for a in articles)


def test_a_feed_that_raises_does_not_stop_the_others(serve):
    def handler(request):
        if str(request.url) == S.RSS_FEEDS[1]:
            raise httpx.ReadTimeout("slow feed")
        return httpx.Response(200, text=rss(("Item", "https://x.test/i", "b")))

    serve(handler)
    feeds = {a["feed"] for a in news()}
    assert S.RSS_FEEDS[1] not in feeds
    assert len(feeds) == len(S.RSS_FEEDS) - 1


def test_a_feed_serving_garbage_contributes_nothing_and_breaks_nothing(serve):
    serve(lambda r: httpx.Response(200, text="this is not xml at all"))
    assert news() == []


def test_the_feed_list_has_no_duplicates_and_is_all_https():
    assert len(S.RSS_FEEDS) == len(set(S.RSS_FEEDS))
    assert all(u.startswith("https://") for u in S.RSS_FEEDS)
