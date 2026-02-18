# =============================================================================
# Etapa 1: Builder
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY . .
RUN npm install --legacy-peer-deps

# Construimos AMBOS
RUN npm run build:backend
RUN npm run build:frontend

# =============================================================================
# Etapa 2: Production
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# 1. Copiamos dependencias y el package.json raíz
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 2. Copiamos el código compilado del Backend
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# 3. Copiamos el shared (necesario si tu backend lo importa en runtime)
COPY --from=builder /app/packages/shared ./packages/shared

# 4. Copiamos el Frontend a la carpeta que configuramos en app.module
# Según tu angular.json, el output es: dist/meetwithfriends/frontend
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

# 5. Fix para el error del constructor de Postgres que vimos antes
RUN npm install pg --legacy-peer-deps

EXPOSE 3000
CMD ["dumb-init", "node", "dist/main.js"]