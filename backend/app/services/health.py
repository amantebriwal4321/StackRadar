"""Data-freshness assessment, kept pure so it can be tested without a server.

The API's job here is to say, truthfully, whether the numbers on the site are
current. That used to be impossible to get wrong-looking: /health returned
"status": "ok" unconditionally, even with the database unreachable, and nothing
reported a scraper that had stopped producing data.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

# Four missed 30-minute cycles. Long enough to ride out one slow run or a
# free-tier cold start, short enough that a dead scraper is noticed same-day.
STALE_AFTER = timedelta(hours=2)

# Consecutive failed cycles before the scraper is called failing even though
# the last good data is still inside the freshness window.
FAILING_AFTER = 2


def _parse(ts: Any) -> datetime | None:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        dt = ts
    else:
        try:
            dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        except ValueError:
            return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def assess_freshness(
    last_success: Any,
    last_snapshot: Any = None,
    consecutive_failures: int = 0,
    now: datetime | None = None,
    stale_after: timedelta = STALE_AFTER,
) -> dict[str, Any]:
    """Classify the data as fresh, stale, failing or never.

    `last_success` is the in-process scrape stamp; `last_snapshot` is the newest
    persisted ToolSnapshot. The snapshot is the fallback because the in-process
    stamp resets on every restart - and on a sleeping free tier that is often.
    """
    now = now or datetime.now(timezone.utc)
    last = _parse(last_success) or _parse(last_snapshot)

    if last is None:
        return {"state": "never", "healthy": False, "last_success": None,
                "age_minutes": None, "consecutive_failures": consecutive_failures}

    age = now - last
    if age > stale_after:
        state = "stale"
    elif consecutive_failures >= FAILING_AFTER:
        state = "failing"
    else:
        state = "fresh"

    return {
        "state": state,
        "healthy": state == "fresh",
        "last_success": last.isoformat(),
        "age_minutes": max(0, int(age.total_seconds() // 60)),
        "consecutive_failures": consecutive_failures,
        "stale_after_minutes": int(stale_after.total_seconds() // 60),
    }
