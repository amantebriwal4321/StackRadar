from cachetools import TTLCache

# In-memory TTL cache, no Redis required. Max 256 entries, 5-minute TTL, shared
# by every caller of get_cached/set_cached.
#
# A `cache_response` endpoint decorator used to live here. Nothing used it, it
# ignored its own `expiration` argument, and it keyed on every kwarg - including
# the request-scoped DB session - so it could never have produced a hit. Deleted
# rather than left as something that looks like a working cache.
_cache = TTLCache(maxsize=256, ttl=300)


def get_cached(key: str):
    """Read one value. Returns None when absent OR expired.

    Callers that need to distinguish "absent" from "cached a falsy value"
    should store a sentinel — the project walkthrough verifier caches an empty
    dict for a dead video id so it is not re-checked on every request.
    """
    return _cache.get(key)


def set_cached(key: str, value) -> None:
    """Write one value under the module's shared TTL."""
    _cache[key] = value
