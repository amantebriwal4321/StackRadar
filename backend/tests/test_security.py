"""The holes the 2026-10-02 audit found, pinned shut.

1. With no CLERK_PUBLISHABLE_KEY, /progress and /notifications trusted any
   user_id on ANY server, so a deployment that forgot the key let anyone read
   another account's notification email. Now that fallback is local-only.
2. GET /tools/{slug}/resources?refresh=true was public and skipped the cache,
   spending 100 units of the 10,000/day YouTube quota per request.
3. A limiter was attached to the app but no endpoint used it.
4. Admin keys were compared with `!=`.
5. /status published raw exception text.
"""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core import auth
from app.core.config import settings
from app.core.rate_limit import client_ip, limiter
from app.main import app
from app.services.scheduler import _public_error


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def fresh_limits():
    limiter.reset()
    yield
    limiter.reset()


# ── 1. Unverified user ids are a local-dev convenience only ─────────────────


def test_keyless_sqlite_still_accepts_a_client_id(client):
    r = client.get("/api/v1/notifications/status", params={"user_id": "dev-user"})
    assert r.status_code == 200


def test_keyless_postgres_refuses_instead_of_trusting(client, monkeypatch):
    monkeypatch.setattr(
        settings, "SQLALCHEMY_DATABASE_URI", "postgresql://u:p@db.example/x"
    )
    monkeypatch.delenv("ALLOW_UNVERIFIED_USER_ID", raising=False)
    for method, path in [
        ("get", "/api/v1/notifications/status"),
        ("get", "/api/v1/progress/summary"),
        ("get", "/api/v1/progress/web-development"),
    ]:
        r = getattr(client, method)(path, params={"user_id": "someone-else"})
        assert r.status_code == 503, path
    r = client.post(
        "/api/v1/progress/toggle",
        json={"user_id": "someone-else", "roadmap_slug": "web-development", "step": 1},
    )
    assert r.status_code == 503


def test_the_opt_in_flag_reopens_it_deliberately(monkeypatch):
    monkeypatch.setattr(
        settings, "SQLALCHEMY_DATABASE_URI", "postgresql://u:p@db.example/x"
    )
    monkeypatch.setenv("ALLOW_UNVERIFIED_USER_ID", "1")
    assert auth.unverified_ids_allowed()


# ── 2. Forcing a YouTube refetch is admin-only ──────────────────────────────


def test_public_refresh_is_refused(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "right-key")
    r = client.get("/api/v1/tools/react/resources", params={"refresh": "true"})
    assert r.status_code == 403
    r = client.get(
        "/api/v1/tools/react/resources",
        params={"refresh": "true"},
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert r.status_code == 403


def test_refresh_without_an_admin_key_configured_is_unavailable(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "")
    r = client.get("/api/v1/tools/react/resources", params={"refresh": "true"})
    assert r.status_code == 503


# ── 3. Writes are rate limited, per visitor ─────────────────────────────────


def test_waitlist_is_rate_limited(client):
    codes = [
        client.post("/api/v1/waitlist", json={"email": f"a{i}@example.com"}).status_code
        for i in range(6)
    ]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429


def test_the_limit_is_per_forwarded_client_not_per_proxy(client):
    for i in range(5):
        client.post(
            "/api/v1/waitlist",
            json={"email": f"b{i}@example.com"},
            headers={"X-Forwarded-For": "203.0.113.1"},
        )
    # Same proxy, a different visitor behind it: their own bucket.
    r = client.post(
        "/api/v1/waitlist",
        json={"email": "c@example.com"},
        headers={"X-Forwarded-For": "203.0.113.2, 10.0.0.1"},
    )
    assert r.status_code == 200


def test_client_ip_reads_the_first_forwarded_hop():
    req = SimpleNamespace(
        headers={"x-forwarded-for": "198.51.100.7, 10.0.0.1"}, client=None
    )
    assert client_ip(req) == "198.51.100.7"


def test_admin_endpoints_are_rate_limited(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "right-key")
    codes = [
        client.get(
            "/api/v1/admin/waitlist", headers={"X-Admin-Key": "guess"}
        ).status_code
        for _ in range(11)
    ]
    assert codes[:10] == [403] * 10
    assert codes[10] == 429


# ── 4. The admin gate ───────────────────────────────────────────────────────


def test_admin_gate_accepts_the_right_key(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "right-key")
    r = client.get("/api/v1/admin/waitlist", headers={"X-Admin-Key": "right-key"})
    assert r.status_code == 200
    r = client.get("/api/v1/admin/waitlist")
    assert r.status_code == 403


# ── 5. /status says what crashed, not the message ───────────────────────────


def test_public_error_hides_the_message():
    e = RuntimeError("could not connect to postgres://u:secret@db.internal:5432")
    out = _public_error(e)
    assert "RuntimeError" in out
    assert "secret" not in out and "db.internal" not in out
