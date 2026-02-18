# Multi-stage Dockerfile: Frontend + Backend unified deployment

# Stage 1: Frontend Builder
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/
RUN npm run build:frontend 2>&1

# Stage 2: Backend Builder
FROM node:20-alpine AS backend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
RUN npm run build:backend 2>&1

# --- NUEVO PASO DE LIMPIEZA ---
# Eliminamos las dependencias de desarrollo AQUÍ, donde el monorepo está completo.
RUN npm prune --omit=dev --legacy-peer-deps

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Instalamos dumb-init (Alpine lo pone en /usr/bin/dumb-init)
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos node_modules limpios y package.json
COPY --from=backend-builder /build/node_modules ./node_modules
COPY --from=backend-builder /build/package.json ./package.json

# 2. Copiamos los archivos compilados
COPY --from=backend-builder /build/packages/backend/dist ./dist
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

# Exponemos el puerto
EXPOSE 3000

# Usamos la llamada directa. 'dumb-init' sin ruta completa para que 
# el sistema lo encuentre automáticamente en el PATH.
CMD ["dumb-init", "node", "dist/main.js"]