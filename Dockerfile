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

RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos TODOS los package.json (Raíz, Shared y Backend)
# Esto es vital para que npm resuelva las dependencias del monorepo
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# 2. Instalamos TODAS las dependencias de producción del monorepo
# Usamos --omit=dev para ignorar herramientas de desarrollo y ahorrar espacio
RUN npm install --omit=dev --legacy-peer-deps

# 3. Copiamos los archivos compilados que ya tenemos de los builders
COPY --from=backend-builder /build/packages/backend/dist ./dist
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

# Usamos dumb-init para gestionar el proceso node
CMD ["dumb-init", "node", "dist/main.js"]
