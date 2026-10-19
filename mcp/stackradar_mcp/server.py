"""Streamable HTTP MCP server.

Duo Agent Platform chat and the IDE client can point at /mcp.
Custom flows in this repo call the REST API directly, because a flow
toolset cannot list an arbitrary MCP server.
"""

from __future__ import annotations

import json
import os
from typing import Annotated

from mcp.server import MCPServer
from mcp.types.version import HANDSHAKE_PROTOCOL_VERSIONS, LATEST_PROTOCOL_VERSION
from pydantic import Field
from starlette.requests import Request
from starlette.responses import JSONResponse

from stackradar_mcp import __version__
from stackradar_mcp.catalog_index import load_index
from stackradar_mcp.client import StackRadarClient, api_base_url
from stackradar_mcp.service import (
    compare_tools,
    dependency_risk,
    tool_score,
    trending_tools,
)

INSTRUCTIONS = (
    "StackRadar scores are measured by the StackRadar API. "
    "Do not invent a score. If a tool result has ok false, say the score was not measured. "
    "flag declining means trend_stage is declining or growth_pct is below -5. "
    "jobs_mentions is a hiring sample with jobs_sample and jobs_period. "
    "Null jobs_mentions means not measured. It is not part of the score. "
    "dependency_risk is the tool for a package name a merge request adds. "
    "tool_score is one catalog tool. compare_tools is two names. "
    "trending_tools lists a category."
)

mcp = MCPServer(
    "StackRadar",
    title="StackRadar MCP",
    description="Measured momentum scores for the StackRadar catalog.",
    instructions=INSTRUCTIONS,
    website_url="https://github.com/amantebriwal4321/StackRadar",
    version=__version__,
)


def _text(payload: dict) -> str:
    return json.dumps(payload, indent=2, sort_keys=True)


@mcp.tool(name="dependency_risk", title="Dependency risk")
def dependency_risk_tool(
    package: Annotated[
        str, Field(description="Package or tool name, for example react or lodash")
    ],
) -> str:
    """Look up one dependency in the StackRadar catalog and return its measured score."""
    catalog = load_index()
    client = StackRadarClient()
    try:
        return _text(dependency_risk(client, catalog, package))
    finally:
        client.close()


@mcp.tool(name="tool_score", title="Tool score")
def tool_score_tool(
    name: Annotated[
        str, Field(description="Tool name or slug, for example FastAPI or nextjs")
    ],
) -> str:
    """Return one catalog tool's score, trend, and growth from the API."""
    catalog = load_index()
    client = StackRadarClient()
    try:
        return _text(tool_score(client, catalog, name))
    finally:
        client.close()


@mcp.tool(name="compare_tools", title="Compare tools")
def compare_tools_tool(
    a: Annotated[str, Field(description="First tool name or slug")],
    b: Annotated[str, Field(description="Second tool name or slug")],
) -> str:
    """Return the measured scores for two catalog tools."""
    catalog = load_index()
    client = StackRadarClient()
    try:
        return _text(compare_tools(client, catalog, a, b))
    finally:
        client.close()


@mcp.tool(name="trending_tools", title="Trending tools")
def trending_tools_tool(
    category: Annotated[str, Field(description="Catalog category, or all")] = "all",
    limit: Annotated[
        int, Field(description="How many tools, from 1 to 10", ge=1, le=10)
    ] = 5,
) -> str:
    """List catalog tools in a category, highest score first."""
    catalog = load_index()
    client = StackRadarClient()
    try:
        return _text(trending_tools(client, catalog, category=category, limit=limit))
    finally:
        client.close()


@mcp.custom_route("/health", methods=["GET"])
async def health(_: Request) -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "name": "stackradar-mcp",
            "version": __version__,
            "transport": "streamable-http",
            "path": "/mcp",
            "api_base_url": api_base_url(),
            "protocol_versions": list(HANDSHAKE_PROTOCOL_VERSIONS)
            + [LATEST_PROTOCOL_VERSION],
        }
    )


def serve(host: str | None = None, port: int | None = None) -> None:
    bind_host = host or os.environ.get("STACKRADAR_HOST", "127.0.0.1")
    bind_port = (
        port if port is not None else int(os.environ.get("STACKRADAR_PORT", "8080"))
    )
    mcp.run(
        transport="streamable-http",
        host=bind_host,
        port=bind_port,
        json_response=True,
        stateless_http=True,
    )
