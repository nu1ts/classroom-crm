# ===================================================
# Stage 1: Build the self-contained site from src/
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install project dependencies
COPY package*.json ./
RUN npm ci

# Copy sources needed for the build (esbuild bundle + Tailwind CSS + route pages)
COPY tailwind.config.js ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build the self-contained site into reference/
RUN npm run build:site

# ===================================================
# Stage 2: Production Nginx Server
# ===================================================
FROM nginx:1.27-alpine AS runner

# Clean default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy the built site (path-based routing: routes are subdirectories)
COPY --from=builder /app/reference /usr/share/nginx/html

# Copy custom Nginx configuration
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Install curl for healthcheck probe
RUN apk add --no-cache curl

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
