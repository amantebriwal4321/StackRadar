"""reconcile_roadmaps: roadmap edits must reach an existing database - safely.

run_seed returns early once any tool row exists, so before this every edit to
SEED_ROADMAPS was a no-op in production: the roadmaps live were whatever was
written the day the database was created.

The safety rule is not stylistic. user_progress is keyed
(user_id, roadmap_slug, step) by step NUMBER, so renumbering steps would
reassign somebody's completed lessons to different ones.
"""

import json

import pytest

from app.db.session import SessionLocal
from app.models.all_models import ToolRoadmap
from app.services.seed import SEED_ROADMAPS, reconcile_roadmaps


@pytest.fixture(scope="module", autouse=True)
def _booted():
    """Booting the app is what creates the tables in the throwaway database."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app):
        yield


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def roadmap_row(db):
    """A real roadmap row, restored exactly as found afterwards."""
    spec = next(r for r in SEED_ROADMAPS if r["slug"] == "devops")
    row = db.query(ToolRoadmap).filter(ToolRoadmap.slug == "devops").first()
    if not row:
        row = ToolRoadmap(
            slug="devops",
            title=spec["title"],
            description=spec["description"],
            icon=spec["icon"],
            estimated_weeks=spec["estimated_weeks"],
            steps_json=json.dumps(spec["steps"]),
        )
        db.add(row)
        db.commit()
    before = {
        "title": row.title,
        "description": row.description,
        "icon": row.icon,
        "estimated_weeks": row.estimated_weeks,
        "steps_json": row.steps_json,
    }
    yield row
    for key, value in before.items():
        setattr(row, key, value)
    db.commit()


def test_an_edited_roadmap_reaches_the_database(db, roadmap_row):
    roadmap_row.title = "Stale title from the day the DB was created"
    roadmap_row.estimated_weeks = 99
    db.commit()

    reconcile_roadmaps(db)
    db.refresh(roadmap_row)

    spec = next(r for r in SEED_ROADMAPS if r["slug"] == "devops")
    assert roadmap_row.title == spec["title"]
    assert roadmap_row.estimated_weeks == spec["estimated_weeks"]


def test_appending_a_step_is_allowed(db, roadmap_row, monkeypatch):
    spec = next(r for r in SEED_ROADMAPS if r["slug"] == "devops")
    # The database holds one fewer step than the code: an append.
    roadmap_row.steps_json = json.dumps(spec["steps"][:-1])
    db.commit()

    reconcile_roadmaps(db)
    db.refresh(roadmap_row)

    assert len(json.loads(roadmap_row.steps_json)) == len(spec["steps"])


def test_a_roadmap_that_would_lose_a_step_is_left_alone(db, roadmap_row, monkeypatch, caplog):
    spec = next(r for r in SEED_ROADMAPS if r["slug"] == "devops")
    # The database has a step 99 that the code no longer defines. Writing the
    # code's version would drop it - and anybody who completed step 99 would
    # silently have that progress point at nothing.
    extra = {**spec["steps"][0], "step": 99, "title": "A step someone completed"}
    roadmap_row.steps_json = json.dumps([*spec["steps"], extra])
    roadmap_row.title = "Left alone"
    db.commit()

    reconcile_roadmaps(db)
    db.refresh(roadmap_row)

    numbers = {s["step"] for s in json.loads(roadmap_row.steps_json)}
    assert 99 in numbers, "the step that only exists in the DB must survive"
    assert roadmap_row.title == "Left alone", "nothing is written when steps would be lost"


def test_reconcile_is_idempotent(db, roadmap_row):
    reconcile_roadmaps(db)
    db.refresh(roadmap_row)
    first = roadmap_row.steps_json
    reconcile_roadmaps(db)
    db.refresh(roadmap_row)
    assert roadmap_row.steps_json == first


def test_every_seeded_roadmap_has_unique_step_numbers():
    # The append-only guard compares step numbers, so duplicates inside one
    # roadmap would make the comparison meaningless.
    for spec in SEED_ROADMAPS:
        numbers = [s["step"] for s in spec["steps"]]
        assert len(numbers) == len(set(numbers)), f"{spec['slug']} repeats a step number"
        assert numbers == sorted(numbers), f"{spec['slug']} steps are out of order"
