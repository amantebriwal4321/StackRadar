"""
API Dependencies — shared utilities for endpoint injection.

Auth is not implemented in v1. This module provides the canonical
database session dependency used across all endpoints.
"""

from app.db.session import get_db  # noqa: F401 — re-export for convenience
