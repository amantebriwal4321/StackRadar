"""Learning progress: the streak, the toggle, and the percentage a learner sees.

Progress is the retention loop - the thing that brings someone back tomorrow -
and it was untested. Two properties matter most. The streak must count UTC days
whatever zone the database session reports, and the toggle must only ever record
a real step of a real roadmap: a step number past the end of the roadmap used to
be stored and counted, so a 4-step roadmap could read 125% complete.

These run against the SQLite test database, where the unverified user_id
fallback is allowed (see app/core/auth.py); each test uses its own user id and
cleans up after itself.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.endpoints.mvp import _calculate_streak, _utc_date
from app.db.session import SessionLocal
from app.models.all_models import UserProgress

API = "/api/v1"
UTC = timezone.utc
IST = timezone(timedelta(hours=5, minutes=30))


def days_ago(n, hour=12):
    base = datetime.now(UTC).replace(hour=hour, minute=0, second=0, microsecond=0)
    return base - timedelta(days=n)


# --- _calculate_streak: pure ------------------------------------------------------


def test_no_completions_is_a_zero_streak():
    assert _calculate_streak([]) == 0


def test_a_lesson_today_is_a_streak_of_one():
    assert _calculate_streak([days_ago(0)]) == 1


def test_a_lesson_yesterday_still_counts_so_the_day_is_not_lost_early():
    assert _calculate_streak([days_ago(1)]) == 1


def test_a_lesson_two_days_ago_is_a_dead_streak():
    assert _calculate_streak([days_ago(2)]) == 0


def test_consecutive_days_accumulate():
    assert _calculate_streak([days_ago(n) for n in range(5)]) == 5


def test_a_gap_ends_the_run_at_the_gap():
    assert _calculate_streak([days_ago(0), days_ago(1), days_ago(3), days_ago(4)]) == 2


def test_several_completions_in_one_day_are_one_day():
    assert _calculate_streak([days_ago(0, 8), days_ago(0, 12), days_ago(0, 20)]) == 1


def test_order_of_the_input_does_not_matter():
    stamps = [days_ago(2), days_ago(0), days_ago(1)]
    assert _calculate_streak(stamps) == _calculate_streak(sorted(stamps)) == 3


def test_a_streak_that_ended_yesterday_keeps_its_length():
    assert _calculate_streak([days_ago(1), days_ago(2), days_ago(3)]) == 3


def test_naive_and_aware_timestamps_both_work():
    """SQLite returns naive datetimes (UTC), Postgres aware ones."""
    naive = days_ago(0).replace(tzinfo=None)
    assert _calculate_streak([naive, days_ago(1)]) == 2


def test_the_day_is_the_utc_day_not_the_sessions_local_day():
    """22:30 UTC today is 04:00 TOMORROW in IST. Reading the IST date put the
    lesson in the future and split a two-day streak into one."""
    late_utc = days_ago(0, hour=22)
    as_ist = late_utc.astimezone(IST)
    assert as_ist.date() != late_utc.date()  # the trap is real
    assert _utc_date(as_ist) == late_utc.date()
    assert _calculate_streak([as_ist, days_ago(1)]) == 2


def test_utc_date_leaves_a_naive_timestamp_alone():
    assert _utc_date(datetime(2026, 10, 6, 23, 59)) == datetime(2026, 10, 6).date()


# --- the toggle endpoint --------------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def uid():
    user = "progress-test-user"
    yield user
    db = SessionLocal()
    db.query(UserProgress).filter(UserProgress.user_id == user).delete()
    db.commit()
    db.close()


def toggle(client, uid, step, roadmap="devops"):
    return client.post(
        f"{API}/progress/toggle",
        json={"user_id": uid, "roadmap_slug": roadmap, "step": step},
    )


def progress(client, uid, roadmap="devops"):
    return client.get(f"{API}/progress/{roadmap}", params={"user_id": uid}).json()


def test_a_first_toggle_completes_a_step_and_a_second_undoes_it(client, uid):
    first = toggle(client, uid, 1).json()
    assert first["completed"] is True
    assert first["completed_steps"] == [1]

    second = toggle(client, uid, 1).json()
    assert second["completed"] is False
    assert second["completed_steps"] == []


def test_percent_follows_the_completed_steps(client, uid):
    total = progress(client, uid)["total"]
    assert total == 4
    assert toggle(client, uid, 1).json()["percent"] == 25
    assert toggle(client, uid, 2).json()["percent"] == 50


def test_completing_every_step_is_exactly_one_hundred_percent(client, uid):
    for step in range(1, 5):
        body = toggle(client, uid, step).json()
    assert body["percent"] == 100
    assert body["completed_steps"] == [1, 2, 3, 4]


def test_completed_steps_come_back_sorted(client, uid):
    for step in (3, 1, 2):
        toggle(client, uid, step)
    assert progress(client, uid)["completed_steps"] == [1, 2, 3]


def test_progress_is_per_user_and_per_roadmap(client, uid):
    toggle(client, uid, 1)
    assert progress(client, "someone-else")["completed_steps"] == []
    assert progress(client, uid, roadmap="ai-ml")["completed_steps"] == []


# --- the toggle rejects what is not a step ----------------------------------------------


@pytest.mark.parametrize("step", [0, 5, 99, -1])
def test_a_step_outside_the_roadmap_is_rejected_and_not_stored(client, uid, step):
    r = toggle(client, uid, step)
    assert r.status_code == 422
    assert "must be one of [1, 2, 3, 4]" in r.json()["detail"]
    assert progress(client, uid)["completed_steps"] == []


@pytest.mark.parametrize("step", ["1", "abc", 1.5, True, False, [], {}])
def test_a_step_that_is_not_an_integer_is_rejected(client, uid, step):
    """True is an int in Python and would otherwise pass as step 1."""
    assert toggle(client, uid, step).status_code == 422
    assert progress(client, uid)["completed_steps"] == []


def test_an_unknown_roadmap_is_a_404_and_stores_nothing(client, uid):
    assert toggle(client, uid, 1, roadmap="no-such-roadmap").status_code == 404
    db = SessionLocal()
    try:
        assert db.query(UserProgress).filter(UserProgress.user_id == uid).count() == 0
    finally:
        db.close()


@pytest.mark.parametrize("slug", [123, ["devops"], {"a": 1}, True])
def test_a_roadmap_slug_that_is_not_a_string_is_a_404_not_a_500(client, uid, slug):
    assert toggle(client, uid, 1, roadmap=slug).status_code == 404


@pytest.mark.parametrize("body", [{}, {"roadmap_slug": "devops"}, {"step": 1}])
def test_missing_fields_are_a_422(client, uid, body):
    r = client.post(f"{API}/progress/toggle", json={"user_id": uid, **body})
    assert r.status_code == 422


def test_no_user_at_all_is_a_401(client):
    r = client.post(f"{API}/progress/toggle", json={"roadmap_slug": "devops", "step": 1})
    assert r.status_code == 401


# --- the summary built from it ------------------------------------------------------------


def test_the_summary_points_at_the_next_unfinished_step(client, uid):
    toggle(client, uid, 1)
    summary = client.get(f"{API}/progress/summary", params={"user_id": uid}).json()

    assert summary["total_completed"] == 1
    assert summary["completed_today"] == 1
    assert summary["streak_days"] == 1
    assert summary["focus_roadmap"] == "devops"
    assert summary["todays_focus"]["step"] == 2
    [active] = summary["active"]
    assert (active["completed"], active["total"], active["percent"]) == (1, 4, 25)


def test_a_finished_roadmap_has_no_next_step(client, uid):
    for step in range(1, 5):
        toggle(client, uid, step)
    summary = client.get(f"{API}/progress/summary", params={"user_id": uid}).json()
    assert summary["active"][0]["percent"] == 100
    assert summary["active"][0]["next_step"] is None
    assert summary["todays_focus"] is None


def test_a_user_with_no_progress_gets_an_empty_summary(client):
    summary = client.get(f"{API}/progress/summary", params={"user_id": "nobody-yet"}).json()
    assert summary["streak_days"] == 0
    assert summary["active"] == []
    assert summary["todays_focus"] is None
    assert summary["focus_roadmap"] is None
