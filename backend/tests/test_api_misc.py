"""Waitlist, daily-nudge subscription, admin gating, roadmaps and the overview.

The public write endpoints and the owner-only ones, which had no tests, plus the
read endpoints the landing page is built from. Each test cleans up the rows it
creates, so the shared SQLite test database is left as found.
"""

import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.models.all_models import NotificationPref, Tool, WaitlistSignup

API = "/api/v1"


@pytest.fixture(scope="module")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def clean():
    yield
    db = SessionLocal()
    db.query(WaitlistSignup).filter(WaitlistSignup.email.like("%@misc-test.dev")).delete(
        synchronize_session=False
    )
    db.query(NotificationPref).filter(NotificationPref.user_id.like("misc-test-%")).delete(
        synchronize_session=False
    )
    db.commit()
    db.close()


# --- waitlist ----------------------------------------------------------------------


def join(client, **body):
    return client.post(f"{API}/waitlist", json=body)


def test_a_new_email_joins_the_waitlist(client, clean):
    r = join(client, email="new@misc-test.dev", source="landing")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "already": False}


def test_joining_twice_is_a_friendly_success_not_an_error(client, clean):
    join(client, email="twice@misc-test.dev")
    assert join(client, email="twice@misc-test.dev").json() == {"ok": True, "already": True}


def test_emails_are_trimmed_and_lowercased_before_the_duplicate_check(client, clean):
    join(client, email="Mixed@Misc-Test.dev")
    assert join(client, email="  MIXED@misc-test.dev ").json()["already"] is True


@pytest.mark.parametrize(
    "email",
    ["", "   ", "no-at-sign", "a@b", "a b@c.co", "@x.co", "a@@x.co", "x" * 250 + "@y.co"],
)
def test_a_malformed_email_is_a_422(client, clean, email):
    assert join(client, email=email).status_code == 422


def test_a_missing_or_null_body_is_a_422_not_a_500(client, clean):
    assert client.post(f"{API}/waitlist").status_code == 422
    assert client.post(f"{API}/waitlist", json={}).status_code == 422
    assert join(client, email=None).status_code == 422


def test_a_very_long_source_is_truncated_to_64_characters(client, clean):
    join(client, email="src@misc-test.dev", source="s" * 200)
    db = SessionLocal()
    try:
        row = db.query(WaitlistSignup).filter(WaitlistSignup.email == "src@misc-test.dev").one()
        assert row.source == "s" * 64
    finally:
        db.close()


# --- admin gating ---------------------------------------------------------------------

ADMIN_PATHS = [
    ("get", "/admin/waitlist"),
    ("post", "/admin/send-daily-digests"),
]


@pytest.mark.parametrize(("method", "path"), ADMIN_PATHS)
def test_admin_routes_are_503_when_no_key_is_configured(client, monkeypatch, method, path):
    monkeypatch.delenv("ADMIN_API_KEY", raising=False)
    r = getattr(client, method)(f"{API}{path}", headers={"X-Admin-Key": "anything"})
    assert r.status_code == 503


@pytest.mark.parametrize(("method", "path"), ADMIN_PATHS)
@pytest.mark.parametrize("sent", [None, "", "wrong", "SECRET", "secret "])
def test_admin_routes_are_403_for_a_missing_or_wrong_key(client, monkeypatch, method, path, sent):
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    headers = {} if sent is None else {"X-Admin-Key": sent}
    assert getattr(client, method)(f"{API}{path}", headers=headers).status_code == 403


