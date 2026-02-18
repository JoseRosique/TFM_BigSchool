# =============================================================================
# Stage 1 y 2, pero con limpieza al final del Stage 2
# =============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/
RUN npm run build:frontend 2>&1

FROM node:20-alpine AS backend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
RUN npm run build:backend 2>&1
# LIMPIEZA: Eliminamos herramientas de desarrollo para dejar solo lo necesario
RUN npm prune --omit=dev --legacy-peer-deps

# =============================================================================
# Stage 3: Production Runtime (Sin instalaciones, solo copias)
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# 1. En lugar de instalar, COPIAMOS los node_modules ya limpios del constructor
# Esto garantiza que 'glob' y todas las dependencias del monorepo estén ahí.
COPY --from=backend-builder /build/node_modules ./node_modules
COPY --from=backend-builder /build/package.json ./package.json
COPY --from=backend-builder /build/packages/backend/package*.json ./packages/backend/

# 2. Copiamos los archivos compilados
COPY --from=backend-builder /build/packages/backend/dist ./dist
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

# Usamos la ruta completa para evitar fallos de resolución
CMD ["dumb-init", "node", "dist/main.js"]