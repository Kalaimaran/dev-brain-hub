# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run injects $POnRT (default 8080); nginx listens on it via envsubst
EXPOSE 8080

# Use envsubst to inject $PORT at container start, then run nginx
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/app.conf > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
