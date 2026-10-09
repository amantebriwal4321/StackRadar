"""UTC-consistent time windows.

Timestamps are stored as UTC. The queries used the server's local clock, which
only agreed with the data on a UTC host - on this repo's own dev machine (IST)
the 24h signal window was ~18.5 hours wide.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.clock import utc_midnight_naive, utc_today, utcnow_naive


def test_utcnow_naive_is_utc_without_tzinfo():
    now = utcnow_naive()
    assert now.tzinfo is None
    assert abs(now - datetime.now(timezone.utc).replace(tzinfo=None)) < timedelta(seconds=5)


def test_utc_today_is_the_utc_date():
    assert utc_today() == datetime.now(timezone.utc).date()


def test_utc_midnight_naive():
    d = utc_today()
    m = utc_midnight_naive(d)
    assert m.tzinfo is None and (m.year, m.month, m.day, m.hour, m.minute) == (d.year, d.month, d.day, 0, 0)


def test_a_snapshot_from_20_hours_ago_counts_as_last_24h():
    # With datetime.now() on a clock ahead of UTC, 20h-old data fell outside
    # the window and signals_24h under-reported.
    from app.db.session import SessionLocal
    from app.main import app
    from app.models.all_models import Tool, ToolSnapshot

    with TestClient(app) as client:
        db = SessionLocal()
        try:
            tool = db.query(Tool).first()
            snap = ToolSnapshot(tool_id=tool.id, mention_count=7, recorded_at=utcnow_naive() - timedelta(hours=20))
            db.add(snap)
            db.commit()
            try:
                assert client.get("/api/v1/overview").json()["signals_24h"] >= 7
            finally:
                db.delete(snap)
                db.commit()
        finally:
            db.close()


# --- as_utc: SQLite returns timezone-aware columns naive, Postgres aware ---------------


def test_as_utc_makes_a_naive_value_aware_without_shifting_it():
    from app.core.clock import as_utc

    naive = datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc).replace(tzinfo=None)
    got = as_utc(naive)
    assert got.tzinfo is not None and got.utcoffset() == timedelta(0)
    assert got.replace(tzinfo=None) == naive


def test_as_utc_converts_another_offset_to_the_same_instant():
    from app.core.clock import as_utc

    ist = timezone(timedelta(hours=5, minutes=30))
    local = datetime(2026, 10, 9, 17, 30, tzinfo=ist)
    got = as_utc(local)
    assert got == local  # same instant
    assert (got.hour, got.minute) == (12, 0)


def test_a_database_value_can_be_subtracted_from_now_whichever_flavour_it_is():
    """The scheduler's `now(utc) - tool.latest_release_at` raised TypeError for
    the naive value SQLite returns."""
    from app.core.clock import as_utc

    stored_naive = utcnow_naive() - timedelta(days=3)
    stored_aware = datetime.now(timezone.utc) - timedelta(days=3)
    for stored in (stored_naive, stored_aware):
        assert (datetime.now(timezone.utc) - as_utc(stored)).days == 3
