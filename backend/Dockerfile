# ==============================================================================
# Atmiya Dosa Hub - Production FastAPI Backend Dockerfile
# Optimized for Google Cloud Run (Serverless Container Platform)
# ==============================================================================

FROM python:3.11-slim as base

# 1. Environment Configurations
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PORT=8080

WORKDIR /app

# 2. Install System Dependencies & Security Patches
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 3. Create unprivileged non-root user (Container Hardening)
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/sh -m appuser

# 4. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copy Application Source Code
COPY app ./app
COPY run.py .

# 6. Change ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# 7. Cloud Run Ingress Port
EXPOSE 8080

# 8. Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# 9. Launch FastAPI POS Engine via Uvicorn
# Cloud Run dynamically assigns the PORT environment variable
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2 --proxy-headers --forwarded-allow-ips="*"
