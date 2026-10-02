"""
Rate limiting for the endpoints that write or guard something.

The limiter lived in main.py and was attached to the app, but no endpoint was
ever decorated, so nothing was limited: POST /waitlist took unlimited junk and
the admin key could be guessed as fast as the network allowed.

Only browser-originated writes and the admin endpoints are limited. Read
endpoints are not, on purpose: the Next server's SSR/ISR fetches all arrive
from the frontend host's IPs, so a per-IP read limit would throttle the site
itself rather than any one visitor.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def client_ip(request: Request) -> str:
    """The visitor's IP, not the proxy's.

    Browsers reach the API through the frontend's same-origin proxy, so the TCP
    peer is the proxy and every visitor would share one bucket. The first
    X-Forwarded-For entry is the client the proxy saw. A caller hitting the
    backend directly can forge that header and pick a fresh bucket - the limit
    is a brake on casual abuse, not an authentication boundary.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    first = forwarded.split(",")[0].strip()
    return first or get_remote_address(request)


limiter = Limiter(key_func=client_ip)

# One place for the numbers, so a test can name the limit it is checking.
WAITLIST_LIMIT = "5/minute"
NOTIFICATIONS_LIMIT = "10/minute"
PROGRESS_WRITE_LIMIT = "60/minute"
ADMIN_LIMIT = "10/minute"
