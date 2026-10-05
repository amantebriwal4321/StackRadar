"""The daily nudge email: who is contacted, how often, and what it says.

This is the only code in the product that sends mail to a person, and it is
triggered by an external cron that can retry. It had no tests; the property that
matters most - a user is emailed at most once a day however often the trigger
fires - was not implemented at all (`last_sent_at` was written and never read).

Nothing here reaches the network: send_email is replaced, and the one test of
the Resend call itself uses httpx.MockTransport.
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import httpx
import pytest

from app.db.session import SessionLocal
from app.models.all_models import NotificationPref, ToolRoadmap, UserProgress
from app.services import notifications as N

ROADMAP = "digest-test-roadmap"
STEPS = [
    {"step": 1, "title": "Install the toolchain", "description": "Get set up."},
    {"step": 2, "title": "Ship a container", "description": "Build and run one."},
    {"step": 3, "title": "Deploy it", "description": "Put it on a server."},
]


@pytest.fixture(scope="module", autouse=True)
def _booted():
    """Booting the app is what creates the tables in the throwaway database."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app):
        yield


@pytest.fixture
def db():
    session = SessionLocal()
    session.add(
        ToolRoadmap(
            slug=ROADMAP,
            title="Digest test",
            description="x",
            icon="T",
            estimated_weeks=1,
            steps_json=json.dumps(STEPS),
        )
    )
    session.commit()
    yield session
    session.rollback()
    session.query(UserProgress).filter(UserProgress.roadmap_slug == ROADMAP).delete()
    session.query(NotificationPref).filter(
        NotificationPref.user_id.like("digest-test-%")
    ).delete(synchronize_session=False)
    session.query(ToolRoadmap).filter(ToolRoadmap.slug == ROADMAP).delete()
    session.commit()
    session.close()


@pytest.fixture
def mailbox(monkeypatch):
    """Capture what would be emailed instead of sending it."""
    sent: list[tuple[str, str, str]] = []

    async def fake_send(to, subject, html):
        sent.append((to, subject, html))
        return True

    monkeypatch.setattr(N, "send_email", fake_send)
    return sent


def opt_in(db, uid, email=None, **extra):
    pref = NotificationPref(user_id=uid, email=email or f"{uid}@example.com", **extra)
    db.add(pref)
    db.commit()
    return pref


def complete(db, uid, step, when=None):
    db.add(
        UserProgress(
            user_id=uid,
            roadmap_slug=ROADMAP,
            step=step,
            completed_at=when or datetime.now(timezone.utc),
        )
    )
    db.commit()


def run(db):
    return asyncio.run(N.run_daily_digests(db))


# --- who is contacted ---------------------------------------------------------


def test_an_opted_in_learner_gets_their_next_lesson(db, mailbox):
    opt_in(db, "digest-test-a")
    complete(db, "digest-test-a", 1)

    result = run(db)

    assert result["emails_sent"] == 1
    [(to, subject, html)] = mailbox
    assert to == "digest-test-a@example.com"
    # Step 1 is done, so today's focus is step 2 - not the step they finished.
    assert subject == "Today: Ship a container"
    assert "Build and run one." in html
    assert f"/roadmap/{ROADMAP}" in html


def test_someone_who_has_not_started_is_not_emailed(db, mailbox):
    opt_in(db, "digest-test-b")

    result = run(db)

    assert mailbox == []
    assert result["skipped_no_progress"] == 1
    assert result["emails_sent"] == 0


def test_a_learner_who_finished_the_roadmap_has_no_next_lesson(db, mailbox):
    opt_in(db, "digest-test-c")
    for step in (1, 2, 3):
        complete(db, "digest-test-c", step)

    result = run(db)

    assert mailbox == []
    assert result["skipped_no_progress"] == 1


def test_unsubscribed_and_opted_out_users_are_never_contacted(db, mailbox):
    opt_in(db, "digest-test-d", unsubscribed_at=datetime.now(timezone.utc))
    opt_in(db, "digest-test-e", daily_opt_in=False)
    for uid in ("digest-test-d", "digest-test-e"):
        complete(db, uid, 1)

    result = run(db)

    assert mailbox == []
    assert result["opted_in"] == 0


# --- how often ----------------------------------------------------------------


def test_a_second_trigger_the_same_day_sends_nothing(db, mailbox):
    """The reason this file exists: cron retries must not double-email."""
    opt_in(db, "digest-test-f")
    complete(db, "digest-test-f", 1)

    first = run(db)
    second = run(db)

    assert first["emails_sent"] == 1
    assert second["emails_sent"] == 0
    assert second["already_sent_today"] == 1
    assert len(mailbox) == 1


def test_yesterdays_email_does_not_block_todays(db, mailbox):
    opt_in(
        db,
        "digest-test-g",
        last_sent_at=datetime.now(timezone.utc) - timedelta(days=1, minutes=1),
    )
    complete(db, "digest-test-g", 1)

    result = run(db)

    assert result["emails_sent"] == 1
    assert len(mailbox) == 1


def test_a_failed_send_is_not_recorded_so_the_next_run_retries(db, monkeypatch):
    calls = []

    async def flaky(to, subject, html):
        calls.append(to)
        return len(calls) > 1  # the provider fails once, then recovers

    monkeypatch.setattr(N, "send_email", flaky)
    opt_in(db, "digest-test-h")
    complete(db, "digest-test-h", 1)

    first = run(db)
    second = run(db)

    assert first["emails_sent"] == 0
    assert second["emails_sent"] == 1
    assert len(calls) == 2


