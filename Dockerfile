# =============================================================================
# Etapa 1: Builder
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos todo y lo instalamos TODO
COPY . .
RUN npm install --legacy-peer-deps

# Compilamos ambos
RUN npm run build:backend
RUN npm run build:frontend

# --- COMENTAMOS EL PRUNE PARA EVITAR QUE BORRE ZOD ---
# RUN npm prune --production --legacy-peer-deps

# =============================================================================
# Etapa 2: Production
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos TODOS los node_modules del builder
# Esto garantiza que 'zod', 'pg' y todos los demás estén ahí
COPY --from=builder /app/node_modules ./node_modules

# 2. Copiamos los dist del backend
COPY --from=builder /app/packages/backend/dist ./dist

# 3. Copiamos archivos de configuración
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# 4. Copiamos el shared
COPY --from=builder /app/packages/shared ./packages/shared

# 5. Copiamos el frontend
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]