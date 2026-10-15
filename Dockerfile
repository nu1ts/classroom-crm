# ===================================================
# Stage 1: Build CSS with Tailwind
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install project dependencies
COPY package*.json ./
RUN npm ci

# Copy sources needed for Tailwind CSS compilation
COPY tailwind.config.js ./
COPY src/ ./src/
COPY reference/ ./reference/

# Compile production CSS
RUN npm run build

# ===================================================
# Stage 2: Production Nginx Server
# ===================================================
FROM nginx:1.27-alpine AS runner

# Clean default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled application and sources
COPY --from=builder /app/reference /usr/share/nginx/html/reference
COPY --from=builder /app/src /usr/share/nginx/html/src

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install curl for healthcheck probe
RUN apk add --no-cache curl

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
