"""Read-only client for the public StackRadar HTTP API."""

from __future__ import annotations

import os

import httpx2

DEFAULT_API_URL = "https://stackradar-backend-kbxl.onrender.com"


def api_base_url() -> str:
    return os.environ.get("STACKRADAR_API_URL", DEFAULT_API_URL).rstrip("/")


class StackRadarClient:
    def __init__(self, base_url: str | None = None, http: httpx2.Client | None = None):
        self.base_url = (base_url or api_base_url()).rstrip("/")
        self._http = http or httpx2.Client(timeout=60.0)
        self._owns = http is None

    def close(self) -> None:
        if self._owns:
            self._http.close()

    def list_tools(self) -> list[dict]:
        tools: list[dict] = []
        page = 1
        while page <= 10:
            response = self._http.get(
                f"{self.base_url}/api/v1/tools",
                params={"per_page": 100, "page": page},
            )
            response.raise_for_status()
            body = response.json()
            tools.extend(body.get("tools") or [])
            total_pages = int(body.get("total_pages") or 1)
            if page >= total_pages:
                break
            page += 1
        return tools
