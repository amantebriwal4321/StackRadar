"""Match a package name to a catalog tool and read its measured score.

Scores are whatever the API returns. This module does not recompute them.
"""

from __future__ import annotations

import httpx2

from stackradar_mcp.client import StackRadarClient


def _norm(value: str) -> str:
    return "".join(ch for ch in value.casefold() if ch.isalnum())


def match_package(catalog: list[dict], package: str) -> dict | None:
    raw = package.strip()
    if not raw:
        return None
    candidates = {raw, raw.split("/")[-1]}
    folded = {item.casefold() for item in candidates if item}
    norms = {_norm(item) for item in candidates if item}
    for tool in catalog:
        names = [tool["slug"], tool["name"], *(tool.get("keywords") or [])]
        for name in names:
            if name.casefold() in folded or _norm(name) in norms:
                return tool
    return None


def _flag(trend_stage: str | None, growth_pct: object) -> str | None:
    # Same cut the API uses: growth under -5% is declining.
    if trend_stage == "declining":
        return "declining"
    if (
        isinstance(growth_pct, (int, float))
        and not isinstance(growth_pct, bool)
        and growth_pct < -5
    ):
        return "declining"
    return None


def _unreachable(package: str, slug: str | None, exc: Exception) -> dict:
    return {
        "ok": False,
        "package": package,
        "tracked": slug is not None,
        "slug": slug,
        "error": "stackradar_unreachable",
        "detail": str(exc),
    }


def _row_for(tools: list[dict], slug: str) -> dict | None:
    for tool in tools:
        if tool.get("slug") == slug:
            return tool
    return None


def _public_row(package: str, row: dict) -> dict:
    growth = row.get("growth_pct")
    trend = row.get("trend_stage")
    return {
        "ok": True,
        "package": package,
        "tracked": True,
        "slug": row.get("slug"),
        "name": row.get("name"),
        "category": row.get("category"),
        "score": row.get("score"),
        "trend_stage": trend,
        "growth_pct": growth,
        "flag": _flag(trend if isinstance(trend, str) else None, growth),
        "jobs_mentions": row.get("jobs_mentions"),
        "jobs_sample": row.get("jobs_sample"),
        "jobs_period": row.get("jobs_period"),
    }


def dependency_risk(
    client: StackRadarClient, catalog: list[dict], package: str
) -> dict:
    match = match_package(catalog, package)
    if match is None:
        return {
            "ok": True,
            "package": package,
            "tracked": False,
            "slug": None,
            "flag": None,
            "reason": "not in the StackRadar catalog",
        }
    try:
        tools = client.list_tools()
    except (httpx2.HTTPError, ValueError) as exc:
        return _unreachable(package, match["slug"], exc)
    row = _row_for(tools, match["slug"])
    if row is None:
        return {
            "ok": False,
            "package": package,
            "tracked": True,
            "slug": match["slug"],
            "error": "missing_from_api",
        }
    return _public_row(package, row)


def tool_score(client: StackRadarClient, catalog: list[dict], name: str) -> dict:
    return dependency_risk(client, catalog, name)


def compare_tools(
    client: StackRadarClient, catalog: list[dict], a: str, b: str
) -> dict:
    left = dependency_risk(client, catalog, a)
    right = dependency_risk(client, catalog, b)
    return {"ok": left.get("ok") and right.get("ok"), "a": left, "b": right}


def trending_tools(
    client: StackRadarClient,
    catalog: list[dict],
    category: str = "all",
    limit: int = 5,
) -> dict:
    try:
        tools = client.list_tools()
    except (httpx2.HTTPError, ValueError) as exc:
        return _unreachable(category, None, exc)
    wanted = category.casefold().strip()
    rows = tools
    if wanted and wanted != "all":
        allowed = {
            tool["slug"]
            for tool in catalog
            if wanted in tool["category"].casefold()
            or wanted in tool["slug"].casefold()
        }
        rows = [row for row in tools if row.get("slug") in allowed]
    rows = sorted(rows, key=lambda row: row.get("score") or 0, reverse=True)
    clipped = [
        _public_row(str(row.get("slug") or ""), row)
        for row in rows[: max(1, min(limit, 10))]
    ]
    return {"ok": True, "category": category, "tools": clipped}
