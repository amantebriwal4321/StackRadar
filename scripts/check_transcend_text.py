#!/usr/bin/env python3
"""Reject em dashes, en dashes, and double dashes in the hackathon prose."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FENCE = re.compile(r"```.*?```", re.DOTALL)

PATHS = [
    *sorted((ROOT / "docs" / "gitlab-transcend").rglob("*.md")),
    *sorted((ROOT / ".gitlab" / "duo").rglob("*.yaml")),
    *sorted((ROOT / ".gitlab" / "duo").rglob("*.json")),
]


def _visible(path: Path, text: str) -> str:
    if path.suffix != ".md":
        return text
    text = FENCE.sub("", text)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    kept: list[str] = []
    for line in text.splitlines(keepends=True):
        # Markdown table rules are pipes and dashes. They are syntax, not prose.
        if re.fullmatch(r"[\s|:-]+", line.strip() or "x") and "--" in line:
            continue
        kept.append(line)
    return "".join(kept)


def _readme_section() -> str:
    readme = (ROOT / "README.md").read_text()
    start = readme.find("<!-- transcend-start -->")
    end = readme.find("<!-- transcend-end -->")
    if start < 0 or end < 0:
        raise SystemExit("README.md is missing the transcend markers")
    return readme[start:end]


def main() -> int:
    bad: list[str] = []
    blobs = [(path, path.read_text()) for path in PATHS]
    blobs.append((ROOT / "README.md", _readme_section()))
    for path, text in blobs:
        visible = _visible(path, text)
        for label, needle in (
            ("em dash", "\u2014"),
            ("en dash", "\u2013"),
            ("double dash", "--"),
        ):
            if needle in visible:
                line_no = visible[: visible.index(needle)].count("\n") + 1
                bad.append(f"{path.relative_to(ROOT)}:{line_no} has a {label}")
    if bad:
        print("\n".join(bad))
        return 1
    print(f"transcend text ok ({len(blobs)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
