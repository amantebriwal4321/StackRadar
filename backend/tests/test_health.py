"""assess_freshness: the answer to "are the numbers on the site current?"."""
from datetime import datetime, timedelta, timezone

from app.services.health import FAILING_AFTER, STALE_AFTER, assess_freshness

NOW = datetime(2026, 9, 13, 12, 0, tzinfo=timezone.utc)


def ago(**kw):
    return (NOW - timedelta(**kw)).isoformat()


def test_recent_success_is_fresh():
    r = assess_freshness(ago(minutes=10), now=NOW)
    assert r["state"] == "fresh" and r["healthy"] is True
    assert r["age_minutes"] == 10


def test_older_than_the_window_is_stale():
    r = assess_freshness(ago(minutes=int(STALE_AFTER.total_seconds() // 60) + 1), now=NOW)
    assert r["state"] == "stale" and r["healthy"] is False


def test_exactly_at_the_window_is_still_fresh():
    assert assess_freshness((NOW - STALE_AFTER).isoformat(), now=NOW)["state"] == "fresh"


def test_repeated_failures_are_unhealthy_even_with_recent_data():
    r = assess_freshness(ago(minutes=5), consecutive_failures=FAILING_AFTER, now=NOW)
    assert r["state"] == "failing" and r["healthy"] is False


def test_a_single_failure_is_tolerated():
    assert assess_freshness(ago(minutes=5), consecutive_failures=1, now=NOW)["healthy"] is True


def test_stale_outranks_failing():
    # Old data is the more important thing to report.
    r = assess_freshness(ago(hours=9), consecutive_failures=5, now=NOW)
    assert r["state"] == "stale"


def test_falls_back_to_the_snapshot_after_a_restart():
    # The in-process stamp is None after every restart; the DB still knows.
    r = assess_freshness(None, last_snapshot=NOW - timedelta(minutes=20), now=NOW)
    assert r["state"] == "fresh" and r["age_minutes"] == 20


def test_in_process_stamp_wins_over_the_snapshot():
    r = assess_freshness(ago(minutes=3), last_snapshot=NOW - timedelta(hours=9), now=NOW)
    assert r["age_minutes"] == 3


def test_nothing_ever_scraped():
    r = assess_freshness(None, None, now=NOW)
    assert r["state"] == "never" and r["healthy"] is False and r["age_minutes"] is None


def test_naive_datetimes_are_treated_as_utc():
    # SQLite hands back naive datetimes; they must not crash the comparison.
    naive = (NOW - timedelta(minutes=15)).replace(tzinfo=None)
    assert assess_freshness(None, last_snapshot=naive, now=NOW)["age_minutes"] == 15


def test_z_suffix_and_garbage_timestamps():
    assert assess_freshness("2026-09-13T11:50:00Z", now=NOW)["age_minutes"] == 10
    assert assess_freshness("not a time", now=NOW)["state"] == "never"
