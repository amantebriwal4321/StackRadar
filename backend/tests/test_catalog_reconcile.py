"""run_seed and reconcile_catalog: the catalog must reach an EXISTING database.

CLAUDE.md promises that adding, editing or removing a tracked tool means editing
catalog.py and nothing else. run_seed only acts on an empty database, and
reconcile_catalog only ever deleted, so on every deployment after the first an
added tool never appeared and an edited description, level, parent or
github_repo never landed (a changed repo kept scraping the old one). Roadmaps
had the identical trap and got reconcile_roadmaps; this is the tool half.

Each test builds its own throwaway SQLite database, so nothing here touches the
shared test database.
"""

import tempfile
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models.all_models  # noqa: F401  (registers the tables on Base)
from app.db.base import Base
from app.models.all_models import Domain, Tool, ToolRoadmap, ToolSnapshot
from app.services import seed
from app.services.catalog import CATALOG_SLUGS, TOOLS


@pytest.fixture
def db():
    path = Path(tempfile.mkdtemp(prefix="stackradar-seed-")) / "seed.db"
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def seeded(db):
    seed.run_seed(db)
    return db


def tool(db, slug):
    return db.query(Tool).filter(Tool.slug == slug).one()


# --- run_seed ---------------------------------------------------------------------


def test_seeding_an_empty_database_creates_the_whole_catalog(db):
    seed.run_seed(db)
    assert db.query(Tool).count() == len(TOOLS) == 31
    assert db.query(Domain).count() == 8
    assert db.query(ToolRoadmap).count() == 8


def test_seeded_tools_are_placed_in_their_domain_and_parent(seeded):
    nextjs = tool(seeded, "nextjs")
    assert nextjs.domain_id == seeded.query(Domain).filter(Domain.name == "Web Development").one().id
    assert nextjs.parent_tool_id == tool(seeded, "react").id
    assert tool(seeded, "react").parent_tool_id is None


def test_seeding_never_invents_history(seeded):
    """The old seeder wrote random scores so charts would not look empty."""
    assert seeded.query(ToolSnapshot).count() == 0


def test_seeding_twice_changes_nothing(seeded):
    seed.run_seed(seeded)
    assert seeded.query(Tool).count() == 31


# --- a clean database ------------------------------------------------------------------


def test_reconcile_on_a_freshly_seeded_database_does_nothing(seeded):
    assert seed.reconcile_catalog(seeded) == {"added": [], "updated": [], "removed": []}


def test_reconcile_is_idempotent(seeded):
    tool(seeded, "react").description = "stale"
    seeded.commit()
    first = seed.reconcile_catalog(seeded)
    second = seed.reconcile_catalog(seeded)
    assert first["updated"] == ["react"]
    assert second == {"added": [], "updated": [], "removed": []}


# --- removing what the catalog does not know ------------------------------------------------


def test_a_non_catalog_row_is_removed_with_its_snapshots(seeded):
    ghost = Tool(name="Python #1", slug="python-1", category=None)
    seeded.add(ghost)
    seeded.flush()
    seeded.add(ToolSnapshot(tool_id=ghost.id, score=5.0))
    seeded.commit()

    result = seed.reconcile_catalog(seeded)

    assert result["removed"] == ["python-1"]
    assert seeded.query(Tool).filter(Tool.slug == "python-1").count() == 0
    assert seeded.query(ToolSnapshot).count() == 0
    assert seeded.query(Tool).count() == 31


def test_catalog_tools_keep_their_snapshots_when_orphans_are_removed(seeded):
    seeded.add(ToolSnapshot(tool_id=tool(seeded, "react").id, score=50.0))
    seeded.add(Tool(name="vue", slug="vue"))
    seeded.commit()
    seed.reconcile_catalog(seeded)
    assert seeded.query(ToolSnapshot).count() == 1


# --- adding what is missing --------------------------------------------------------------------


def test_a_tool_missing_from_the_database_is_added_with_domain_and_parent(seeded):
    seeded.delete(tool(seeded, "nextjs"))
    seeded.commit()

    result = seed.reconcile_catalog(seeded)

    assert result["added"] == ["nextjs"]
    nextjs = tool(seeded, "nextjs")
    assert nextjs.domain_id is not None
    assert nextjs.parent_tool_id == tool(seeded, "react").id
    assert (nextjs.level, nextjs.learning_sequence_score) == ("intermediate", 40)


def test_a_brand_new_catalog_entry_reaches_an_existing_database(seeded, monkeypatch):
    new = {
        "name": "Hono", "slug": "hono", "icon": "H", "category": "Web Development",
        "github_repo": "honojs/hono", "description": "A small, fast web framework.",
        "level": "intermediate", "is_entry_point": False, "seq": 42, "parent_slug": "bun",
        "keywords": ["hono"],
    }  # fmt: skip
    monkeypatch.setattr(seed, "SEED_TOOLS", [*TOOLS, new])
    monkeypatch.setattr(seed, "CATALOG_SLUGS", CATALOG_SLUGS | {"hono"})

    result = seed.reconcile_catalog(seeded)

    assert result["added"] == ["hono"] and result["removed"] == []
    hono = tool(seeded, "hono")
    assert hono.github_repo == "honojs/hono"
    assert hono.parent_tool_id == tool(seeded, "bun").id
    assert seeded.query(Tool).count() == 32


