"""The shared in-memory cache behind the project video verifier.

It once also held a `cache_response` decorator that nothing used, ignored its
own `expiration` argument and keyed on the request-scoped DB session, so it
could never hit. It was deleted; this pins the two helpers that remain and the
one thing callers rely on: a stored `{}` must come back as `{}`, not as absent.
"""

import pytest
from cachetools import TTLCache

from app.core import cache


@pytest.fixture(autouse=True)
def _empty():
    cache._cache.clear()
    yield
    cache._cache.clear()


def test_a_missing_key_reads_as_none():
    assert cache.get_cached("nope") is None


def test_a_stored_value_comes_back():
    cache.set_cached("k", {"title": "x"})
    assert cache.get_cached("k") == {"title": "x"}


def test_a_stored_empty_dict_is_returned_not_confused_with_absent():
    """The verifier caches {} for a dead video id so it is not re-checked."""
    cache.set_cached("dead", {})
    assert cache.get_cached("dead") == {}
    assert cache.get_cached("dead") is not None


def test_a_second_write_replaces_the_first():
    cache.set_cached("k", 1)
    cache.set_cached("k", 2)
    assert cache.get_cached("k") == 2


def test_an_entry_expires_after_the_ttl(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(
        cache, "_cache", TTLCache(maxsize=4, ttl=300, timer=lambda: clock[0])
    )
    cache.set_cached("k", "v")
    clock[0] += 299
    assert cache.get_cached("k") == "v"
    clock[0] += 2
    assert cache.get_cached("k") is None


def test_the_cache_is_bounded():
    for n in range(cache._cache.maxsize + 50):
        cache.set_cached(f"k{n}", n)
    assert len(cache._cache) <= cache._cache.maxsize


def test_the_unused_decorator_is_gone():
    assert not hasattr(cache, "cache_response")
