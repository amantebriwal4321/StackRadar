import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "StackRadar API"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "stackradar_db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "stackradar")
    SQLALCHEMY_DATABASE_URI: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"
    
    # GITHUB
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # REDIS / CELERY
    REDIS_HOST: str = os.getenv("REDIS_HOST", "stackradar_redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    CELERY_BROKER_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    CELERY_RESULT_BACKEND: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    
    # MEILISEARCH
    MEILISEARCH_HOST: str = os.getenv("MEILISEARCH_HOST", "http://stackradar_meilisearch:7700")
    MEILISEARCH_KEY: str = os.getenv("MEILI_MASTER_KEY", "masterKey")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # CLERK AUTH
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")

settings = Settings()
