# StackRadar

StackRadar is an AI-powered platform that analyzes emerging technologies by scraping GitHub repositories, developer communities, and tech blogs.

## Tech Stack

Frontend
Next.js
Tailwind CSS
Recharts

Backend
FastAPI
Celery
Redis
PostgreSQL

Infrastructure
Docker
Kubernetes

## Run Locally

docker-compose up --build 
 .\venv\Scripts\Activate.ps1 ##to set the virtual enviornment
 uvicorn app.main:app --reload ##to ru the backend in virtual enviornment
 npm run dev ##to ru the frontend in virtual enviornment
