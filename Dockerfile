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

# Instalamos dumb-init pero lo usaremos de forma más directa
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# Copiamos solo lo esencial
COPY package.json package-lock.json* ./
COPY packages/backend/package*.json ./packages/backend/

# Instalamos dependencias y limpiamos cache para ahorrar espacio
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copiamos los archivos compilados
COPY --from=backend-builder /build/packages/backend/dist ./dist
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

# Exponemos el puerto
EXPOSE 3000

# Cambiamos la forma de arrancar para que sea más compatible
# Usamos dumb-init directamente en el comando
CMD ["dumb-init", "node", "dist/main.js"]
