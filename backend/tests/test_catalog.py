"""The catalog and the seed data it feeds: invariants that must hold forever.

catalog.TOOLS is the single source of truth for every tracked tool, and the
seeder, the scorer, the scheduler and the learning pages all read it. The bug
that motivated it - two catalogs disagreeing, spawning ~23 placeholder rows
like "Python #1" - was a consistency failure, and consistency is cheap to test.
Nothing did. Each assertion below holds today; the point is that a future edit
which breaks one fails here, in CI, instead of in a half-empty domain page.
"""

import re
from collections import Counter, defaultdict

import pytest

from app.api.endpoints import mvp
from app.services.catalog import CATALOG_SLUGS, TOOLS
from app.services.seed import SEED_DOMAINS, SEED_ROADMAPS, TOOL_ROADMAP_MAP

LEVELS = {"beginner", "intermediate", "advanced"}
REQUIRED = {
    "name", "slug", "icon", "category", "github_repo", "description",
    "level", "is_entry_point", "seq", "parent_slug", "keywords",
}  # fmt: skip
BY_SLUG = {t["slug"]: t for t in TOOLS}
DOMAIN_NAMES = {d["name"] for d in SEED_DOMAINS}
ROADMAP_SLUGS = {r["slug"] for r in SEED_ROADMAPS}


def dupes(values):
    return [v for v, n in Counter(values).items() if n > 1]


# --- every entry is complete and unique ----------------------------------------


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t["slug"])
def test_every_entry_carries_every_field(tool):
    assert REQUIRED <= tool.keys(), f"missing {REQUIRED - tool.keys()}"


def test_slugs_names_and_repos_are_unique():
    assert dupes(t["slug"] for t in TOOLS) == []
    assert dupes(t["name"] for t in TOOLS) == []
    assert dupes(t["github_repo"] for t in TOOLS) == []


def test_catalog_slugs_is_exactly_the_slugs_in_the_list():
    assert set(CATALOG_SLUGS) == set(BY_SLUG)


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t["slug"])
def test_slug_is_url_safe_and_repo_is_owner_slash_name(tool):
    assert re.fullmatch(r"[a-z0-9-]+", tool["slug"])
    assert re.fullmatch(r"[\w.-]+/[\w.-]+", tool["github_repo"])


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t["slug"])
def test_description_is_a_real_sentence(tool):
    assert len(tool["description"].strip()) > 20
    assert tool["description"].strip().endswith((".", ")"))


# --- keywords are how mentions are attributed -----------------------------------


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t["slug"])
def test_keywords_are_lowercase_non_empty_and_include_the_tool(tool):
    kws = tool["keywords"]
    assert kws and all(k == k.lower() and k.strip() == k and k for k in kws)
    squash = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    assert any(squash(tool["slug"]) in squash(k) or squash(tool["name"]) in squash(k) for k in kws), (
        f"no keyword of {tool['slug']} looks like the tool itself: {kws}"
    )


def test_no_keyword_belongs_to_two_tools():
    """A shared keyword would credit one conversation to two tools."""
    owners = defaultdict(set)
    for t in TOOLS:
        for k in t["keywords"]:
            owners[k.lower()].add(t["slug"])
    assert {k: sorted(v) for k, v in owners.items() if len(v) > 1} == {}


def test_the_first_keyword_is_the_one_searched_on_hacker_news():
    """primary_keywords() feeds one Algolia query per tool from keywords[0]."""
    from app.services.scoring import primary_keywords

    assert sorted(primary_keywords()) == sorted({t["keywords"][0] for t in TOOLS})


# --- placement: domain, level, parent ---------------------------------------------


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t["slug"])
def test_every_tool_sits_in_a_seeded_domain_at_a_known_level(tool):
    assert tool["category"] in DOMAIN_NAMES
    assert tool["level"] in LEVELS


def test_every_seeded_domain_has_a_tool_and_an_entry_point():
    by_domain = defaultdict(list)
    for t in TOOLS:
        by_domain[t["category"]].append(t)
    assert set(by_domain) == DOMAIN_NAMES, "a domain with no tools is an empty page"
    for name, tools in by_domain.items():
        assert any(t["is_entry_point"] for t in tools), f"{name} has no entry point"


def test_seq_is_unique_within_a_domain():
    """seq orders a domain's learning path; a tie makes the order arbitrary."""
    seen = defaultdict(list)
    for t in TOOLS:
        seen[t["category"]].append(t["seq"])
    assert {d: dupes(s) for d, s in seen.items() if dupes(s)} == {}


def test_a_parent_exists_is_not_itself_and_never_forms_a_cycle():
    for t in TOOLS:
        parent = t["parent_slug"]
        if parent is None:
            continue
        assert parent in BY_SLUG, f"{t['slug']} -> unknown parent {parent}"
        assert parent != t["slug"]
        seen, cur = set(), t["slug"]
        while cur:
            assert cur not in seen, f"parent cycle through {cur}"
            seen.add(cur)
            cur = BY_SLUG[cur]["parent_slug"]


def test_a_parent_is_never_harder_than_its_child():
    rank = {"beginner": 0, "intermediate": 1, "advanced": 2}
    for t in TOOLS:
        if t["parent_slug"]:
            parent = BY_SLUG[t["parent_slug"]]
            assert rank[parent["level"]] <= rank[t["level"]], (
                f"{t['slug']} ({t['level']}) is taught after harder {parent['slug']}"
            )


# --- the roadmap map and the roadmaps themselves ------------------------------------


def test_every_tool_maps_to_a_real_roadmap_and_nothing_else_does():
    assert set(TOOL_ROADMAP_MAP) == set(BY_SLUG)
    assert set(TOOL_ROADMAP_MAP.values()) <= ROADMAP_SLUGS


def test_every_domain_has_a_roadmap():
    """Roadmaps are keyed by domain slug, so the two sets must be identical."""
    assert len(ROADMAP_SLUGS) == len(SEED_ROADMAPS), "duplicate roadmap slug"
    assert {d["slug"] for d in SEED_DOMAINS} == ROADMAP_SLUGS


@pytest.mark.parametrize("roadmap", SEED_ROADMAPS, ids=lambda r: r["slug"])
def test_roadmap_steps_are_numbered_from_one_without_gaps(roadmap):
    """user_progress is keyed by step NUMBER, so the numbering is load-bearing."""
    nums = [s["step"] for s in roadmap["steps"]]
    assert nums == list(range(1, len(nums) + 1))


@pytest.mark.parametrize("roadmap", SEED_ROADMAPS, ids=lambda r: r["slug"])
def test_roadmap_steps_have_text_a_level_and_resources(roadmap):
    assert roadmap["estimated_weeks"] > 0
    for s in roadmap["steps"]:
        assert s["title"].strip() and s["description"].strip()
        assert s["level"] in {"Beginner", "Intermediate", "Advanced"}
        assert "resources" in s


def test_the_editorial_step_to_tool_map_points_at_real_steps_and_tools():
    for roadmap, steps in mvp.ROADMAP_STEP_TOOLS.items():
        assert roadmap in ROADMAP_SLUGS, f"unknown roadmap {roadmap}"
        valid = {s["step"] for r in SEED_ROADMAPS if r["slug"] == roadmap for s in r["steps"]}
        for step, slugs in steps.items():
            assert step in valid, f"{roadmap} has no step {step}"
            assert slugs, f"{roadmap} step {step} lists no tools"
            assert set(slugs) <= set(BY_SLUG), f"unknown tool in {roadmap} step {step}"
            assert dupes(slugs) == []
