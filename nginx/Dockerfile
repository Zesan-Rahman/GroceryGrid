# syntax=docker/dockerfile:1

# ─── Stage 1: Build the frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build          # emits to /frontend/dist

# ─── Stage 2: nginx runtime ──────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Drop the default config and replace with ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/grocerygrid.conf

# Copy the compiled frontend assets
COPY --from=frontend-builder /frontend/dist /app/www

EXPOSE 80
