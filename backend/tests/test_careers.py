"""Career briefs: authored content, validated at import, never dressed as data."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import careers as C
from app.services.catalog import CATALOG_SLUGS
from app.services.seed import SEED_ROADMAPS


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# --- the content itself ---------------------------------------------------------


def test_exactly_the_three_focus_domains():
    assert C.FOCUS_DOMAINS == ("web-development", "ai-ml", "devops")


def test_every_brief_targets_a_real_roadmap():
    roadmaps = {r["slug"] for r in SEED_ROADMAPS}
    for career in C.CAREERS:
        assert career["slug"] in roadmaps, "a brief with no roadmap renders nowhere"


def test_every_named_tool_is_in_the_catalog():
    for career in C.CAREERS:
        for slug in career["tool_slugs"]:
            assert slug in CATALOG_SLUGS, f"{career['slug']} names unknown tool {slug}"


def test_no_brief_is_a_stub():
    for career in C.CAREERS:
        assert len(career["postings_ask"]) >= 4
        assert len(career["portfolio_expects"]) >= 3
        assert len(career["first_90_days"]) >= 3
        assert len(career["reality"]) > 200, "the honest paragraph is the point"


def test_the_briefs_are_labelled_authored_and_dated():
    # The UI has to be able to mark this as opinion, not measurement.
    brief = C.get_career("devops")
    assert brief["authored"] is True
    assert brief["reviewed"] == C.REVIEWED


def test_a_roadmap_without_a_brief_returns_none():
    # Five roadmaps have none. None is an answer; a generic brief would be a lie.
    assert C.get_career("cybersecurity") is None
    assert C.get_career("not-a-roadmap") is None


def test_validation_rejects_a_tool_that_does_not_exist(monkeypatch):
    monkeypatch.setattr(
        C, "CAREERS", [{**C.CAREERS[0], "tool_slugs": ["react", "not-a-tool"]}]
    )
    with pytest.raises(ValueError, match="not in the catalog"):
        C._validate()


def test_validation_rejects_a_brief_with_no_roadmap(monkeypatch):
    monkeypatch.setattr(C, "CAREERS", [{**C.CAREERS[0], "slug": "underwater-basket-weaving"}])
    with pytest.raises(ValueError, match="not a roadmap slug"):
        C._validate()


def test_validation_rejects_an_empty_section(monkeypatch):
    monkeypatch.setattr(C, "CAREERS", [{**C.CAREERS[0], "portfolio_expects": []}])
    with pytest.raises(ValueError, match="missing"):
        C._validate()


# --- served on the roadmap ---------------------------------------------------------


def test_roadmap_carries_the_brief_and_the_measured_counts(client):
    body = client.get("/api/v1/roadmaps/devops").json()
    career = body["career"]
    assert career["role_title"].startswith("Junior")
    assert career["authored"] is True
    # Measured numbers travel separately from the authored prose, so the UI can
    # label each correctly.
    slugs = [d["slug"] for d in career["demand"]]
    assert "kubernetes" in slugs and "terraform" in slugs
    for entry in career["demand"]:
        assert {"jobs_mentions", "jobs_sample", "jobs_period"} <= set(entry)


def test_a_roadmap_without_a_brief_says_so_rather_than_inventing_one(client):
    assert client.get("/api/v1/roadmaps/cybersecurity").json()["career"] is None


def test_the_brief_does_not_leak_raw_tool_slugs(client):
    # tool_slugs is an internal join key; the rendered payload carries hydrated
    # tools instead, so the UI cannot accidentally print a slug at a reader.
    career = client.get("/api/v1/roadmaps/ai-ml").json()["career"]
    assert "tool_slugs" not in career
