# =============================================================================
# STAGE 1 — BUILDER
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos solo archivos necesarios primero (mejora cache)
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Instalamos dependencias completas del monorepo
RUN npm install --legacy-peer-deps

# Copiamos el resto del código
COPY . .

# Build backend
RUN npm run build:backend

# =============================================================================
# STAGE 2 — PRODUCTION
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Copiamos SOLO lo necesario del backend
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./package.json

# Instalamos SOLO dependencias de producción del backend
RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
