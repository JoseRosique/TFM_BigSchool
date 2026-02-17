# Multi-stage Dockerfile: Frontend + Backend unified deployment

# =============================================================================
# Stage 1: Frontend Builder
# =============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy shared package dependencies
COPY packages/shared/package*.json ./packages/shared/
COPY packages/frontend/package*.json ./packages/frontend/
COPY package.json package-lock.json* ./

# Install dependencies (with legacy peer deps for Angular compatibility)
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY packages/frontend/ ./packages/frontend/
COPY packages/shared/ ./packages/shared/

# Build Angular app for production
RUN npm run build:frontend 2>&1

# =============================================================================
# Stage 2: Backend Builder
# =============================================================================
FROM node:20-alpine AS backend-builder
WORKDIR /build

# Copy shared package dependencies
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy backend source code
COPY packages/backend/ ./packages/backend/
COPY packages/shared/ ./packages/shared/

# Build NestJS app
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
# Angular compiled output goes to dist/browser by default
COPY --from=frontend-builder /build/packages/frontend/dist/browser ./public/client

# Copy environment file (optional, will be overridden by Render)
COPY packages/backend/.env.example .env

# Expose port (3000 for NestJS API + static frontend)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start server
CMD ["node", "dist/main"]
