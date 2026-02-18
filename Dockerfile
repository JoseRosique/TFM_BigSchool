# =============================================================================
# Etapa 1: Builder
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos todo el monorepo para el build
COPY . .
RUN npm install --legacy-peer-deps

# Construimos backend y frontend
RUN npm run build:backend
RUN npm run build:frontend

# Limpiamos dependencias de desarrollo para que la imagen final sea ligera
# Pero lo hacemos aquí, en el builder, donde tenemos todo el contexto
RUN npm prune --production --legacy-peer-deps

# =============================================================================
# Etapa 2: Production
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos TODA la carpeta node_modules ya filtrada por el prune
# Esto incluye zod, pg, nestjs, etc., sin riesgo de que se borren
COPY --from=builder /app/node_modules ./node_modules

# 2. Copiamos el código compilado del Backend
COPY --from=builder /app/packages/backend/dist ./dist

# 3. Copiamos los package.json para que Node identifique los paquetes
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# 4. Copiamos el shared (importante si no está inyectado en el bundle)
COPY --from=builder /app/packages/shared ./packages/shared

# 5. Copiamos el Frontend a la carpeta que configuramos en app.module
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

# Usamos dumb-init para gestionar correctamente los procesos en Docker
CMD ["dumb-init", "node", "dist/main.js"]