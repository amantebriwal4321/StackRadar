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


def utc_today() -> date:
    """Today's date in UTC, never the server's local date."""
    return datetime.now(timezone.utc).date()


def utc_midnight_naive(day: date) -> datetime:
    """00:00 UTC on `day`, naive, for >= comparisons on naive UTC columns."""
    return datetime(day.year, day.month, day.day)  # noqa: DTZ001 - naive by design, see module docstring
