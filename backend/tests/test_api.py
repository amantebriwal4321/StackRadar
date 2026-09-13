"""The app booted for real, against a fresh seeded database and no API keys."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import projects as P
from app.services.scheduler import scrape_status


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def status(monkeypatch):
    for k, v in {"last_scraped_time": None, "consecutive_failures": 0}.items():
        monkeypatch.setitem(scrape_status, k, v)
    return scrape_status


def test_boots_keyless_and_seeds_the_catalog(client, status):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["db"] == "connected"
    assert r.json()["tools_tracked"] == 31


def test_never_scraped_database_is_reported_not_ok(client, status):
    # The old /health said "ok" here as a literal.
    body = client.get("/api/v1/health").json()
    assert body["status"] == "degraded"
    assert body["data"]["state"] == "never"
    assert client.get("/api/v1/health/data").status_code == 503


def test_fresh_scrape_is_healthy(client, status):
    status["last_scraped_time"] = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    assert client.get("/api/v1/health").json()["status"] == "ok"
    r = client.get("/api/v1/health/data")
    assert r.status_code == 200 and r.json()["state"] == "fresh"


def test_repeated_failures_make_data_health_fail(client, status):
    status["last_scraped_time"] = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    status["consecutive_failures"] = 3
    r = client.get("/api/v1/health/data")
    assert r.status_code == 503 and r.json()["detail"]["state"] == "failing"


def test_projects_list_serves_every_brief(client):
    r = client.get("/api/v1/projects")
    assert r.status_code == 200
    body = r.json()
    items = body["projects"] if isinstance(body, dict) else body
    assert {p["slug"] for p in items} == {p["slug"] for p in P.PROJECTS}


def test_project_detail_without_keys_serves_docs_and_steps(client, monkeypatch):
    # No YouTube key, and the oEmbed check stubbed to fail closed: the brief
    # must still ship with its docs and written steps, never a 500.
    from app.services import resources

    async def unverifiable(*_a, **_k):
        return None

    monkeypatch.setattr(resources, "verify_youtube", unverifiable)
    r = client.get("/api/v1/projects/nextjs-url-shortener")
    assert r.status_code == 200
    w = r.json()["walkthrough"]
    assert w["docs"] and len(w["steps"]) == 5
    assert all(set(s) == {"do", "detail", "doc", "gotcha"} for s in w["steps"])
    assert w["videos_live"] is False


def test_unknown_project_is_404(client):
    assert client.get("/api/v1/projects/not-a-project").status_code == 404


# The route contract the old inline CI script checked, as a test that says what
# is missing instead of exiting 1 with no output.
#
# Read from the OpenAPI schema, NOT app.routes. From FastAPI 0.141 an included
# router shows up in app.routes as one path-less _IncludedRouter, so walking
# app.routes finds no /api/v1 route at all while every request still works -
# which is exactly why the inline check failed on CI (unpinned, 0.141) and
# passed locally (0.135) for a week.
REQUIRED_ROUTES = [
    "/api/v1/tools", "/api/v1/tools/{slug}", "/api/v1/tools/{slug}/resources",
    "/api/v1/projects", "/api/v1/projects/{slug}", "/api/v1/roadmaps",
    "/api/v1/overview", "/api/v1/status", "/api/v1/health", "/api/v1/health/data",
]


def test_public_routes_are_registered():
    registered = set(app.openapi()["paths"])
    missing = [p for p in REQUIRED_ROUTES if p not in registered]
    assert not missing, f"routes not registered: {missing}"
