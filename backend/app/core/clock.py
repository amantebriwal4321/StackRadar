"""UTC "now", in the two shapes the database columns need.

Every timestamp is written as UTC (`datetime.now(timezone.utc)`), but several
queries compared against `datetime.now()` / `date.today()` - the SERVER's local
time. On Render the clock is UTC so the two agree; on any other clock they do
not. On a machine in IST (UTC+5:30) the "signals in the last 24h" window
covered ~18.5 hours and every history cutoff landed 5.5 hours early, and a
move to a non-UTC host would have shifted them in production without a single
code change.

`ToolSnapshot.recorded_at` is a naive DateTime holding UTC wall time, so it is
compared against a naive UTC value; aware columns compare by date via
utc_today().
"""

from datetime import date, datetime, timezone


def utcnow_naive() -> datetime:
    """Current UTC time without tzinfo, for naive UTC columns like recorded_at."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_utc(moment: datetime) -> datetime:
    """An aware UTC datetime, whether the database returned it aware or naive.

    Columns declared DateTime(timezone=True) come back aware from Postgres but
    NAIVE from SQLite (the local-dev database), and subtracting one from
    `datetime.now(timezone.utc)` raises TypeError. The scraper did exactly that
    on `latest_release_at` and `jobs_updated_at`, so on SQLite every scrape
    cycle after the first successful release lookup rolled back.
    """
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def utc_today() -> date:
    """Today's date in UTC, never the server's local date."""
    return datetime.now(timezone.utc).date()


def utc_midnight_naive(day: date) -> datetime:
    """00:00 UTC on `day`, naive, for >= comparisons on naive UTC columns."""
    return datetime(day.year, day.month, day.day)  # noqa: DTZ001 - naive by design, see module docstring