def test_a_catalog_category_with_no_domain_row_gets_one(seeded):
    seeded.query(Tool).filter(Tool.category == "Web3 / Blockchain").delete()
    seeded.query(Domain).filter(Domain.name == "Web3 / Blockchain").delete()
    seeded.commit()

    seed.reconcile_catalog(seeded)

    domain = seeded.query(Domain).filter(Domain.name == "Web3 / Blockchain").one()
    web3 = seeded.query(Tool).filter(Tool.category == "Web3 / Blockchain").all()
    assert web3 and all(t.domain_id == domain.id for t in web3)


# --- updating what was edited ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("field", "stale"),
    [
        ("description", "an old description"),
        ("icon", "?"),
        ("name", "Old Name"),
        ("category", "Data & Databases"),
        ("github_repo", "someone/old-repo"),
        ("level", "advanced"),
        ("is_entry_point", True),
        ("learning_sequence_score", 999),
    ],
)
def test_an_edited_catalog_field_reaches_the_row(seeded, field, stale):
    row = tool(seeded, "vite")
    setattr(row, field, stale)
    seeded.commit()

    result = seed.reconcile_catalog(seeded)

    assert result["updated"] == ["vite"]
    spec = next(t for t in TOOLS if t["slug"] == "vite")
    expected = {"learning_sequence_score": spec["seq"]}.get(field, spec.get(field))
    assert getattr(tool(seeded, "vite"), field) == expected


def test_a_moved_category_moves_the_domain_link_too(seeded):
    web = seeded.query(Domain).filter(Domain.name == "Web Development").one()
    other = seeded.query(Domain).filter(Domain.name == "DevOps").one()
    row = tool(seeded, "vite")
    row.category, row.domain_id = "DevOps", other.id
    seeded.commit()
    seed.reconcile_catalog(seeded)
    assert tool(seeded, "vite").domain_id == web.id


def test_a_wrong_or_missing_parent_link_is_repaired(seeded):
    nextjs = tool(seeded, "nextjs")
    nextjs.parent_tool_id = tool(seeded, "vuejs").id
    tool(seeded, "vite").parent_tool_id = None
    seeded.commit()

    result = seed.reconcile_catalog(seeded)

    assert set(result["updated"]) == {"nextjs", "vite"}
    assert tool(seeded, "nextjs").parent_tool_id == tool(seeded, "react").id
    assert tool(seeded, "vite").parent_tool_id == tool(seeded, "react").id


def test_a_parent_removed_from_the_catalog_unlinks_the_child(seeded, monkeypatch):
    patched = [dict(t, parent_slug=None) if t["slug"] == "trpc" else t for t in TOOLS]
    monkeypatch.setattr(seed, "SEED_TOOLS", patched)
    seed.reconcile_catalog(seeded)
    assert tool(seeded, "trpc").parent_tool_id is None


# --- what must never be touched ------------------------------------------------------------------------


def test_measured_fields_survive_every_reconcile(seeded):
    row = tool(seeded, "react")
    row.score, row.stars, row.forks = 88.5, 230_000, 47_000
    row.hn_count, row.growth_pct, row.sentiment_label = 4, 12.5, "positive"
    row.recommendation, row.jobs_mentions, row.latest_version = "Learn now", 171, "v19"
    row.description = "stale, forcing an update"
    seeded.commit()

    seed.reconcile_catalog(seeded)

    row = tool(seeded, "react")
    assert row.description != "stale, forcing an update"
    assert (row.score, row.stars, row.forks) == (88.5, 230_000, 47_000)
    assert (row.hn_count, row.growth_pct, row.sentiment_label) == (4, 12.5, "positive")
    assert (row.recommendation, row.jobs_mentions, row.latest_version) == ("Learn now", 171, "v19")


def test_measured_fields_of_a_re_added_tool_start_empty_not_borrowed(seeded):
    seeded.delete(tool(seeded, "svelte"))
    seeded.commit()
    seed.reconcile_catalog(seeded)
    assert tool(seeded, "svelte").score in (0, 0.0, None)
    assert tool(seeded, "svelte").jobs_mentions is None  # not measured, not zero


def test_the_changes_are_committed_not_just_flushed(seeded):
    """Another connection - the API serving requests - must see them."""
    seeded.delete(tool(seeded, "nextjs"))
    seeded.add(Tool(name="Ghost", slug="ghost"))
    tool(seeded, "react").description = "stale"
    seeded.commit()

    seed.reconcile_catalog(seeded)

    other = sessionmaker(bind=seeded.get_bind())()
    try:
        assert other.query(Tool).filter(Tool.slug == "nextjs").count() == 1
        assert other.query(Tool).filter(Tool.slug == "ghost").count() == 0
        assert other.query(Tool).filter(Tool.slug == "react").one().description != "stale"
    finally:
        other.close()
