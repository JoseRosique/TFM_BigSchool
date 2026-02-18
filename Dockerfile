# =============================================================================
# Etapa 1: Builder (Construye todo el Monorepo)
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos todo el proyecto
COPY . .

# Instalamos dependencias totales para la compilación
RUN npm install --legacy-peer-deps

# Compilamos backend y frontend
RUN npm run build:backend
RUN npm run build:frontend

# =============================================================================
# Etapa 2: Production (Imagen optimizada para despliegue)
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Herramientas de sistema
RUN apk add --no-cache dumb-init

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos node_modules completo para mantener los workspaces intactos
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 2. Copiamos paquetes locales (necesario para que los symlinks no apunten al vacío)
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# 3. Copiamos el código compilado (Backend y Frontend)
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

# -----------------------------------------------------------------------------
# FIX: Forzamos la instalación de 'pg' en la raíz de producción.
# Esto resuelve el error "this.postgres.Pool is not a constructor" en TypeORM.
# -----------------------------------------------------------------------------
RUN npm install pg --legacy-peer-deps

EXPOSE 3000

# Ejecución con dumb-init para gestionar señales de proceso (SIGTERM, etc.)
CMD ["dumb-init", "node", "dist/main.js"]