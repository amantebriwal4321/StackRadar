"""The metadata every table is registered on.

Alembic's env.py, main.py (create_all) and migrate.py import Base from here
rather than from base_class, because this module also imports the models:
defining a model class is what adds its table to Base.metadata. Without the
import below, create_all would build an empty schema and alembic
--autogenerate would propose dropping every table.
"""

import app.models.all_models  # noqa: F401  - imported for its side effect, see above
from app.db.base_class import Base

__all__ = ["Base"]
