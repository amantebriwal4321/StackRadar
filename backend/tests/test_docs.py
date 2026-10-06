"""CLAUDE.md is instructions, so a mangled edit misleads every later session.

A splice edit anchored on "### Frontend" matched "### Frontend (local)" earlier
in the file and duplicated 70 lines, including a stale copy of the very section
the edit was replacing. Nothing caught it: the file still rendered, and both
copies looked plausible in isolation.
"""
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
DOCS = [REPO / "CLAUDE.md", REPO / "DEPLOY.md"]


@pytest.mark.parametrize("path", DOCS, ids=lambda p: p.name)
def test_no_heading_appears_twice(path):
    text = path.read_text(encoding="utf-8")
    headings = re.findall(r"^#{2,3} .+$", text, re.MULTILINE)
    repeated = [h for h, n in Counter(headings).items() if n > 1]
    assert not repeated, f"{path.name} has duplicated sections: {repeated}"


@pytest.mark.parametrize("path", DOCS, ids=lambda p: p.name)
def test_no_duplicated_paragraph_blocks(path):
    # A duplicated splice repeats whole paragraphs verbatim, which prose does not.
    blocks = [
        b.strip() for b in path.read_text(encoding="utf-8").split("\n\n")
        if len(b.strip()) > 200 and not b.lstrip().startswith("```")
    ]
    repeated = [b[:60] for b, n in Counter(blocks).items() if n > 1]
    assert not repeated, f"{path.name} repeats paragraphs: {repeated}"


def _collected_test_count() -> int:
    """How many tests pytest itself collects - parametrised cases included.

    Counting `def test_` by regex was the first version and could not be made
    right: one function can be 180 cases (test_catalog), so any ratio between
    functions and cases breaks the next time a file is parametrised.
    """
    out = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", "-p", "no:cacheprovider"],
        cwd=REPO / "backend",
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
        check=False,
    ).stdout
    m = re.search(r"(\d+) tests? collected", out)
    assert m, f"could not read a collected count from pytest: {out[-300:]!r}"
    return int(m.group(1))


def test_claude_md_documents_the_real_test_count():
    """The doc may round, but must not drift: within 10% (and never less than
    25 tests) of what pytest collects."""
    text = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
    claimed = re.findall(r"~(\d+) tests", text)
    assert len(claimed) == 1, f"expected one test-count claim, found {claimed}"
    actual = _collected_test_count()
    tolerance = max(25, actual // 10)
    assert abs(int(claimed[0]) - actual) <= tolerance, (
        f"CLAUDE.md claims ~{claimed[0]} tests; pytest collects {actual}"
    )
