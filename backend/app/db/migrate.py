"""
Additive column reconciliation for the auto-create boot path.

`Base.metadata.create_all()` is what actually builds this app's schema on
startup (see main.startup_event). It creates missing tables, but it will not
touch a table that already exists — so adding a column to a model leaves every
existing SQLite/Postgres database one query away from
`OperationalError: no such column`.

This walks the declarative metadata, compares it against the live database, and
issues `ALTER TABLE ... ADD COLUMN` for anything missing. Deliberately additive
only: it never drops, renames, or retypes a column, so it cannot destroy data.
Anything beyond adding a nullable column is Alembic's job.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from loguru import logger

from app.db.base import Base


def ensure_columns(engine: Engine) -> list[str]:
    """Add any model columns missing from the live tables. Returns what it added."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added: list[str] = []

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue  # create_all already handled it
        live_cols = {c["name"] for c in inspector.get_columns(table.name)}

        for column in table.columns:
            if column.name in live_cols:
                continue

            # A NOT NULL column with no default can't be added to a table with
            # existing rows. Skip loudly rather than crash the boot.
            if not column.nullable and column.default is None and column.server_default is None:
                logger.warning(
                    f"Schema drift: {table.name}.{column.name} is missing and NOT NULL "
                    f"with no default — needs a real Alembic migration. Skipping."
                )
                continue

            ddl = column.type.compile(engine.dialect)
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {column.name} {ddl}'))
                added.append(f"{table.name}.{column.name}")
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Could not add {table.name}.{column.name}: {e}")

    if added:
        logger.info(f"Schema reconcile: added {len(added)} column(s) -> {', '.join(added)}")
    return added
