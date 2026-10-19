import asyncio
import json
import subprocess
import sys
from pathlib import Path

from stackradar_mcp.server import health

ROOT = Path(__file__).resolve().parents[2]


def test_health_route_reports_the_mcp_path():
    response = asyncio.run(health(None))
    body = json.loads(response.body)
    assert body["status"] == "ok"
    assert body["path"] == "/mcp"
    assert "2025-11-25" in body["protocol_versions"]


def test_flow_yaml_and_prose_checkers():
    subprocess.check_call(
        [sys.executable, str(ROOT / "scripts/check_duo_flows.py")], cwd=ROOT
    )
    subprocess.check_call(
        [sys.executable, str(ROOT / "scripts/check_transcend_text.py")], cwd=ROOT
    )


def test_demo_patch_applies_cleanly():
    subprocess.check_call(
        [
            "git",
            "apply",
            "--check",
            "docs/gitlab-transcend/demo/failing-pipeline.patch",
        ],
        cwd=ROOT,
    )
