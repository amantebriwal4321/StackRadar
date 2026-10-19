#!/bin/sh
# Deploy the API and the MCP server to Cloud Run.
# Requires GCP_PROJECT_ID, GCP_REGION, and GCP_SA_KEY.
# GCP_SA_KEY may be a file path, raw JSON, or base64 JSON.
# The script never prints the key.
set -eu

KEY=/tmp/gcp-sa.json
umask 077
trap 'rm -f "$KEY"' EXIT

if [ -z "${GCP_PROJECT_ID:-}" ] || [ -z "${GCP_REGION:-}" ] || [ -z "${GCP_SA_KEY:-}" ]; then
  echo "Cloud Run deploy skipped. GCP_PROJECT_ID, GCP_REGION, or GCP_SA_KEY is unset."
  exit 0
fi

if [ -f "$GCP_SA_KEY" ]; then
  cp "$GCP_SA_KEY" "$KEY"
elif printf '%s' "$GCP_SA_KEY" | grep -q 'private_key'; then
  printf '%s\n' "$GCP_SA_KEY" > "$KEY"
else
  if ! printf '%s' "$GCP_SA_KEY" | base64 -d > "$KEY" 2>/dev/null; then
    echo "GCP_SA_KEY was not a file path, a JSON key, or base64."
    exit 1
  fi
fi

if ! grep -q 'private_key' "$KEY"; then
  echo "Decoded GCP_SA_KEY has no private_key field."
  exit 1
fi

gcloud auth activate-service-account --key-file="$KEY"
gcloud config set project "$GCP_PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

i=0
while [ "$i" -lt 6 ]; do
  if gcloud artifacts repositories describe stackradar --location="$GCP_REGION" >/dev/null 2>&1; then
    break
  fi
  if gcloud artifacts repositories create stackradar \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="StackRadar images"; then
    break
  fi
  i=$((i + 1))
  sleep 5
done

SHORT="${CI_COMMIT_SHORT_SHA:-local}"
ROOT="${CI_PROJECT_DIR:-.}"
API_IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/stackradar/api:$SHORT"
MCP_IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/stackradar/mcp:$SHORT"

gcloud builds submit "$ROOT/backend" --tag "$API_IMAGE"
gcloud run deploy stackradar \
  --image "$API_IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 2 \
  --set-env-vars "RUN_SCRAPER_INLINE=0,DATABASE_URL=sqlite:////tmp/stackradar.db"

API_URL=$(gcloud run services describe stackradar --region "$GCP_REGION" --format='value(status.url)')

gcloud builds submit "$ROOT/mcp" --tag "$MCP_IMAGE"
gcloud run deploy stackradar-mcp \
  --image "$MCP_IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 2 \
  --set-env-vars "STACKRADAR_API_URL=https://stackradar-backend-kbxl.onrender.com,STACKRADAR_HOST=0.0.0.0,STACKRADAR_PORT=8080"

MCP_URL=$(gcloud run services describe stackradar-mcp --region "$GCP_REGION" --format='value(status.url)')

ENV_FILE="${ROOT}/deploy.env"
printf 'CLOUD_RUN_URL=%s\nMCP_URL=%s\n' "$API_URL" "$MCP_URL" > "$ENV_FILE"
echo "API $API_URL"
echo "MCP $MCP_URL"
