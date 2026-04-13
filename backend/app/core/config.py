import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Force loading .env file variables directly into os.environ
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "StackRadar API"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "stackradar_db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "stackradar")
    
    # Check if we are outside Docker. If so, fallback to SQLite to prevent "cannot translate host name" error.
    IS_DOCKER: bool = os.path.exists("/.dockerenv") or os.getenv("DOCKER_ENV", "0") == "1"
    SQLALCHEMY_DATABASE_URI: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}" if IS_DOCKER else "sqlite:///./test.db"
    
    
    # GITHUB
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # GROQ (for sentiment analysis)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # REDIS / CELERY
    REDIS_HOST: str = os.getenv("REDIS_HOST", "stackradar_redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    CELERY_BROKER_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    CELERY_RESULT_BACKEND: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    
    # MEILISEARCH
    MEILISEARCH_HOST: str = os.getenv("MEILISEARCH_HOST", "http://stackradar_meilisearch:7700")
    MEILISEARCH_KEY: str = os.getenv("MEILI_MASTER_KEY", "masterKey")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", ""),
    ]
    
    # CLERK AUTH
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")

settings = Settings()
