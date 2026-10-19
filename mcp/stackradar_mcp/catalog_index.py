"""Catalog names the MCP server is allowed to match.

The runtime reads catalog.json, generated from backend/app/services/catalog.py.
It does not import the FastAPI app.
"""

from __future__ import annotations

import ast
import json
from pathlib import Path

INDEX_PATH = Path(__file__).with_name("catalog.json")


def load_index(path: Path | None = None) -> list[dict]:
    raw = json.loads((path or INDEX_PATH).read_text())
    return list(raw)


def parse_catalog_py(path: Path) -> list[dict]:
    tree = ast.parse(path.read_text())
    tools = None
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "TOOLS":
                    tools = ast.literal_eval(node.value)
    if not isinstance(tools, list):
        raise TypeError(f"{path} has no TOOLS list")
    return [
        {
            "slug": tool["slug"],
            "name": tool["name"],
            "category": tool["category"],
            "keywords": list(tool["keywords"]),
        }
        for tool in tools
    ]
