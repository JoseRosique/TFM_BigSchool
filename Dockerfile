# Multi-stage Dockerfile: Frontend + Backend unified deployment

# Stage 1: Frontend Builder
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copiamos TODOS los package.json primero
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/frontend/package*.json ./packages/frontend/

# Instalamos dependencias (esto crea los links internos del monorepo)
RUN npm install --legacy-peer-deps

# AHORA copiamos el código fuente (Shared debe estar antes que Frontend)
COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/

# Build
RUN npm run build:frontend 2>&1

# Stage 2: Backend Builder
FROM node:20-alpine AS backend-builder
WORKDIR /build

# Copiamos TODOS los package.json
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Instalamos dependencias
RUN npm install --legacy-peer-deps

# Copiamos código fuente
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/

# Build
RUN npm run build:backend 2>&1

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

# Set Node environment to production
ENV NODE_ENV=production

# Copy package files for production dependencies installation
COPY packages/backend/package*.json ./packages/backend/
COPY package.json package-lock.json* ./

# Install production dependencies only (exclude dev dependencies)
RUN npm install --production --legacy-peer-deps && \
    npm install --workspace=@meetwithfriends/backend --production

# Copy compiled backend from builder stage
COPY --from=backend-builder /build/packages/backend/dist ./dist

# Copy compiled frontend from builder stage
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

# Expose port (3000 for NestJS API + static frontend)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start server
CMD ["node", "dist/main"]
