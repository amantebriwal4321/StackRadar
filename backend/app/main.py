from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import asyncio
from app.services.scheduler import run_scraper_loop

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_scraper_loop())

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def root():
    return {"message": "Welcome to StackRadar MVP API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

from app.api.endpoints import mvp

app.include_router(mvp.router, prefix=settings.API_V1_STR, tags=["mvp"])
