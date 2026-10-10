"""ensure_columns: additive schema reconciliation on an old database.

create_all never adds a column to a table that already exists, so ensure_columns
ALTERs it in. It must be strictly additive - it runs against the production
database on every boot - and the columns it adds must behave like the model says
they do: ALTER TABLE ADD COLUMN carries neither NOT NULL nor the model's
`default=`, so every pre-existing row used to read NULL where the model promised
0 / False.

Each test builds its own throwaway SQLite database.
"""

import tempfile
from pathlib import Path

import pytest
from sqlalchemy import Boolean, Column, Integer, String, Table, create_engine, text

import app.models.all_models  # noqa: F401
from app.db.base import Base
from app.db.migrate import ensure_columns
from app.models.all_models import Tool


@pytest.fixture
def engine():
    path = Path(tempfile.mkdtemp(prefix="stackradar-mig-")) / "mig.db"
    eng = create_engine(f"sqlite:///{path.as_posix()}")
    yield eng
    eng.dispose()


def columns(engine, table):
    with engine.connect() as c:
        return {row[1] for row in c.execute(text(f"PRAGMA table_info({table})"))}


@pytest.fixture
def old_tools_table(engine):
    """A `tools` table as it was before most columns existed, holding one row."""
    with engine.begin() as c:
        c.execute(text("CREATE TABLE tools (id INTEGER PRIMARY KEY, slug VARCHAR, name VARCHAR, legacy_note VARCHAR)"))
        c.execute(text("INSERT INTO tools (id, slug, name, legacy_note) VALUES (1, 'react', 'React', 'keep me')"))
    return engine


def test_every_missing_model_column_is_added(old_tools_table):
    added = ensure_columns(old_tools_table)
    model_cols = {c.name for c in Tool.__table__.columns}
    assert columns(old_tools_table, "tools") >= model_cols
    assert "tools.hn_count" in added and "tools.jobs_mentions" in added


def test_existing_data_and_unknown_columns_are_left_alone(old_tools_table):
    ensure_columns(old_tools_table)
    with old_tools_table.connect() as c:
        row = c.execute(text("SELECT slug, name, legacy_note FROM tools")).one()
    assert tuple(row) == ("react", "React", "keep me")
    assert "legacy_note" in columns(old_tools_table, "tools"), "it must never drop a column"


def test_a_second_run_adds_nothing(old_tools_table):
    ensure_columns(old_tools_table)
    assert ensure_columns(old_tools_table) == []


def test_old_rows_receive_the_models_scalar_defaults(old_tools_table):
    ensure_columns(old_tools_table)
    with old_tools_table.connect() as c:
        row = c.execute(text("SELECT hn_count, devto_count, score, is_entry_point FROM tools")).one()
    assert tuple(row) == (0, 0, 0.0, 0)


def test_columns_with_no_default_stay_null_meaning_not_measured(old_tools_table):
    ensure_columns(old_tools_table)
    with old_tools_table.connect() as c:
        row = c.execute(
            text("SELECT jobs_mentions, jobs_sample, jobs_period, latest_version, latest_release_at FROM tools")
        ).one()
    assert tuple(row) == (None, None, None, None, None)


def test_a_backfill_does_not_overwrite_a_value_that_is_already_there(old_tools_table):
    ensure_columns(old_tools_table)
    with old_tools_table.begin() as c:
        c.execute(text("UPDATE tools SET hn_count = 9"))
    # Simulate a later boot where the column already exists.
    assert ensure_columns(old_tools_table) == []
    with old_tools_table.connect() as c:
        assert c.execute(text("SELECT hn_count FROM tools")).scalar() == 9


def test_a_table_that_does_not_exist_yet_is_left_to_create_all(engine):
    assert ensure_columns(engine) == []
    assert columns(engine, "tools") == set()


# --- a throwaway table registered on the shared metadata -----------------------------


@pytest.fixture
def probe_table():
    table = Table(
        "mig_probe",
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("flag", Boolean, nullable=False, default=False),
        Column("label", String, nullable=False),  # NOT NULL, no default: unaddable
        Column("note", String, nullable=True),
    )
    yield table
    Base.metadata.remove(table)


def test_a_not_null_column_with_no_default_is_skipped_not_fatal(engine, probe_table):
    with engine.begin() as c:
        c.execute(text("CREATE TABLE mig_probe (id INTEGER PRIMARY KEY)"))
        c.execute(text("INSERT INTO mig_probe (id) VALUES (1)"))

    added = ensure_columns(engine)

    assert "mig_probe.label" not in added
    assert "label" not in columns(engine, "mig_probe")
    assert {"mig_probe.flag", "mig_probe.note"} <= set(added)


def test_a_boolean_default_is_backfilled_as_false(engine, probe_table):
    with engine.begin() as c:
        c.execute(text("CREATE TABLE mig_probe (id INTEGER PRIMARY KEY)"))
        c.execute(text("INSERT INTO mig_probe (id) VALUES (1), (2)"))
    ensure_columns(engine)
    with engine.connect() as c:
        assert [r[0] for r in c.execute(text("SELECT flag FROM mig_probe ORDER BY id"))] == [0, 0]
