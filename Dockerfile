# Stage 1: Frontend Builder
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/
RUN npm run build:frontend

# Stage 2: Backend Builder
FROM node:20-alpine AS backend-builder
WORKDIR /build
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
RUN npm install --legacy-peer-deps
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
RUN npm run build:backend

# Stage 3: Production Runtime
FROM node:20-alpine AS production
WORKDIR /app

# Instalamos herramientas necesarias
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos los archivos de configuración del monorepo
COPY package.json package-lock.json* ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# 2. INSTALACIÓN LIMPIA de producción (Sin prune, instalamos solo lo necesario)
# Añadimos 'glob' explícitamente por si acaso el monorepo no lo detecta
RUN npm install --omit=dev --legacy-peer-deps && npm install glob

# 3. Copiamos los archivos compilados (dist)
COPY --from=backend-builder /build/packages/backend/dist ./dist
COPY --from=frontend-builder /build/packages/frontend/dist/meetwithfriends/frontend ./public/client

# 4. Aseguramos que las dependencias compartidas estén accesibles
COPY --from=backend-builder /build/packages/shared ./packages/shared

EXPOSE 3000

# Usamos la ruta completa de node para evitar ambigüedades
CMD ["dumb-init", "node", "dist/main.js"]