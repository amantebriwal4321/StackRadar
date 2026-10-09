"""The learning-resource layer: ranking, staleness warnings and link verification.

This is the code behind every video link a learner sees, and the module's own
docstring calls its rule non-negotiable: a link is either returned by the YouTube
API with live statistics, or it is verified to exist. Until now none of it was
under test - the one test that touched it stubbed verify_youtube out entirely.
"""

import asyncio
import re
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.services import resources as R
from app.services.catalog import CATALOG_SLUGS

NOW = datetime.now(timezone.utc)


def days_ago(n):
    return NOW - timedelta(days=n)


# --- rank_resource: bounds and the four terms ---------------------------------


def test_an_empty_candidate_scores_zero():
    assert R.rank_resource({}) == 0.0


def test_the_score_never_exceeds_100_even_with_every_nudge():
    best = {
        "views": 10**9, "likes": 10**9, "published_at": NOW, "item_count": 500,
        "channel": "freeCodeCamp.org",
    }
    assert R.rank_resource(best) == 100.0


def test_reach_is_zero_at_the_floor_and_full_at_the_ceiling():
    # Likes 0 so engagement is 0; no date, no duration: reach is the whole score.
    assert R.rank_resource({"views": 2_000}) == 0.0
    assert R.rank_resource({"views": 5_000_000}) == pytest.approx(35.0)


def test_reach_is_logarithmic_so_one_viral_video_cannot_dominate():
    # 100k sits exactly halfway between 2k and 5M on a log scale.
    assert R.rank_resource({"views": 100_000}) == pytest.approx(17.5, abs=0.01)


