from functools import wraps
from cachetools import TTLCache
import json

# In-memory TTL cache — no Redis required
# Max 256 entries, 5-minute TTL
_cache = TTLCache(maxsize=256, ttl=300)

def cache_response(expiration: int = 300):
    """
    Decorator to cache FastAPI endpoint responses in-memory.
    Works without any external service (Redis, etc.)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(kwargs)}"
            
            # Check cache
            cached = _cache.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute and cache
            result = func(*args, **kwargs)
            if isinstance(result, (dict, list)):
                _cache[cache_key] = result
                
            return result
        return wrapper
    return decorator

def clear_cache():
    """Clear all cached entries."""
    _cache.clear()
