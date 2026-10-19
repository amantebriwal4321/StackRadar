FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY stackradar_mcp ./stackradar_mcp

ENV STACKRADAR_HOST=0.0.0.0
ENV STACKRADAR_PORT=8080

EXPOSE 8080

CMD ["python", "-m", "stackradar_mcp"]
