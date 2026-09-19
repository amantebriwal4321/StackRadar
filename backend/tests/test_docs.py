"""CLAUDE.md is instructions, so a mangled edit misleads every later session.

A splice edit anchored on "### Frontend" matched "### Frontend (local)" earlier
in the file and duplicated 70 lines, including a stale copy of the very section
the edit was replacing. Nothing caught it: the file still rendered, and both
copies looked plausible in isolation.
"""
import re
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


def test_claude_md_documents_the_real_test_count():
    """The stale copy advertised a count from two commits earlier."""
    text = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
    claimed = re.findall(r"~(\d+) tests", text)
    assert len(claimed) == 1, f"expected one test-count claim, found {claimed}"
    actual = sum(
        len(re.findall(r"^def test_|^    def test_", p.read_text(encoding="utf-8"), re.MULTILINE))
        for p in (REPO / "backend" / "tests").glob("test_*.py")
    )
    # Parametrised cases make the real total higher; the doc must not overstate,
    # and must not drift far below.
    assert actual - 25 <= int(claimed[0]) <= actual + 60, (
        f"CLAUDE.md claims ~{claimed[0]} tests; {actual} test functions exist"
    )
