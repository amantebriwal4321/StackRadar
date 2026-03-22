import redis
from functools import wraps
from app.core.config import settings
import json

# Setup basic sync redis client
redis_client = redis.Redis(
    host=settings.REDIS_HOST, 
    port=settings.REDIS_PORT, 
    db=1, # Use DB 1 for caching, leaving DB 0 for Celery
    decode_responses=True
)

def cache_response(expiration: int = 300):
    """
    Simple decorator to cache FastAPI endpoint responses in Redis.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key based on function name and args for simplicity
            cache_key = f"cache:{func.__name__}:{str(kwargs)}"
            
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                print(f"Redis cache error: {e}")
                
            # Execute original function
            result = func(*args, **kwargs)
            
            # Cache the result if serializable
            try:
                # Handle basic dict/list serializable responses
                # Note: In a real system, you'd serialize SQLAlchemy models properly before caching
                if isinstance(result, (dict, list)):
                    redis_client.setex(cache_key, expiration, json.dumps(result))
            except Exception as e:
                print(f"Redis cache write error: {e}")
                
            return result
        return wrapper
    return decorator
