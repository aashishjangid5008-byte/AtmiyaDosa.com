# ==============================================================================
# Atmiya Dosa Hub POS - Unified Production Dockerfile
# Optimized for Google Cloud Run (Serverless Container Platform)
# Builds React+Vite Frontend & Serves via FastAPI Asynchronous Engine on $PORT
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React + Vite Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy frontend source and build static bundle
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Backend & Web Server
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS production

# Environment configuration
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    ENVIRONMENT=production \
    PORT=8080 \
    FRONTEND_DIST=/app/frontend/dist

WORKDIR /app

# Install system dependencies (curl for healthchecks, security certificates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged non-root user (Container Security Hardening)
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/sh -m appuser

# Install backend Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/app ./app
COPY backend/run.py ./run.py

# Copy compiled frontend assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Create uploads directory and ensure correct permissions
RUN mkdir -p /app/frontend/public/uploads /app/uploads && \
    chown -R appuser:appgroup /app

USER appuser

# Cloud Run dynamic ingress port
EXPOSE 8080

# Healthcheck for Cloud Run / Docker engine
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Launch FastAPI via Uvicorn with proxy headers enabled for Google Cloud Run load balancers
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips="*"
