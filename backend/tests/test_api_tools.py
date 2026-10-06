"""The tool endpoints: listing, ranking, pagination, compare, detail, history.

test_api.py proves the app boots and the health routes behave. These are the
endpoints every page reads, and the properties a page silently depends on:
that a tie in score does not make pagination repeat or skip a row, that the
compare page's series colours (assigned by position) follow the order it asked
for, that rank and percentile agree with each other, and that bad input is a
4xx and never a 500.

Scores are set directly on the seeded tools and restored after each test.
"""

import math
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.clock import utcnow_naive
from app.db.session import SessionLocal
from app.models.all_models import Domain, Tool, ToolSnapshot

API = "/api/v1"


@pytest.fixture(scope="module")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def scores():
    """scores({'react': 90, ...}) sets those scores, and every OTHER tool to 0.
    Everything is restored afterwards."""
    db = SessionLocal()
    original = {t.slug: t.score for t in db.query(Tool).all()}

    def apply(mapping):
        for t in db.query(Tool).all():
            t.score = mapping.get(t.slug, 0.0)
        db.commit()

    yield apply
    for t in db.query(Tool).all():
        t.score = original[t.slug]
    db.commit()
    db.close()


def listing(client, **params):
    r = client.get(f"{API}/tools", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def all_slugs(client):
    return [t["slug"] for t in listing(client, per_page=100)["tools"]]


# --- ordering ---------------------------------------------------------------------


def test_tools_come_back_highest_score_first(client, scores):
    scores({"react": 90, "vuejs": 80, "svelte": 70})
    assert all_slugs(client)[:3] == ["react", "vuejs", "svelte"]


def test_a_tie_in_score_is_broken_by_slug_so_the_order_is_deterministic(client, scores):
    """On a fresh or never-scraped database EVERY tool ties at 0. Without a
    tie-break the order is whatever the database returns, which on Postgres can
    differ between two queries - and pagination issues one query per page."""
    scores({})
    slugs = all_slugs(client)
    assert slugs == sorted(slugs)


def test_pages_of_a_fully_tied_list_cover_every_tool_exactly_once(client, scores):
    scores({})
    seen = []
    page = 1
    while True:
        body = listing(client, per_page=7, page=page)
        seen += [t["slug"] for t in body["tools"]]
        if page >= body["total_pages"]:
            break
        page += 1
    assert len(seen) == len(set(seen)), "a tool appeared on two pages"
    assert sorted(seen) == sorted(all_slugs(client)), "a tool was skipped"


def test_by_domain_orders_each_domains_tools_by_score_then_slug(client, scores):
    # astro sorts before react by slug but comes AFTER it in the catalog, so only
    # a real tie-break (not insertion order) can put astro first.
    scores({"react": 50, "astro": 50, "svelte": 90})
    domains = client.get(f"{API}/tools/by-domain").json()["domains"]
    web = next(d for d in domains if d["slug"] == "web-development")
    order = [t["slug"] for t in web["tools"]]
    assert order[0] == "svelte"
    assert order.index("astro") < order.index("react")  # tie -> slug order


# --- rank and percentile ------------------------------------------------------------


def test_rank_percentile_and_category_rank_agree_with_the_order(client, scores):
    scores({"react": 90, "vuejs": 80, "svelte": 70})
    tools = {t["slug"]: t for t in listing(client, per_page=100)["tools"]}
    assert (tools["react"]["rank"], tools["vuejs"]["rank"]) == (1, 2)
    assert tools["react"]["percentile"] == 100
    last = max(tools.values(), key=lambda t: t["rank"])
    assert last["percentile"] == 0
    assert tools["react"]["rank_in_category"] == 1
    assert tools["vuejs"]["rank_in_category"] == 2
    assert tools["react"]["category_size"] >= 3


def test_ranks_are_a_permutation_of_one_to_n(client, scores):
    scores({"react": 90, "nextjs": 40})
    ranks = sorted(t["rank"] for t in listing(client, per_page=100)["tools"])
    assert ranks == list(range(1, len(ranks) + 1))


def test_a_filtered_list_keeps_each_tools_global_rank(client, scores):
    scores({"react": 90, "pytorch": 85, "vuejs": 80})
    web = listing(client, category="Web Development", per_page=100)["tools"]
    assert next(t for t in web if t["slug"] == "vuejs")["rank"] == 3  # pytorch is 2nd overall


# --- pagination and filtering --------------------------------------------------------


def test_pagination_metadata_is_consistent(client):
    total = len(all_slugs(client))
    body = listing(client, per_page=10, page=2)
    assert body["total"] == total
    assert body["page"] == 2
    assert body["per_page"] == 10
    assert body["total_pages"] == math.ceil(total / 10)
    assert len(body["tools"]) == min(10, total - 10)


def test_a_page_past_the_end_is_empty_not_an_error(client):
    body = listing(client, page=999)
    assert body["tools"] == []
    assert body["total"] > 0


def test_the_category_filter_is_case_insensitive_and_changes_the_total(client):
    everything = listing(client, per_page=100)["total"]
    web = listing(client, category="web development", per_page=100)
    assert 0 < web["total"] < everything
    assert {t["category"] for t in web["tools"]} == {"Web Development"}


def test_an_unknown_category_is_an_empty_list_not_a_404(client):
    body = listing(client, category="no-such-domain")
    assert body["tools"] == [] and body["total"] == 0 and body["total_pages"] == 0


@pytest.mark.parametrize(
    "params",
    [{"per_page": 0}, {"per_page": 101}, {"per_page": -1}, {"page": 0}, {"page": "x"}],
)
def test_bad_paging_parameters_are_a_422_never_a_500(client, params):
    assert client.get(f"{API}/tools", params=params).status_code == 422


def test_a_hostile_category_string_is_just_a_string(client):
    r = client.get(f"{API}/tools", params={"category": "'; DROP TABLE tools;--"})
    assert r.status_code == 200 and r.json()["tools"] == []
    assert listing(client)["total"] > 0


def test_every_listed_tool_carries_the_fields_the_ui_reads(client):
    needed = {
        "slug", "name", "icon", "category", "score", "stage", "rank", "percentile",
        "growth_pct", "learning_priority", "last_7_scores", "jobs_mentions",
        "parent_slug", "github_repo", "level", "is_entry_point",
    }  # fmt: skip
    for t in listing(client, per_page=100)["tools"]:
        assert needed <= t.keys(), f"{t['slug']} is missing {needed - t.keys()}"


def test_parent_slug_resolves_to_a_real_tool(client):
    tools = listing(client, per_page=100)["tools"]
    slugs = {t["slug"] for t in tools}
    parents = {t["parent_slug"] for t in tools if t["parent_slug"]}
    assert parents and parents <= slugs


# --- compare -------------------------------------------------------------------------


def compare(client, slugs):
    return client.get(f"{API}/tools/compare", params={"slugs": slugs})


def test_compare_returns_tools_in_the_order_requested(client):
    """The page colours series by index; database order would swap them."""
    for requested in (["react", "vuejs"], ["vuejs", "react"], ["svelte", "react", "vuejs"]):
        body = compare(client, ",".join(requested)).json()
        assert [t["slug"] for t in body["tools"]] == requested


def test_compare_tolerates_spaces_and_empty_segments(client):
    body = compare(client, " react , ,vuejs,").json()
    assert [t["slug"] for t in body["tools"]] == ["react", "vuejs"]


def test_comparing_a_tool_with_itself_is_a_clear_400(client):
    r = compare(client, "react,react")
    assert r.status_code == 400
    assert "different" in r.json()["detail"]


@pytest.mark.parametrize("slugs", ["", "react", ",,,"])
def test_fewer_than_two_slugs_is_a_400(client, slugs):
    assert compare(client, slugs).status_code == 400


def test_more_than_five_tools_is_a_400(client):
    assert compare(client, "react,vuejs,svelte,astro,nextjs,vite").status_code == 400


def test_duplicates_do_not_count_toward_the_five_tool_limit(client):
    body = compare(client, "react,react,vuejs,vuejs,svelte,astro,nextjs").json()
    assert [t["slug"] for t in body["tools"]] == ["react", "vuejs", "svelte", "astro", "nextjs"]


def test_unknown_slugs_are_named_in_the_404(client):
    r = compare(client, "react,nope-1,nope-2")
    assert r.status_code == 404
    assert "nope-1" in r.json()["detail"] and "nope-2" in r.json()["detail"]


def test_one_unknown_slug_among_two_valid_ones_is_ignored(client):
    body = compare(client, "react,nope,vuejs")
    assert body.status_code == 200
    assert [t["slug"] for t in body.json()["tools"]] == ["react", "vuejs"]


def test_every_compared_tool_carries_a_history_list(client):
    for t in compare(client, "react,vuejs").json()["tools"]:
        assert isinstance(t["history"], list)
        assert t["sentiment_label"] in {"positive", "negative", "neutral"}


# --- detail and history --------------------------------------------------------------


def test_tool_detail_matches_the_listing_for_the_shared_fields(client):
    listed = next(t for t in listing(client, per_page=100)["tools"] if t["slug"] == "react")
    detail = client.get(f"{API}/tools/react").json()
    for key in ("slug", "name", "category", "score", "stage"):
        assert detail[key] == listed[key]


def test_an_unknown_tool_is_a_404(client):
    assert client.get(f"{API}/tools/nope").status_code == 404


def test_an_invalid_slug_is_a_422_that_explains_the_format(client):
    r = client.get(f"{API}/tools/REACT")
    assert r.status_code == 422
    assert "lowercase" in r.json()["detail"]


@pytest.mark.parametrize("days", [0, -1, 99999, "abc"])
def test_history_rejects_a_bad_window(client, days):
    assert client.get(f"{API}/tools/react/history", params={"days": days}).status_code == 422


def test_history_of_an_unknown_tool_is_a_404(client):
    assert client.get(f"{API}/tools/nope/history").status_code == 404


@pytest.fixture
def react_history():
    """Three react snapshots - today, 5 days ago and 40 days ago - inserted OUT
    of chronological order, then removed."""
    db = SessionLocal()
    react = db.query(Tool).filter(Tool.slug == "react").first()
    now = utcnow_naive()
    rows = [
        ToolSnapshot(tool_id=react.id, score=20.0, recorded_at=now - timedelta(days=5)),
        ToolSnapshot(tool_id=react.id, score=30.0, recorded_at=now),
        ToolSnapshot(tool_id=react.id, score=10.0, recorded_at=now - timedelta(days=40)),
    ]
    db.add_all(rows)
    db.commit()
    ids = [r.id for r in rows]
    yield
    db.query(ToolSnapshot).filter(ToolSnapshot.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_history_is_oldest_first_and_inside_the_window(client, react_history):
    body = client.get(f"{API}/tools/react/history", params={"days": 30}).json()
    assert [p["score"] for p in body["data"]] == [20.0, 30.0]  # the 40-day-old one is out
    dates = [p["date"] for p in body["data"]]
    assert dates == sorted(dates)
    assert body["days"] == 30 and body["slug"] == "react"


def test_a_wider_window_includes_the_older_snapshot_in_order(client, react_history):
    body = client.get(f"{API}/tools/react/history", params={"days": 90}).json()
    assert [p["score"] for p in body["data"]] == [10.0, 20.0, 30.0]


def test_history_with_no_snapshots_is_an_empty_list_not_an_error(client):
    body = client.get(f"{API}/tools/vite/history", params={"days": 30})
    assert body.status_code == 200 and body.json()["data"] == []


def test_compare_history_covers_only_the_last_30_days_oldest_first(client, react_history):
    react = next(t for t in compare(client, "react,vuejs").json()["tools"] if t["slug"] == "react")
    assert [h["score"] for h in react["history"]] == [20.0, 30.0]


def test_the_sparkline_is_the_last_seven_days_oldest_first(client, react_history):
    react = next(t for t in listing(client, per_page=100)["tools"] if t["slug"] == "react")
    assert react["last_7_scores"] == [20.0, 30.0]


def test_bulk_history_rejects_a_bad_window(client):
    for days in (0, -5, 100000):
        assert client.get(f"{API}/tools/history/bulk", params={"days": days}).status_code == 422


def bulk(client, **params):
    r = client.get(f"{API}/tools/history/bulk", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_bulk_history_defaults_to_the_twelve_highest_scoring_tools(client, scores):
    scores({"react": 90, "vuejs": 80, "svelte": 70})
    body = bulk(client, days=7)
    assert len(body["tools"]) == 12
    assert [t["slug"] for t in body["tools"]][:3] == ["react", "vuejs", "svelte"]


def test_bulk_history_limit_can_cover_every_tool(client):
    assert len(bulk(client, days=7, limit=31)["tools"]) == len(all_slugs(client))


def test_bulk_history_honours_the_slugs_in_the_order_given(client):
    body = bulk(client, slugs="vuejs,react,svelte")
    assert [t["slug"] for t in body["tools"]] == ["vuejs", "react", "svelte"]


def test_bulk_history_rejects_a_malformed_slug(client):
    r = client.get(f"{API}/tools/history/bulk", params={"slugs": "react,NOT A SLUG"})
    assert r.status_code == 422


def test_bulk_history_with_no_matching_tools_is_empty_not_an_error(client):
    assert bulk(client, slugs="nope") == {"days": 30, "dates": [], "tools": []}


def test_bulk_series_is_aligned_to_the_shared_date_axis(client, react_history):
    body = bulk(client, slugs="react,vuejs", days=30)
    assert len(body["dates"]) == 2  # today and 5 days ago; the 40-day-old is out
    assert body["dates"] == sorted(body["dates"])
    react, vue = body["tools"]
    assert [p["score"] for p in react["series"]] == [20.0, 30.0]
    # vuejs has no reading on either day: null, never an invented value.
    assert vue["series"] == [None, None]


def test_two_readings_on_one_day_are_one_point_and_the_last_wins(client, react_history):
    db = SessionLocal()
    try:
        react = db.query(Tool).filter(Tool.slug == "react").first()
        noon_today = utcnow_naive().replace(hour=23, minute=59, second=0, microsecond=0)
        extra = ToolSnapshot(tool_id=react.id, score=99.0, recorded_at=noon_today)
        db.add(extra)
        db.commit()
        body = bulk(client, slugs="react", days=30)
        assert len(body["dates"]) == 2
        assert [p["score"] for p in body["tools"][0]["series"]] == [20.0, 99.0]
    finally:
        db.query(ToolSnapshot).filter(ToolSnapshot.score == 99.0).delete()
        db.commit()
        db.close()


# --- domains -------------------------------------------------------------------------


def test_every_domain_lists_and_has_a_learning_path(client):
    domains = client.get(f"{API}/domains").json()
    assert len(domains) == 8
    for d in domains:
        r = client.get(f"{API}/domains/{d['slug']}/learning-path")
        assert r.status_code == 200
        assert r.json()["domain_slug"] == d["slug"]


def test_domain_tool_counts_add_up_to_the_catalog(client):
    domains = client.get(f"{API}/domains").json()
    assert sum(d["tool_count"] for d in domains) == len(all_slugs(client))


def test_an_unknown_domain_learning_path_is_a_404(client):
    assert client.get(f"{API}/domains/nope/learning-path").status_code == 404


def test_the_learning_path_groups_by_level_beginner_first(client):
    path = client.get(f"{API}/domains/web-development/learning-path").json()
    levels = [step["level"] for step in path["path"]]
    assert levels == [lv for lv in ("beginner", "intermediate", "advanced") if lv in levels]
    assert len(levels) >= 2
    for step in path["path"]:
        assert step["tools"], "an empty level should not be listed"
        seqs = [t["learning_sequence_score"] for t in step["tools"]]
        assert seqs == sorted(seqs)


def test_the_learning_path_names_an_entry_tool_from_its_own_domain(client):
    path = client.get(f"{API}/domains/ai-ml/learning-path").json()
    members = {t["slug"] for step in path["path"] for t in step["tools"]}
    assert path["entry"] in members


def test_domain_rows_exist_for_every_catalog_category(client):
    db = SessionLocal()
    try:
        assert {t.category for t in db.query(Tool).all()} <= {d.name for d in db.query(Domain).all()}
    finally:
        db.close()
