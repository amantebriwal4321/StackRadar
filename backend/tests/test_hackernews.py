"""Targeted Hacker News search.

The front page is a weak tool signal - measured, 4 of 99 stories named any
tracked tool. Asking the index which stories mention each tool works, but only
with typo tolerance off: fuzzy search returned "US and Denmark reach deal over
Greenland's security" for `react` (18 useful hits, 56 junk). Exact matching
measured 34 useful, 0 junk.
"""
import asyncio

import httpx
import pytest

from app.services import scraper as S
from app.services.scoring import classify_text_to_tools, primary_keywords


# --- query construction --------------------------------------------------------

def test_query_is_quoted_and_typo_tolerance_is_off():
    p = S._hn_search_params("react", 1_700_000_000)
    assert p["query"] == '"react"'
    assert p["typoTolerance"] == "false"
    assert p["advancedSyntax"] == "true"
    assert p["restrictSearchableAttributes"] == "title,story_text"
    assert p["tags"] == "story"


def test_window_is_passed_as_an_algolia_numeric_filter():
    assert S._hn_search_params("rust", 1_700_000_000)["numericFilters"] == "created_at_i>1700000000"


def test_search_window_is_a_timestamp_in_the_past():
    import time
    now = int(time.time())
    since = S.hn_search_since(48)
    assert now - 48 * 3600 - 5 <= since <= now - 48 * 3600 + 5


# --- hit mapping ----------------------------------------------------------------

def test_story_text_becomes_description_because_that_is_what_matching_reads():
    [item] = S._hn_items_from_hits([{"objectID": "1", "title": "Why we moved to Rust", "story_text": "from Go"}])
    assert item["description"] == "from Go"
    assert classify_text_to_tools(f"{item['title']} {item['description']}") >= {"rust"}


def test_url_falls_back_to_the_discussion_for_a_self_post():
    [item] = S._hn_items_from_hits([{"objectID": "42", "title": "Ask HN"}])
    assert item["url"] == "https://news.ycombinator.com/item?id=42"


def test_hits_without_an_id_are_dropped():
    assert S._hn_items_from_hits([{"title": "no id"}]) == []


# --- merging with the front page ---------------------------------------------------

def test_a_story_in_both_sources_is_counted_once():
    top = [{"id": 7, "title": "Rust 2.0", "source": "hackernews"}]
    searched = [{"id": "7", "title": "Rust 2.0 (search copy)"}, {"id": "9", "title": "Kubernetes tips"}]
    merged = S.merge_hn_sources(top, searched)
    assert [m["title"] for m in merged] == ["Rust 2.0", "Kubernetes tips"]


def test_merge_keeps_both_sources_when_they_do_not_overlap():
    assert len(S.merge_hn_sources([{"id": 1}], [{"id": "2"}])) == 2


def test_merge_survives_items_with_no_id():
    assert len(S.merge_hn_sources([{"title": "x"}], [{"id": "2"}])) == 2


# --- fetch_hackernews_search ---------------------------------------------------------

@pytest.fixture
def fake_hn(monkeypatch):
    responses, calls = [], []

    def handler(request):
        calls.append(request.url)
        status, payload = responses.pop(0)
        return httpx.Response(status, json=payload)

    real = httpx.AsyncClient

    def client(*a, **kw):
        kw["transport"] = httpx.MockTransport(handler)
        return real(*a, **kw)

    async def no_sleep(_):
        return None

    monkeypatch.setattr(S.httpx, "AsyncClient", client)
    monkeypatch.setattr(S.asyncio, "sleep", no_sleep)
    return responses, calls


def test_one_query_per_keyword_and_stories_deduplicated_across_them(fake_hn):
    responses, calls = fake_hn
    responses.append((200, {"hits": [{"objectID": "1", "title": "Rust and Go"}]}))
    responses.append((200, {"hits": [{"objectID": "1", "title": "Rust and Go"}, {"objectID": "2", "title": "Go 1.25"}]}))

    items = asyncio.run(S.fetch_hackernews_search(["rust", "go"], 1_700_000_000))

    assert len(calls) == 2
    assert [i["id"] for i in items] == ["1", "2"]
    assert all(i["source"] == "hackernews" for i in items)


def test_a_failing_keyword_does_not_lose_the_others(fake_hn):
    responses, _ = fake_hn
    responses.append((503, {}))
    responses.append((200, {"hits": [{"objectID": "5", "title": "Kubernetes"}]}))
    assert len(asyncio.run(S.fetch_hackernews_search(["rust", "kubernetes"], 0))) == 1


def test_no_keywords_makes_no_requests(fake_hn):
    _, calls = fake_hn
    assert asyncio.run(S.fetch_hackernews_search([], 0)) == []
    assert calls == []


def test_every_catalog_tool_contributes_a_keyword():
    from app.services.catalog import TOOLS
    assert len(primary_keywords()) == len({t["slug"] for t in TOOLS})
