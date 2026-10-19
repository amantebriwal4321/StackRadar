import json

import httpx2
from stackradar_mcp.catalog_index import load_index, parse_catalog_py
from stackradar_mcp.client import StackRadarClient
from stackradar_mcp.service import (
    compare_tools,
    dependency_risk,
    match_package,
    trending_tools,
)

ROOT = __import__("pathlib").Path(__file__).resolve().parents[2]


def _client(tools: list[dict]) -> StackRadarClient:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path != "/api/v1/tools":
            return httpx2.Response(404, json={"detail": "nope"})
        return httpx2.Response(
            200,
            json={
                "tools": tools,
                "total": len(tools),
                "page": 1,
                "per_page": 100,
                "total_pages": 1,
            },
        )

    http = httpx2.Client(
        transport=httpx2.MockTransport(handler), base_url="https://example.test"
    )
    return StackRadarClient(base_url="https://example.test", http=http)


def _react(**extra):
    row = {
        "slug": "react",
        "name": "React",
        "category": "Web Development",
        "score": 70,
        "trend_stage": "stable",
        "growth_pct": 0,
        "jobs_mentions": None,
        "jobs_sample": None,
        "jobs_period": None,
    }
    row.update(extra)
    return row


def test_catalog_index_matches_backend_catalog():
    live = parse_catalog_py(ROOT / "backend/app/services/catalog.py")
    assert load_index() == live


def test_match_package_uses_slug_name_and_keyword():
    catalog = load_index()
    assert match_package(catalog, "react")["slug"] == "react"
    assert match_package(catalog, "Next.js")["slug"] == "nextjs"
    assert match_package(catalog, "lodash") is None


def test_dependency_risk_flags_declining_growth():
    catalog = load_index()
    client = _client([_react(growth_pct=-6, trend_stage="stable")])
    body = dependency_risk(client, catalog, "React")
    assert body["ok"] is True
    assert body["tracked"] is True
    assert body["slug"] == "react"
    assert body["flag"] == "declining"
    assert body["score"] == 70
    assert body["jobs_mentions"] is None


def test_dependency_risk_flags_declining_trend():
    catalog = load_index()
    client = _client([_react(trend_stage="declining", growth_pct=0)])
    body = dependency_risk(client, catalog, "react")
    assert body["flag"] == "declining"


def test_stable_tool_is_not_flagged():
    catalog = load_index()
    client = _client([_react()])
    body = dependency_risk(client, catalog, "react")
    assert body["flag"] is None


def test_untracked_package_is_not_a_score():
    catalog = load_index()
    client = _client([_react()])
    body = dependency_risk(client, catalog, "lodash")
    assert body["ok"] is True
    assert body["tracked"] is False
    assert body["flag"] is None
    assert "score" not in body


def test_unreachable_api_does_not_invent_a_score():
    catalog = load_index()

    def handler(_request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(503, json={"detail": "down"})

    http = httpx2.Client(transport=httpx2.MockTransport(handler))
    client = StackRadarClient(base_url="https://example.test", http=http)
    body = dependency_risk(client, catalog, "react")
    assert body["ok"] is False
    assert body["error"] == "stackradar_unreachable"
    assert "score" not in body


def test_compare_and_trending_keep_api_scores():
    catalog = load_index()
    vue = _react()
    vue.update(
        {"slug": "vuejs", "name": "Vue.js", "score": 40, "category": "Web Development"}
    )
    client = _client([_react(score=80), vue])
    compared = compare_tools(client, catalog, "react", "vuejs")
    assert compared["a"]["score"] == 80
    assert compared["b"]["score"] == 40
    listed = trending_tools(client, catalog, category="Web Development", limit=1)
    assert listed["tools"][0]["slug"] == "react"
    assert listed["tools"][0]["score"] == 80


def test_tool_results_are_json():
    raw = json.dumps(dependency_risk(_client([_react()]), load_index(), "react"))
    assert json.loads(raw)["slug"] == "react"
