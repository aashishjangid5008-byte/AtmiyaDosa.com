# ==============================================================================
# Atmiya Dosa Hub - Production Frontend Dockerfile
# Multi-stage build serving React + Vite on Google Cloud Run via Nginx
# ==============================================================================

# Stage 1: Build Static Assets
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite SPA with production optimizations
RUN npm run build

# Stage 2: Serve via High-Performance Nginx Alpine
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
