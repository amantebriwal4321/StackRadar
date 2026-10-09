"""perform_full_scrape, end to end, with every source faked.

This is the loop the whole product turns on - fetch, classify, score, persist,
aggregate - and it was only ever exercised by running it against live services.
Here each external call is replaced (the sources, the GitHub calls, the
sentiment model) and the real pipeline runs against the test database, so what
is asserted is what the code does with data, not what the internet returned.

The tool, domain and snapshot rows the pipeline writes are restored after every
test.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.clock import utcnow_naive
from app.db.session import SessionLocal
from app.models.all_models import Domain, Tool, ToolSnapshot
from app.services import scheduler as S

HN_TOP = [
    {"id": 1, "title": "React 19 is great news for everyone"},
    {"id": 2, "title": "Show HN: a cat that codes"},
]
HN_SEARCH = [
    {"id": 1, "title": "React 19 is great news for everyone"},  # duplicate of the above
    {"id": 3, "title": "Why I stopped using Docker for local dev"},
]
DEVTO = [
    {"title": "Getting started", "description": "a tour of Rust and Docker", "tag_list": ["rust"]},
]
REDDIT = [{"title": "Vue or React for a first project?", "subreddit": "webdev"}]
NEWS = [{"title": "Kubernetes 1.34 ships", "description": "great sidecar support"}]

REPO_STATS = {
    "facebook/react": {"stars": 230_000, "forks": 47_000, "open_issues": 900, "watchers": 6500,
                       "homepage": "https://react.dev"},
    "rust-lang/rust": {"stars": 100_000, "forks": 13_000},
}  # fmt: skip


@pytest.fixture(scope="module", autouse=True)
def _booted():
    from app.main import app

    with TestClient(app):
        yield


@pytest.fixture
def world(monkeypatch):
    """Fake every outside dependency and snapshot what the pipeline will touch."""
    calls = {"release": 0, "repo": []}
    state = {"sources": {}, "release_ok": True}

    async def hn():
        return list(state["sources"].get("hn", HN_TOP))

    async def hn_search(keywords, since):
        return list(state["sources"].get("hn_search", HN_SEARCH))

    async def devto():
        return [dict(i) for i in state["sources"].get("devto", DEVTO)]

    async def reddit():
        src = state["sources"].get("reddit", REDDIT)
        if isinstance(src, Exception):
            raise src
        return [dict(i) for i in src]

    async def news():
        return [dict(i) for i in state["sources"].get("news", NEWS)]

    async def sentiment(items, batch_size=20):
        for item in items:
            title = item.get("title", "").lower()
            item["sentiment"] = (
                "positive" if "great" in title else "negative" if "stopped" in title else "neutral"
            )
        return items

    async def validate_token(client):
        return {}

    async def repo_stats(repo, client=None):
        calls["repo"].append(repo)
        return REPO_STATS.get(repo)

    async def release(repo, client=None):
        calls["release"] += 1
        if not state["release_ok"]:
            return None
        return {"version": "v9.9.9", "published_at": datetime.now(timezone.utc)}

    async def no_jobs(slugs):
        return None

    async def no_sleep(seconds):
        pass

    monkeypatch.setattr(S, "fetch_hackernews", hn)
    monkeypatch.setattr(S, "fetch_hackernews_search", hn_search)
    monkeypatch.setattr(S, "fetch_devto", devto)
    monkeypatch.setattr(S, "fetch_reddit", reddit)
    monkeypatch.setattr(S, "fetch_tech_news", news)
    monkeypatch.setattr(S, "batch_sentiment_analysis", sentiment)
    monkeypatch.setattr(S, "validate_github_token", validate_token)
    monkeypatch.setattr(S, "fetch_github_repo_stats", repo_stats)
    monkeypatch.setattr(S, "fetch_github_latest_release", release)
    monkeypatch.setattr(S, "fetch_job_demand", no_jobs)
    monkeypatch.setattr(S.asyncio, "sleep", no_sleep)
    monkeypatch.setattr(S, "github_auth_failed", lambda: state.get("auth_failed", False))

    db = SessionLocal()
    cols = {
        Tool: [c.key for c in Tool.__table__.columns],
        Domain: [c.key for c in Domain.__table__.columns],
    }
    saved = {
        model: {row.id: {k: getattr(row, k) for k in keys} for row in db.query(model).all()}
        for model, keys in cols.items()
    }
    first_snapshot_id = (db.query(ToolSnapshot.id).order_by(ToolSnapshot.id.desc()).first() or (0,))[0]
    db.close()

    S.scrape_status["errors"] = []
    yield calls, state

    db = SessionLocal()
    db.query(ToolSnapshot).filter(ToolSnapshot.id > first_snapshot_id).delete()
    for model, rows in saved.items():
        for row in db.query(model).all():
            for k, v in rows[row.id].items():
                setattr(row, k, v)
    db.commit()
    db.close()
    S.scrape_status["errors"] = []


def run():
    return asyncio.run(S.perform_full_scrape())


def tool(slug):
    db = SessionLocal()
    try:
        t = db.query(Tool).filter(Tool.slug == slug).one()
        db.expunge(t)
        return t
    finally:
        db.close()


def snapshots(slug):
    db = SessionLocal()
    try:
        t = db.query(Tool).filter(Tool.slug == slug).one()
        return db.query(ToolSnapshot).filter(ToolSnapshot.tool_id == t.id).order_by(ToolSnapshot.id).all()
    finally:
        db.close()


# --- a clean cycle ------------------------------------------------------------------


def test_a_clean_cycle_returns_true_and_updates_every_tool(world):
    assert run() is True
    assert S.scrape_status["tools_updated"] == 31
    assert S.scrape_status["is_running"] is False
    assert S.scrape_status["current_step"] is None
    assert S.scrape_status["errors"] == []


def test_the_status_reports_how_much_each_source_gave(world):
    run()
    sources = S.scrape_status["sources"]
    assert sources["hackernews"] == 3  # the duplicate story counted once
    assert sources["hackernews_search"] == 2
    assert (sources["devto"], sources["reddit"], sources["news"]) == (1, 1, 1)
    assert sources["github_repos"] == 2  # only react and rust returned stats


def test_sentiment_totals_cover_every_item_fetched(world):
    run()
    s = S.scrape_status["sentiment"]
    assert s["total"] == 3 + 1 + 1 + 1
    assert s["positive"] + s["negative"] + s["neutral"] == s["total"]
    # The fake model reads TITLES: "great" in the React story, "stopped" in the
    # Docker one. (The Kubernetes blurb says "great" in its description only.)
    assert (s["positive"], s["negative"]) == (1, 1)


def test_github_stats_reach_the_tool_rows(world):
    run()
    react = tool("react")
    assert (react.stars, react.forks, react.open_issues) == (230_000, 47_000, 900)
    assert react.homepage == "https://react.dev"
    assert react.github_stars == react.stars


def test_a_tool_github_could_not_fetch_keeps_its_previous_stars(world):
    db = SessionLocal()
    vue = db.query(Tool).filter(Tool.slug == "vuejs").one()
    vue.stars = 12345
    db.commit()
    db.close()
    run()
    assert tool("vuejs").stars == 12345


def test_mentions_are_counted_per_source_from_the_full_text(world):
    run()
    react, docker, rust, k8s = tool("react"), tool("docker"), tool("rust"), tool("kubernetes")
    assert react.hn_count == 1  # one story, though both HN lists carried it
    assert react.reddit_count == 1
    assert docker.hn_count == 1  # "stopped using Docker"
    assert docker.devto_count == 1  # named only in the DESCRIPTION
    assert rust.devto_count == 1
    assert k8s.news_count == 1
    assert react.mention_count == react.hn_count + react.devto_count + react.reddit_count + react.news_count


def test_scores_follow_the_signals(world):
    run()
    react, rust, vue = tool("react"), tool("rust"), tool("vuejs")
    assert react.score > rust.score > vue.score > 0  # vue: one mention, no stats


def test_a_tools_score_does_not_depend_on_another_tools_signals(world):
    run()
    before = tool("rust").score
    REPO_STATS_BACKUP = dict(REPO_STATS)
    try:
        REPO_STATS["facebook/react"] = {"stars": 1, "forks": 1}
        run()
    finally:
        REPO_STATS.clear()
        REPO_STATS.update(REPO_STATS_BACKUP)
    assert tool("rust").score == before


def test_sentiment_label_follows_the_two_to_one_rule(world):
    run()
    assert tool("react").sentiment_label == "positive"  # 1 positive, 0 negative
    assert tool("docker").sentiment_label == "negative"
    assert tool("vuejs").sentiment_label == "neutral"  # mentioned neutrally, never praised
    assert tool("react").sentiment_score == 1.0
    assert tool("docker").sentiment_score == -1.0


def test_sentiment_counts_use_the_same_text_as_mention_counts(world):
    """Docker is named only in the description of the Dev.to item, which the
    sentiment tally used to ignore."""
    world[1]["sources"]["devto"] = [
        {"title": "A great walkthrough", "description": "all about docker", "tag_list": []}
    ]
    run()
    assert tool("docker").sentiment_positive >= 1


def test_decision_fields_are_filled_for_every_tool(world):
    run()
    db = SessionLocal()
    try:
        for t in db.query(Tool).all():
            assert t.trend_stage and t.recommendation and t.learning_priority and t.stage
    finally:
        db.close()


# --- snapshots ----------------------------------------------------------------------------


def test_the_first_cycle_of_a_day_writes_one_snapshot_per_tool(world):
    run()
    snaps = snapshots("react")
    assert len(snaps) == 1
    assert snaps[0].score == tool("react").score
    assert snaps[0].stars == 230_000
    assert snaps[0].mention_count == tool("react").mention_count


def test_a_second_cycle_the_same_day_updates_the_snapshot_and_accumulates_mentions(world):
    run()
    first = snapshots("react")[0].mention_count
    run()
    snaps = snapshots("react")
    assert len(snaps) == 1, "a second snapshot for the same day"
    assert snaps[0].mention_count == first * 2


def test_the_stars_delta_is_the_change_since_the_previous_cycle(world):
    run()
    REPO_STATS["facebook/react"] = {**REPO_STATS["facebook/react"], "stars": 230_500}
    try:
        run()
    finally:
        REPO_STATS["facebook/react"]["stars"] = 230_000
    assert snapshots("react")[0].github_stars_delta == 500


# --- growth -------------------------------------------------------------------------------


def test_growth_compares_with_the_average_of_recent_snapshots(world):
    db = SessionLocal()
    react = db.query(Tool).filter(Tool.slug == "react").one()
    db.add(ToolSnapshot(tool_id=react.id, score=40.0, recorded_at=utcnow_naive() - timedelta(days=2)))
    db.commit()
    db.close()

    run()

    react = tool("react")
    expected = round((react.score - 40.0) / 40.0 * 100, 1)
    assert react.growth_pct == expected and react.growth_pct > 0


def test_a_tool_with_no_history_has_zero_growth_not_an_error(world):
    run()
    assert tool("vuejs").growth_pct == 0.0


# --- domains ------------------------------------------------------------------------------


def test_domain_scores_are_the_average_of_their_tools(world):
    run()
    db = SessionLocal()
    try:
        for d in db.query(Domain).all():
            scores = [t.score for t in db.query(Tool).filter(Tool.domain_id == d.id).all()]
            if scores:
                assert d.score == round(sum(scores) / len(scores), 1)
                assert d.name in d.summary and "led by" in d.summary
    finally:
        db.close()


# --- release metadata -------------------------------------------------------------------------


def test_release_metadata_is_fetched_when_missing_and_then_left_alone(world):
    calls, _ = world
    assert run() is True
    assert calls["release"] == 31  # nothing known yet: every repo is asked
    assert tool("react").latest_version == "v9.9.9"

    # The second cycle reads latest_release_at back from the database (naive on
    # SQLite) and must neither crash on the subtraction nor ask again.
    assert run() is True
    assert calls["release"] == 31


def test_a_release_older_than_a_week_is_refreshed(world):
    db = SessionLocal()
    react = db.query(Tool).filter(Tool.slug == "react").one()
    react.latest_release_at = datetime.now(timezone.utc) - timedelta(days=30)
    react.latest_version = "v1.0.0"
    db.commit()
    db.close()
    run()
    assert tool("react").latest_version == "v9.9.9"


def test_a_failed_release_lookup_keeps_the_old_version(world):
    _, state = world
    state["release_ok"] = False
    db = SessionLocal()
    react = db.query(Tool).filter(Tool.slug == "react").one()
    react.latest_release_at = datetime.now(timezone.utc) - timedelta(days=30)
    react.latest_version = "v1.0.0"
    db.commit()
    db.close()
    assert run() is True
    assert tool("react").latest_version == "v1.0.0"


# --- failures -----------------------------------------------------------------------------


def test_a_source_that_raises_fails_the_cycle_and_rolls_everything_back(world):
    _, state = world
    state["sources"]["reddit"] = RuntimeError("reddit exploded")
    score_before, stars_before = tool("react").score, tool("react").stars
    db = SessionLocal()
    before = db.query(ToolSnapshot).count()
    db.close()

    assert run() is False

    assert S.scrape_status["is_running"] is False
    assert S.scrape_status["errors"][-1]["error"] == "reddit exploded"
    assert tool("react").score == score_before and tool("react").stars == stars_before
    db = SessionLocal()
    try:
        assert db.query(ToolSnapshot).count() == before
    finally:
        db.close()


def test_a_rejected_github_token_is_surfaced_and_the_cycle_still_completes(world):
    _, state = world
    state["auth_failed"] = True
    assert run() is True
    assert any("GITHUB_TOKEN rejected" in e["error"] for e in S.scrape_status["errors"])


def test_an_empty_world_still_completes(world):
    _, state = world
    state["sources"] = {"hn": [], "hn_search": [], "devto": [], "reddit": [], "news": []}
    assert run() is True
    assert S.scrape_status["sentiment"]["total"] == 0
    assert tool("react").mention_count == 0


# --- job demand -----------------------------------------------------------------------------------


def test_a_fresh_hiring_measurement_is_not_refetched(monkeypatch):
    calls = []

    async def fetch(slugs):
        calls.append(1)
        return {"counts": {"react": 5}, "sample_size": 10, "period": "Jul-Sep 2026",
                "fetched_at": datetime.now(timezone.utc)}  # fmt: skip

    monkeypatch.setattr(S, "fetch_job_demand", fetch)
    fresh = Tool(slug="a", jobs_updated_at=datetime.now(timezone.utc) - timedelta(hours=1))
    asyncio.run(S._refresh_job_demand([fresh]))
    assert calls == []


def test_a_stale_measurement_is_refetched_and_applied_to_every_tool(monkeypatch):
    now = datetime.now(timezone.utc)

    async def fetch(slugs):
        return {"counts": {"react": 5}, "sample_size": 10, "period": "Jul-Sep 2026", "fetched_at": now}

    monkeypatch.setattr(S, "fetch_job_demand", fetch)
    tools = [Tool(slug="react", jobs_updated_at=now - timedelta(hours=30)), Tool(slug="vuejs")]
    asyncio.run(S._refresh_job_demand(tools))
    assert [t.jobs_mentions for t in tools] == [5, 0]  # measured zero for a tool nobody named
    assert all(t.jobs_sample == 10 and t.jobs_period == "Jul-Sep 2026" for t in tools)


def test_a_failed_fetch_keeps_the_previous_values_instead_of_zeroing_them(monkeypatch):
    async def fetch(slugs):
        return None

    monkeypatch.setattr(S, "fetch_job_demand", fetch)
    old = datetime.now(timezone.utc) - timedelta(days=3)
    t = Tool(slug="react", jobs_mentions=7, jobs_sample=100, jobs_period="old", jobs_updated_at=old)
    asyncio.run(S._refresh_job_demand([t]))
    assert (t.jobs_mentions, t.jobs_sample, t.jobs_period) == (7, 100, "old")


def test_a_hiring_measurement_read_back_naive_from_sqlite_is_not_a_crash(monkeypatch):
    """jobs_updated_at is a timezone-aware column; SQLite returns it naive, and
    `now(utc) - naive` raised TypeError on the second cycle."""
    called = []

    async def fetch(slugs):
        called.append(1)

    monkeypatch.setattr(S, "fetch_job_demand", fetch)
    naive_recent = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(tzinfo=None)
    naive_old = (datetime.now(timezone.utc) - timedelta(days=3)).replace(tzinfo=None)

    asyncio.run(S._refresh_job_demand([Tool(slug="a", jobs_updated_at=naive_recent)]))
    assert called == [], "a naive-but-recent value must still count as fresh"
    asyncio.run(S._refresh_job_demand([Tool(slug="a", jobs_updated_at=naive_old)]))
    assert called == [1]


def test_two_to_one_praise_is_mixed_not_positive(world):
    """positive only when praise is MORE than double the criticism."""
    world[1]["sources"]["hn"] = [
        {"id": 10, "title": "Svelte is great for dashboards"},
        {"id": 11, "title": "Svelte is great for forms too"},
        {"id": 12, "title": "Why I stopped using Svelte"},
    ]
    world[1]["sources"]["hn_search"] = []
    run()
    svelte = tool("svelte")
    assert (svelte.sentiment_positive, svelte.sentiment_negative) == (2, 1)
    assert svelte.sentiment_label == "mixed"
    assert svelte.sentiment_score == pytest.approx(1 / 3)


def test_three_to_one_praise_is_positive(world):
    world[1]["sources"]["hn"] = [
        {"id": 20 + n, "title": f"Svelte is great, take {n}"} for n in range(3)
    ] + [{"id": 30, "title": "Why I stopped using Svelte"}]
    world[1]["sources"]["hn_search"] = []
    run()
    assert tool("svelte").sentiment_label == "positive"


def test_a_rejected_token_state_is_reset_at_the_start_of_every_cycle(world, monkeypatch):
    """A rotated token must get a fresh chance rather than inherit last cycle's 401."""
    resets = []
    monkeypatch.setattr(S, "reset_github_auth_state", lambda: resets.append(1))
    run()
    run()
    assert resets == [1, 1]
