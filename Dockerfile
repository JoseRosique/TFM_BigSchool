# =============================================================================
# 1️⃣ Builder Stage
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar package files primero (mejor cache)
COPY package*.json ./
COPY packages/*/package*.json ./packages/

# Instalar TODAS las dependencias (incluye dev)
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Build backend y frontend
RUN npm run build:backend
RUN npm run build:frontend


# =============================================================================
# 2️⃣ Production Stage
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Copiar solo package.json raíz
COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm install --omit=dev --legacy-peer-deps

# Copiar backend compilado
COPY --from=builder /app/packages/backend/dist ./dist

# Copiar frontend compilado (estático)
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
