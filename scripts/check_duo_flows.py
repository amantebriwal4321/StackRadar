#!/usr/bin/env python3
"""Check Duo flow YAML against the published v1 limits for custom flows."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
FLOWS = ROOT / ".gitlab" / "duo" / "flows"
AGENTS = ROOT / ".gitlab" / "duo" / "agents"

FORBIDDEN_TOP = {"name", "description", "product_group"}
HUMAN_ROUTES = {"approve", "modify", "reject", "default_route"}


def _inputs(component: dict) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for item in component.get("inputs") or []:
        if isinstance(item, str):
            aliases[item.split(":")[-1]] = item
        elif isinstance(item, dict) and "as" in item:
            aliases[str(item["as"])] = str(item.get("from"))
    return aliases


def _check_flow(path: Path, data: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return [f"{path}: file is not a mapping"]
    if data.get("version") != "v1":
        errors.append(f"{path}: version must be v1")
    if data.get("environment") != "ambient":
        errors.append(f"{path}: environment must be ambient")
    coding = data.get("coding_environment")
    if coding is not None and coding not in {"full", "none"}:
        errors.append(f"{path}: coding_environment must be full or none")
    extra = FORBIDDEN_TOP & set(data)
    if extra:
        errors.append(f"{path}: custom flows reject {sorted(extra)}")

    components = data.get("components") or []
    names = [c.get("name") for c in components]
    if len(names) != len(set(names)) or any(not n for n in names):
        errors.append(f"{path}: component names must be unique")
    for name in names:
        if not isinstance(name, str) or ":" in name or "." in name:
            errors.append(f"{path}: bad component name {name!r}")

    prompts = {p.get("prompt_id"): p for p in data.get("prompts") or []}
    for component in components:
        kind = component.get("type")
        if kind == "AgentComponent":
            if (
                "response_schema_id" in component
                or "response_schema_version" in component
            ):
                errors.append(
                    f"{path}: {component['name']} uses a response schema, which custom flows reject"
                )
            prompt_id = component.get("prompt_id")
            prompt = prompts.get(prompt_id)
            if prompt is None:
                errors.append(
                    f"{path}: {component['name']} prompt_id {prompt_id} is missing"
                )
                continue
            if "model" in prompt or "model" in (prompt.get("params") or {}):
                errors.append(
                    f"{path}: prompt {prompt_id} sets model, which custom flows reject"
                )
            if prompt.get("unit_primitives") != []:
                errors.append(f"{path}: prompt {prompt_id} needs unit_primitives: []")
            template = prompt.get("prompt_template") or {}
            if template.get("placeholder") != "history":
                errors.append(f"{path}: prompt {prompt_id} needs placeholder: history")
            system = template.get("system") or ""
            if "{{" in system or "}}" in system:
                errors.append(
                    f"{path}: prompt {prompt_id} system text contains a jinja brace"
                )
            user = template.get("user") or ""
            wanted = _brace_names(user)
            aliases = set(_inputs(component))
            missing = wanted - aliases
            if missing:
                errors.append(
                    f"{path}: {component['name']} user template needs inputs {sorted(missing)}"
                )
        elif kind == "HumanInputComponent":
            if component.get("interaction_type") not in {"approval", "input"}:
                errors.append(
                    f"{path}: {component['name']} needs an explicit interaction_type"
                )
            events = component.get("ui_log_events") or []
            for event in ("on_user_input_prompt", "on_user_response"):
                if event not in events:
                    errors.append(f"{path}: {component['name']} missing {event}")
            target = component.get("sends_response_to")
            if target not in names:
                errors.append(
                    f"{path}: {component['name']} sends_response_to {target} is unknown"
                )
            elif names.index(target) > names.index(component["name"]):
                errors.append(
                    f"{path}: {component['name']} sends_response_to a component that is defined later"
                )
        else:
            errors.append(f"{path}: unsupported component type {kind}")

    entry = (data.get("flow") or {}).get("entry_point")
    if entry not in names:
        errors.append(f"{path}: entry_point {entry} is not a component")

    known = set(names) | {"end", "abort"}
    human = {c["name"] for c in components if c.get("type") == "HumanInputComponent"}
    for router in data.get("routers") or []:
        source = router.get("from")
        if source not in names:
            errors.append(f"{path}: router from unknown component {source}")
        if "condition" in router:
            routes = (router.get("condition") or {}).get("routes") or {}
            if "default_route" not in routes:
                errors.append(f"{path}: router from {source} needs default_route")
            if source in human and not HUMAN_ROUTES <= set(routes):
                errors.append(
                    f"{path}: approval router from {source} must handle approve, modify, reject"
                )
            for target in routes.values():
                if target not in known:
                    errors.append(f"{path}: router target {target} is unknown")
        else:
            target = router.get("to")
            if target not in known:
                errors.append(f"{path}: router target {target} is unknown")
    return errors


def _brace_names(text: str) -> set[str]:
    import re

    return set(re.findall(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}", text))


def _check_agent(path: Path, data: dict) -> list[str]:
    errors: list[str] = []
    for key in (
        "display_name",
        "description",
        "flow",
        "prompt_id",
        "ui_tools",
        "triggers",
    ):
        if key not in data:
            errors.append(f"{path}: missing {key}")
    flow = ROOT / str(data.get("flow") or "")
    if not flow.is_file():
        errors.append(f"{path}: flow file {data.get('flow')} is missing")
    elif data.get("prompt_id"):
        loaded = yaml.safe_load(flow.read_text())
        ids = {p.get("prompt_id") for p in loaded.get("prompts") or []}
        if data["prompt_id"] not in ids:
            errors.append(f"{path}: prompt_id is not in {data['flow']}")
    return errors


def main() -> int:
    errors: list[str] = []
    flow_files = sorted(FLOWS.glob("*.yaml"))
    if len(flow_files) != 5:
        errors.append(f"expected 5 flow files, found {len(flow_files)}")
    for path in flow_files:
        errors.extend(_check_flow(path, yaml.safe_load(path.read_text())))
    agent_files = sorted(AGENTS.glob("*.yaml"))
    if len(agent_files) != 5:
        errors.append(f"expected 5 agent checklists, found {len(agent_files)}")
    for path in agent_files:
        errors.extend(_check_agent(path, yaml.safe_load(path.read_text())))
    ci = yaml.safe_load((ROOT / ".gitlab-ci.yml").read_text())
    for job in (
        "test:backend",
        "test:mcp",
        "lint:backend",
        "lint:frontend",
        "build:backend",
        "deploy:cloud-run",
        "smoke:health",
    ):
        if job not in ci:
            errors.append(f".gitlab-ci.yml missing {job}")
    includes = ci.get("include") or []
    templates = []
    for item in includes:
        if isinstance(item, dict):
            templates.append(item.get("template"))
        elif isinstance(item, str):
            templates.append(item)
    for expected in (
        "Jobs/SAST.gitlab-ci.yml",
        "Jobs/Secret-Detection.gitlab-ci.yml",
        "Jobs/Dependency-Scanning.v2.gitlab-ci.yml",
    ):
        if expected not in templates:
            errors.append(f".gitlab-ci.yml missing template {expected}")
    if errors:
        print("\n".join(errors))
        return 1
    print(
        f"duo flows ok ({len(flow_files)} flows, {len(agent_files)} agent checklists)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
