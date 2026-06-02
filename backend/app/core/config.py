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
    
    # Use DATABASE_URL if explicitly set (e.g., by docker-compose), otherwise auto-detect
    IS_DOCKER: bool = os.path.exists("/.dockerenv") or os.getenv("DOCKER_ENV", "0") == "1"
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}" if IS_DOCKER else "sqlite:///./test.db"
    )
    
    
    # GITHUB
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # GROQ (for sentiment analysis)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", ""),
    ]

settings = Settings()