@pytest.mark.parametrize("tz", [timezone.utc, None], ids=["aware", "naive"])
def test_sent_today_reads_both_database_flavours(tz):
    """Postgres returns aware datetimes, SQLite naive ones; both are UTC."""
    now = datetime.now(timezone.utc)
    stamp = now if tz else now.replace(tzinfo=None)
    assert N._sent_today(SimpleNamespace(last_sent_at=stamp)) is True
    assert N._sent_today(SimpleNamespace(last_sent_at=None)) is False


def test_sent_today_converts_other_offsets_to_utc_before_comparing():
    """23:30 UTC yesterday is 05:00 IST today - still yesterday, UTC."""
    ist = timezone(timedelta(hours=5, minutes=30))
    yesterday_late_utc = datetime.now(timezone.utc).replace(
        hour=23, minute=30
    ) - timedelta(days=1)
    stamp = yesterday_late_utc.astimezone(ist)
    assert stamp.date() == datetime.now(timezone.utc).date()  # the trap
    assert N._sent_today(SimpleNamespace(last_sent_at=stamp)) is False


# --- one bad user cannot sink the batch ------------------------------------------


def test_one_users_failure_does_not_stop_the_others(db, mailbox, monkeypatch):
    for uid in ("digest-test-i", "digest-test-j"):
        opt_in(db, uid)
        complete(db, uid, 1)
    real = N._digest_for

    def boom_for_i(session, user_id):
        if user_id == "digest-test-i":
            raise RuntimeError("corrupt roadmap row")
        return real(session, user_id)

    monkeypatch.setattr(N, "_digest_for", boom_for_i)

    result = run(db)

    assert [to for to, _, _ in mailbox] == ["digest-test-j@example.com"]
    assert result["emails_sent"] == 1


# --- what the email says ---------------------------------------------------------


def digest(**over):
    base = {
        "streak": 0,
        "title": "Ship a container",
        "description": "Build and run one.",
        "roadmap_slug": "devops",
        "url": "https://stackradar.example/roadmap/devops",
    }
    return {**base, **over}


def test_a_streak_is_mentioned_only_when_there_is_one():
    _, with_streak = N._render_email(digest(streak=4))
    _, without = N._render_email(digest(streak=0))
    assert "4-day streak" in with_streak
    assert "streak" not in without


def test_title_and_description_cannot_inject_markup():
    subject, html = N._render_email(
        digest(title="<script>x</script> & more", description='"><img src=x>')
    )
    assert "<script>" not in html
    assert "<img" not in html
    assert "&lt;script&gt;x&lt;/script&gt; &amp; more" in html
    # The subject is a header, not HTML - it stays readable.
    assert subject == "Today: <script>x</script> & more"


def test_the_digest_description_is_capped_at_180_characters(db):
    long = "w" * 400
    steps = [{"step": 1, "title": "t", "description": long}]
    db.query(ToolRoadmap).filter(ToolRoadmap.slug == ROADMAP).update(
        {"steps_json": json.dumps(steps + [{**steps[0], "step": 2}])}
    )
    db.commit()
    complete(db, "digest-test-k", 1)
    built = N._digest_for(db, "digest-test-k")
    assert built["description"] == "w" * 180


# --- send_email ------------------------------------------------------------------


def test_without_a_provider_key_nothing_leaves_the_server(monkeypatch):
    monkeypatch.setattr(N.settings, "RESEND_API_KEY", "")

    def no_network(*a, **k):
        raise AssertionError("send_email must not open a connection without a key")

    monkeypatch.setattr(N.httpx, "AsyncClient", no_network)
    assert asyncio.run(N.send_email("a@b.c", "s", "<p>h</p>")) is False


def _resend(monkeypatch, responder):
    monkeypatch.setattr(N.settings, "RESEND_API_KEY", "re_test")
    real = httpx.AsyncClient
    monkeypatch.setattr(
        N.httpx,
        "AsyncClient",
        lambda **kw: real(transport=httpx.MockTransport(responder), **kw),
    )


def test_a_configured_send_posts_the_message_to_resend(monkeypatch):
    seen = {}

    def responder(request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"id": "1"})

    _resend(monkeypatch, responder)

    assert asyncio.run(N.send_email("a@b.c", "Subject", "<p>h</p>")) is True
    assert seen["url"] == "https://api.resend.com/emails"
    assert seen["auth"] == "Bearer re_test"
    assert seen["body"]["to"] == ["a@b.c"]
    assert seen["body"]["subject"] == "Subject"
    assert seen["body"]["html"] == "<p>h</p>"


@pytest.mark.parametrize("status", [400, 401, 422, 429, 500])
def test_a_provider_error_is_a_failed_send_not_a_crash(monkeypatch, status):
    _resend(monkeypatch, lambda request: httpx.Response(status, text="nope"))
    assert asyncio.run(N.send_email("a@b.c", "s", "h")) is False


def test_a_network_failure_is_a_failed_send_not_a_crash(monkeypatch):
    def down(request):
        raise httpx.ConnectError("provider unreachable")

    _resend(monkeypatch, down)
    assert asyncio.run(N.send_email("a@b.c", "s", "h")) is False