def test_more_views_never_lowers_the_score():
    scores = [R.rank_resource({"views": v, "likes": v // 40}) for v in (1_000, 10_000, 100_000, 1_000_000)]
    assert scores == sorted(scores)


def test_engagement_saturates_at_five_percent_likes():
    base = {"views": 100_000}
    at_cap = R.rank_resource({**base, "likes": 5_000})
    way_over = R.rank_resource({**base, "likes": 60_000})
    half = R.rank_resource({**base, "likes": 2_500})
    assert at_cap == way_over == pytest.approx(42.5, abs=0.01)  # 17.5 reach + 25
    assert half == pytest.approx(30.0, abs=0.01)  # 17.5 reach + 12.5


def test_like_ratio_is_ignored_on_tiny_samples():
    # 400 views / 400 likes would read as a 100% ratio. Under 500 views the ratio
    # carries no information, so it must contribute nothing.
    assert R.rank_resource({"views": 400, "likes": 400}) == 0.0


def test_freshness_is_full_for_a_brand_new_video_and_decays_with_age():
    new = R.rank_resource({"published_at": NOW})
    old = R.rank_resource({"published_at": days_ago(780)})  # one time constant: 25/e
    older = R.rank_resource({"published_at": days_ago(3000)})
    assert new == pytest.approx(25.0, abs=0.05)
    assert old == pytest.approx(25 / 2.71828, abs=0.1)
    assert new > old > older > 0


def test_a_video_predating_the_current_release_by_over_a_year_is_halved():
    published = days_ago(400)
    plain = R.rank_resource({"published_at": published})
    penalised = R.rank_resource({"published_at": published}, release_at=NOW)
    assert penalised == pytest.approx(plain / 2, abs=0.05)


def test_no_penalty_when_the_video_is_within_a_year_of_the_release():
    published = days_ago(300)
    assert R.rank_resource({"published_at": published}, release_at=NOW) == R.rank_resource(
        {"published_at": published}
    )


def test_depth_for_a_playlist_is_course_length_capped_at_thirty_items():
    assert R.rank_resource({"item_count": 15}) == pytest.approx(7.5)
    assert R.rank_resource({"item_count": 30}) == pytest.approx(15.0)
    assert R.rank_resource({"item_count": 300}) == pytest.approx(15.0)


def test_depth_for_a_video_saturates_at_ninety_minutes():
    assert R.rank_resource({"duration_s": 2_700}) == pytest.approx(7.5)
    assert R.rank_resource({"duration_s": 5_400}) == pytest.approx(15.0)
    assert R.rank_resource({"duration_s": 36_000}) == pytest.approx(15.0)


def test_a_playlists_item_count_takes_priority_over_duration():
    assert R.rank_resource({"item_count": 15, "duration_s": 5_400}) == pytest.approx(7.5)


def test_a_trusted_channel_gets_a_small_nudge_never_a_gate():
    item = {"views": 100_000, "likes": 2_500, "item_count": 15}
    plain = R.rank_resource({**item, "channel": "Some Unknown Channel"})
    trusted = R.rank_resource({**item, "channel": "  Fireship "})  # case and padding
    assert trusted == pytest.approx(plain * 1.08, abs=0.02)
    assert plain > 0, "an unknown channel still ranks - the nudge is not a filter"


# --- staleness: the warning no other resource list has ------------------------


def test_no_warning_without_both_dates():
    assert R.staleness(None, NOW, "v1") is None
    assert R.staleness(NOW, None, "v1") is None


def test_no_warning_when_the_gap_is_under_a_year():
    assert R.staleness(days_ago(300), NOW, "v19") is None
    assert R.staleness(NOW, days_ago(100), "v19") is None, "published AFTER the release"


@pytest.mark.parametrize(
    "gap_days, expected",
    [
        (365, "Recorded ~1 year before the current release"),
        (547, "Recorded ~1 year before the current release"),  # 1.499y still rounds down
        (548, "Recorded ~2 years before the current release"),
        (730, "Recorded ~2 years before the current release"),
        (1460, "Recorded ~4 years before the current release"),
    ],
)
def test_warning_wording_and_pluralisation(gap_days, expected):
    assert R.staleness(days_ago(gap_days), NOW, None) == expected


def test_the_current_version_is_named_when_known():
    text = R.staleness(days_ago(730), NOW, "v19.2.0")
    assert text.endswith("(current v19.2.0)")


# --- parsing helpers ----------------------------------------------------------


@pytest.mark.parametrize(
    "iso, seconds",
    [("PT1H23M45S", 5025), ("PT45S", 45), ("PT10M", 600), ("PT2H", 7200), ("P1DT2H", 93600)],
)
def test_iso_durations_become_seconds(iso, seconds):
    assert R._parse_duration(iso) == seconds


@pytest.mark.parametrize("bad", ["", None, "garbage", "1H"])
def test_unparseable_durations_are_none(bad):
    assert R._parse_duration(bad) is None


def test_a_live_stream_has_zero_duration_not_an_error():
    # YouTube reports live and upcoming streams as P0D.
    assert R._parse_duration("P0D") == 0


def test_timestamps_parse_to_aware_datetimes():
    ts = R._parse_ts("2026-09-01T12:00:00Z")
    assert ts == datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)
    assert R._parse_ts("") is None and R._parse_ts("nonsense") is None


# --- verify_youtube: the fail-closed guarantee ---------------------------------


def oembed(responder):
    """An AsyncClient whose every request goes to `responder(request)`."""
    return httpx.AsyncClient(transport=httpx.MockTransport(responder))


def ok(title="React Course for Beginners", **extra):
    body = {"title": title, "author_name": "A Channel", "thumbnail_url": "https://i.ytimg.com/t.jpg", **extra}
    return lambda request: httpx.Response(200, json=body)


def verify(client_factory, vid="abcdefghijk", kind="video", keywords=("react",)):
    async def go():
        async with client_factory as client:
            return await R.verify_youtube(client, vid, kind, list(keywords))

    return asyncio.run(go())


def test_a_live_on_topic_video_is_returned_with_its_real_metadata():
    result = verify(oembed(ok()))
    assert result["title"] == "React Course for Beginners"
    assert result["url"] == "https://www.youtube.com/watch?v=abcdefghijk"
    assert result["channel"] == "A Channel"
    assert result["thumbnail"] == "https://i.ytimg.com/t.jpg"
    assert result["source"] == "curated" and result["kind"] == "video"


def test_stats_are_never_fabricated_for_a_curated_link():
    # oEmbed has no view or like counts, so the fields stay null and the UI omits
    # them rather than inventing engagement numbers.
    result = verify(oembed(ok()))
    assert all(result[k] is None for k in ("views", "likes", "duration_s", "item_count", "published_at"))


def test_a_playlist_gets_a_playlist_url_and_asks_oembed_about_that_url():
    seen = {}

    def responder(request):
        seen["url"] = request.url.params["url"]
        return httpx.Response(200, json={"title": "React series", "author_name": "x", "thumbnail_url": "t"})

    result = verify(oembed(responder), vid="PLabc123", kind="playlist")
    assert result["url"] == "https://www.youtube.com/playlist?list=PLabc123"
    assert seen["url"] == "https://www.youtube.com/playlist?list=PLabc123"


@pytest.mark.parametrize("status", [401, 403, 404, 429, 500, 503])
def test_a_non_200_is_dropped_even_when_the_body_parses_and_looks_on_topic(status):
    # The body is deliberately valid JSON with a matching title. With an empty
    # body, r.json() raises and the blanket except hides whether the status check
    # does anything at all - a mutation test caught exactly that gap. An error page
    # that echoes a title must not be linked.
    body = {"title": "React Course for Beginners", "author_name": "x", "thumbnail_url": "t"}
    assert verify(oembed(lambda r: httpx.Response(status, json=body))) is None


def test_a_dead_or_private_video_with_the_real_empty_error_body_is_dropped():
    assert verify(oembed(lambda r: httpx.Response(404, text="Not Found"))) is None
    assert verify(oembed(lambda r: httpx.Response(401, text="Unauthorized"))) is None


def test_a_network_failure_fails_closed_instead_of_raising():
    def boom(request):
        raise httpx.ConnectError("no route to host")

    assert verify(oembed(boom)) is None


def test_a_non_json_200_fails_closed():
    assert verify(oembed(lambda r: httpx.Response(200, text="<html>captcha</html>"))) is None


def test_a_mistyped_id_resolving_to_an_unrelated_video_is_rejected():
    # The failure the keyword check exists for: the id is live, it is just the
    # wrong video.
    assert verify(oembed(ok("Top 10 Cat Videos of 2026"))) is None


def test_keyword_matching_ignores_case():
    assert verify(oembed(ok("REACT HOOKS EXPLAINED"))) is not None


def test_any_one_keyword_is_enough():
    assert verify(oembed(ok("Learning Golang From Scratch")), keywords=("go", "golang")) is not None


def test_with_no_keywords_the_check_is_existence_only():
    assert verify(oembed(ok("Anything At All")), keywords=()) is not None


# --- curated_videos / curated_first_url -----------------------------------------


@pytest.fixture
def curated(monkeypatch):
    """Three candidates for one fake tool, with a switchable oEmbed."""
    monkeypatch.setitem(
        R.CURATED_VIDEOS,
        "faketool",
        [("aaaaaaaaaaa", "video", ["fake"]), ("bbbbbbbbbbb", "video", ["fake"]), ("PLccccccccccc", "playlist", ["fake"])],
    )
    state = {"dead": set(), "calls": []}

    def handler(request):
        url = request.url.params["url"]
        state["calls"].append(url)
        if any(dead in url for dead in state["dead"]):
            return httpx.Response(404)
        return httpx.Response(200, json={"title": "Fake Tool Course", "author_name": "x", "thumbnail_url": "t"})

    real = httpx.AsyncClient
    monkeypatch.setattr(
        R.httpx, "AsyncClient", lambda *a, **kw: real(*a, **{**kw, "transport": httpx.MockTransport(handler)})
    )
    return state


def test_an_unknown_tool_has_no_videos_and_makes_no_requests(curated):
    assert asyncio.run(R.curated_videos("not-a-tool")) == []
    assert curated["calls"] == []


def test_verified_videos_keep_curated_order_with_descending_synthetic_scores(curated):
    out = asyncio.run(R.curated_videos("faketool"))
    assert [v["url"][-11:] for v in out[:2]] == ["aaaaaaaaaaa", "bbbbbbbbbbb"]
    scores = [v["rank_score"] for v in out]
    assert scores == sorted(scores, reverse=True) and scores[0] < 100


def test_a_dead_candidate_is_skipped_and_the_rest_survive(curated):
    curated["dead"].add("aaaaaaaaaaa")
    out = asyncio.run(R.curated_videos("faketool"))
    assert len(out) == 2 and all("aaaaaaaaaaa" not in v["url"] for v in out)


def test_if_every_candidate_fails_the_result_is_empty_not_an_error(curated):
    curated["dead"].update({"aaaaaaaaaaa", "bbbbbbbbbbb", "PLccccccccccc"})
    assert asyncio.run(R.curated_videos("faketool")) == []


def test_limit_is_respected(curated):
    assert len(asyncio.run(R.curated_videos("faketool", limit=1))) == 1


def test_first_url_is_built_without_any_network(monkeypatch):
    monkeypatch.setitem(R.CURATED_VIDEOS, "vidtool", [("abcdefghijk", "video", ["x"])])
    monkeypatch.setitem(R.CURATED_VIDEOS, "pltool", [("PLzzzzzzzzzzz", "playlist", ["x"])])
    assert R.curated_first_url("vidtool") == {"url": "https://www.youtube.com/watch?v=abcdefghijk", "kind": "video"}
    assert R.curated_first_url("pltool") == {"url": "https://www.youtube.com/playlist?list=PLzzzzzzzzzzz", "kind": "playlist"}
    assert R.curated_first_url("nothing-here") is None


# --- the curated data itself ----------------------------------------------------


def test_every_curated_slug_is_a_real_catalog_tool():
    # A typo here would mean the videos are curated, verified, and never shown.
    assert set(R.CURATED_VIDEOS) <= set(CATALOG_SLUGS)


def test_every_catalog_tool_has_a_curated_fallback():
    assert set(CATALOG_SLUGS) <= set(R.CURATED_VIDEOS)


def test_curated_entries_are_well_formed():
    for slug, entries in R.CURATED_VIDEOS.items():
        seen = set()
        for vid, kind, keywords in entries:
            assert kind in ("video", "playlist"), (slug, vid)
            pattern = r"[A-Za-z0-9_-]{11}" if kind == "video" else r"(PL|UU|OL|FL|RD)[A-Za-z0-9_-]{10,}"
            assert re.fullmatch(pattern, vid), f"{slug}: {vid!r} is not a valid {kind} id"
            assert keywords and all(k == k.lower().strip() and k for k in keywords), (slug, vid)
            assert vid not in seen, f"{slug}: duplicate id {vid}"
            seen.add(vid)


def test_trusted_and_hindi_channel_names_are_normalised_lowercase():
    # rank_resource lowercases and strips the channel before the lookup, so a
    # mixed-case entry in either set could never match anything.
    for name in R.TRUSTED_CHANNELS | R.HINDI_CHANNELS:
        assert name == name.lower().strip()


# --- term_in_title: a short tool name must not match inside another word -------

# Each of these passed the old `term in title` gate as an on-topic video for the
# tool named in the first column.
SUBSTRING_FALSE_POSITIVES = [
    ("go", "Django Tutorial for Beginners"),
    ("go", "Google Cloud Full Course"),
    ("go", "MongoDB Crash Course"),
    ("go", "Algorithms and Data Structures"),
    ("bun", "Bundle size optimisation with Webpack"),
    ("zap", "Zapier Automation Tutorial"),
    ("rust", "Why you can't Trust AI code"),
    ("pod", "The best podcast for developers"),
]


@pytest.mark.parametrize(("term", "title"), SUBSTRING_FALSE_POSITIVES)
def test_a_term_inside_another_word_is_not_a_match(term, title):
    assert R.term_in_title(term, title) is False


@pytest.mark.parametrize(
    ("term", "title"),
    [
        ("go", "Learn Go in 1 hour"),
        ("go", "Go: a crash course"),
        ("go", "Go-lang tutorial"),
        ("bun", "Bun 1.0 is here"),
        ("rust", "Rust for beginners"),
        ("rust", "Rust, a first project"),
        ("next", "Next.js Crash Course"),
        ("next", "Nextjs 14 tutorial"),
        ("fine-tun", "Fine-tuning BERT for text classification"),
        ("pod", "Kubernetes pods explained"),
        ("api", "Build REST APIs with FastAPI"),
        ("short", "Full-Stack URL Shortener with Next.js"),
        ("RAG", "Production rag with LangChain"),
    ],
)
def test_real_uses_of_a_term_still_match(term, title):
    assert R.term_in_title(term, title) is True


def test_an_empty_term_matches_anything():
    assert R.term_in_title("", "whatever") is True


def test_a_regex_character_in_a_term_is_literal():
    assert R.term_in_title("c++", "C++ for beginners") is True
    assert R.term_in_title("c++", "Cxx for beginners") is False


def test_verify_youtube_rejects_a_short_keyword_hiding_in_another_word():
    assert verify(oembed(ok("Django Full Course")), keywords=("go",)) is None
    assert verify(oembed(ok("Learn Go in One Hour")), keywords=("go",)) is not None


# --- fetch_youtube: the API escapes its snippet text; we must not show it so ---


def test_html_escaped_snippet_text_from_the_api_is_decoded(monkeypatch):
    monkeypatch.setattr(R.settings, "YOUTUBE_API_KEY", "test-key")

    async def fake_yt_get(client, path, params):
        if path == "search":
            return {
                "items": [
                    {
                        "id": {"kind": "youtube#video", "videoId": "abcdefghijk"},
                        "snippet": {
                            "title": "Debouncing &amp; Abort Controller &quot;React&quot; &#39;25",
                            "channelTitle": "Dev &amp; Ops",
                            "description": "Q&amp;A",
                            "publishedAt": "2026-01-01T00:00:00Z",
                        },
                    }
                ]
            }
        return {
            "items": [
                {
                    "id": "abcdefghijk",
                    "statistics": {"viewCount": "100000", "likeCount": "5000"},
                    "contentDetails": {"duration": "PT10M"},
                }
            ]
        }

    monkeypatch.setattr(R, "_yt_get", fake_yt_get)
    [item] = asyncio.run(R.fetch_youtube("React", limit=1))
    assert item["title"] == "Debouncing & Abort Controller \"React\" '25"
    assert item["channel"] == "Dev & Ops"
    assert item["blurb"] == "Q&A"


# --- naive timestamps from the database (SQLite) must not crash the ranking -----------


def test_rank_resource_accepts_a_naive_release_date_from_the_database():
    """`published_at` is aware (parsed from the API); `release_at` comes off a
    DateTime(timezone=True) column, which SQLite returns naive. Comparing them
    raised TypeError."""
    naive_release = NOW.replace(tzinfo=None)
    item = {"views": 100_000, "likes": 4000, "published_at": days_ago(900), "duration_s": 3000}
    aware = R.rank_resource(item, release_at=NOW)
    assert R.rank_resource(item, release_at=naive_release) == aware


def test_staleness_accepts_naive_and_aware_dates_in_any_mix():
    published = days_ago(800)
    expected = R.staleness(published, NOW, "v2")
    assert expected is not None
    assert R.staleness(published.replace(tzinfo=None), NOW.replace(tzinfo=None), "v2") == expected
    assert R.staleness(published, NOW.replace(tzinfo=None), "v2") == expected
    assert R.staleness(published.replace(tzinfo=None), NOW, "v2") == expected
