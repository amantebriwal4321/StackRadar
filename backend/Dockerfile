FROM python:3.10-slim

WORKDIR /app

# Ensure dependencies are up to date
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Default production start. docker-compose overrides this with its own `command:`;
# hosted platforms (Render/Railway/Fly/K8s) run it as-is and inject $PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
