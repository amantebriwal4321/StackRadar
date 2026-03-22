# StackRadar Deployment Instructions

These instructions cover the process for deploying the StackRadar full-stack application to a production environment.

## Prerequisites
- A Kubernetes cluster (EKS, GKE, AKS, or local K3s)
- `kubectl` configured
- Docker registry access (Docker Hub, AWS ECR, etc.)
- Managed databases (e.g., Supabase/Neon for Postgres, Upstash for Redis)

## 1. Local Development
1. Clone the repository.
2. Run `docker-compose up -d` in the root directory to spin up local PostgreSQL, Redis, and Meilisearch.
3. In `backend/`, copy `.env.example` (if present) to `.env` and set necessary API keys. Run `alembic upgrade head` then `uvicorn app.main:app --reload`.
4. In `frontend/`, run `npm install` and then `npm run dev`.

## 2. Docker Image Build
```bash
# Build Backend
cd backend
docker build -t your-registry/stackradar-backend:latest .
docker push your-registry/stackradar-backend:latest

# Build Frontend
cd ../frontend
docker build -t your-registry/stackradar-frontend:latest .
docker push your-registry/stackradar-frontend:latest
```

## 3. Kubernetes Deployment

### Secrets Configuration
Create a secret holding your production keys:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: stackradar-secrets
type: Opaque
stringData:
  POSTGRES_PASSWORD: "your-strong-db-password"
  CLERK_SECRET_KEY: "sk_live_..."
  OPENAI_API_KEY: "sk-..."
  PINECONE_API_KEY: "..."
  MEILI_MASTER_KEY: "..."
```

Apply the secrets:
```bash
kubectl apply -f secrets.yaml
```

### Deploy the Application
Navigate to the `infrastructure/kubernetes` folder:
```bash
kubectl apply -f deployment.yaml
```

### Verify Deployment
```bash
kubectl get pods
kubectl get services
```

The `stackradar-frontend-svc` will provision an external LoadBalancer IP which you can use to access the application. Note: In a real production scenario, use an Ingress controller pointing to the services instead of LoadBalancer for better routing and SSL termination.

## 4. Background Workers (Celery)
For the background tasks (scraping, AI embedding), deploy a separate worker deployment referencing the backend image but running the celery worker command:
`celery -A app.worker.celery_app worker --loglevel=info`