def test_the_waitlist_export_lists_signups_newest_first(client, clean, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    join(client, email="first@misc-test.dev")
    join(client, email="second@misc-test.dev")
    r = client.get(f"{API}/admin/waitlist", headers={"X-Admin-Key": "secret"})
    assert r.status_code == 200
    emails = [row["email"] for row in r.json()["signups"]]
    assert emails.index("second@misc-test.dev") < emails.index("first@misc-test.dev")
    assert r.json()["count"] == len(emails)


def test_the_digest_trigger_reports_what_it_did(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    r = client.post(f"{API}/admin/send-daily-digests", headers={"X-Admin-Key": "secret"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert {"opted_in", "digests_built", "emails_sent", "already_sent_today"} <= body.keys()


# --- the daily nudge subscription -------------------------------------------------------


def subscribe(client, uid, email):
    return client.post(
        f"{API}/notifications/subscribe", params={"user_id": uid}, json={"email": email}
    )


def status(client, uid):
    return client.get(f"{API}/notifications/status", params={"user_id": uid}).json()


def test_subscribe_status_and_unsubscribe_round_trip(client, clean):
    uid = "misc-test-1"
    assert status(client, uid) == {"subscribed": False, "email": None}

    r = subscribe(client, uid, " Me@Misc-Test.dev ")
    assert r.json() == {"subscribed": True, "email": "me@misc-test.dev"}
    assert status(client, uid) == {"subscribed": True, "email": "me@misc-test.dev"}

    off = client.post(f"{API}/notifications/unsubscribe", params={"user_id": uid})
    assert off.json() == {"subscribed": False}
    assert status(client, uid)["subscribed"] is False


def test_resubscribing_updates_the_email_and_clears_the_unsubscribe(client, clean):
    uid = "misc-test-2"
    subscribe(client, uid, "old@misc-test.dev")
    client.post(f"{API}/notifications/unsubscribe", params={"user_id": uid})
    subscribe(client, uid, "new@misc-test.dev")
    assert status(client, uid) == {"subscribed": True, "email": "new@misc-test.dev"}
    db = SessionLocal()
    try:
        assert db.query(NotificationPref).filter(NotificationPref.user_id == uid).count() == 1
    finally:
        db.close()


@pytest.mark.parametrize("email", ["", "nope", "a@b", "a @b.co", None])
def test_subscribing_with_a_bad_email_is_a_422(client, clean, email):
    assert subscribe(client, "misc-test-3", email).status_code == 422


def test_unsubscribing_someone_who_never_subscribed_is_harmless(client, clean):
    r = client.post(f"{API}/notifications/unsubscribe", params={"user_id": "misc-test-4"})
    assert r.status_code == 200 and r.json() == {"subscribed": False}


def test_notification_endpoints_need_a_user(client):
    assert client.get(f"{API}/notifications/status").status_code == 401
    assert client.post(f"{API}/notifications/subscribe", json={"email": "a@b.co"}).status_code == 401


# --- roadmaps ---------------------------------------------------------------------------


def test_the_roadmap_list_counts_each_roadmaps_steps(client):
    roadmaps = client.get(f"{API}/roadmaps").json()
    assert len(roadmaps) == 8
    for rm in roadmaps:
        detail = client.get(f"{API}/roadmaps/{rm['slug']}").json()
        assert rm["step_count"] == len(detail["steps"]) > 0


def test_roadmap_steps_are_numbered_and_carry_tools_and_projects(client):
    steps = client.get(f"{API}/roadmaps/devops").json()["steps"]
    assert [s["step"] for s in steps] == list(range(1, len(steps) + 1))
    assert all(isinstance(s["tools"], list) and isinstance(s["projects"], list) for s in steps)
    assert any(s["tools"] for s in steps), "the editorial step-to-tool map reached the API"


def test_step_tools_are_real_catalog_tools(client):
    slugs = {t["slug"] for t in client.get(f"{API}/tools", params={"per_page": 100}).json()["tools"]}
    for rm in client.get(f"{API}/roadmaps").json():
        for step in client.get(f"{API}/roadmaps/{rm['slug']}").json()["steps"]:
            assert {t["slug"] for t in step["tools"]} <= slugs


def test_only_the_three_focus_roadmaps_carry_a_career_brief(client):
    with_brief = {
        rm["slug"]
        for rm in client.get(f"{API}/roadmaps").json()
        if client.get(f"{API}/roadmaps/{rm['slug']}").json()["career"] is not None
    }
    assert with_brief == {"web-development", "ai-ml", "devops"}


def test_the_career_brief_is_labelled_authored_and_demand_is_measured_or_null(client):
    career = client.get(f"{API}/roadmaps/devops").json()["career"]
    assert career["authored"] is True and career["reviewed"]
    for row in career["demand"]:
        assert row["jobs_mentions"] is None or row["jobs_mentions"] >= 0


def test_an_unknown_roadmap_is_a_404(client):
    assert client.get(f"{API}/roadmaps/nope").status_code == 404


# --- the overview -----------------------------------------------------------------------


@pytest.fixture
def stats():
    """Set known counts on three tools, restore afterwards."""
    db = SessionLocal()
    rows = {t.slug: t for t in db.query(Tool).all()}
    saved = {
        slug: (t.hn_count, t.devto_count, t.reddit_count, t.news_count, t.stars,
               t.score, t.growth_pct, t.sentiment_positive, t.sentiment_negative)
        for slug, t in rows.items()
    }  # fmt: skip

    def apply(**per_tool):
        for t in rows.values():
            t.hn_count = t.devto_count = t.reddit_count = t.news_count = 0
            t.stars = 0
            t.score = 0.0
            t.growth_pct = 0.0
            t.sentiment_positive = t.sentiment_negative = 0
        for slug, values in per_tool.items():
            for k, v in values.items():
                setattr(rows[slug], k, v)
        db.commit()

    yield apply
    for slug, vals in saved.items():
        t = rows[slug]
        (t.hn_count, t.devto_count, t.reddit_count, t.news_count, t.stars,
         t.score, t.growth_pct, t.sentiment_positive, t.sentiment_negative) = vals  # fmt: skip
    db.commit()
    db.close()


def overview(client):
    r = client.get(f"{API}/overview")
    assert r.status_code == 200
    return r.json()


def test_the_overview_counts_what_the_database_holds(client):
    body = overview(client)
    assert body["tools_tracked"] == 31
    assert body["domains"] == 8 and body["roadmaps"] == 8
    assert body["source_count"] == len(body["sources"]) == 5


def test_mentions_stars_and_momentum_are_summed_and_averaged(client, stats):
    stats(
        react={"hn_count": 3, "devto_count": 2, "reddit_count": 1, "news_count": 4, "stars": 1000, "score": 90.0},
        vuejs={"hn_count": 1, "stars": 500, "score": 30.0},
    )  # fmt: skip
    body = overview(client)
    assert body["total_mentions"] == 3 + 2 + 1 + 4 + 1
    assert body["total_stars"] == 1500
    assert body["momentum_index"] == round((90.0 + 30.0) / 31, 1)


def test_the_sentiment_ratio_is_null_until_there_is_any_sentiment(client, stats):
    stats()
    assert overview(client)["sentiment_ratio"] is None
    stats(react={"sentiment_positive": 3, "sentiment_negative": 1})
    assert overview(client)["sentiment_ratio"] == 75.0


def test_the_top_mover_is_the_fastest_grower_and_absent_when_nothing_grew(client, stats):
    stats()
    assert overview(client)["top_mover"] is None
    stats(react={"growth_pct": 12.0}, svelte={"growth_pct": 40.0}, vuejs={"growth_pct": -5.0})
    mover = overview(client)["top_mover"]
    assert mover["slug"] == "svelte" and mover["growth_pct"] == 40.0
