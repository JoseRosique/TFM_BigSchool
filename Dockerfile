# =============================================================================
# Etapa 1: Builder (Construye todo el Monorepo)
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos absolutamente todo el proyecto
# En monorepos, esto es lo más seguro para que npm workspaces no falle
COPY . .

# Instalamos todas las dependencias (necesitamos las de desarrollo para buildear)
RUN npm install --legacy-peer-deps

# Ejecutamos los comandos de compilación desde la raíz
RUN npm run build:backend
RUN npm run build:frontend

# =============================================================================
# Etapa 2: Production (Imagen ligera para Render)
# =============================================================================
FROM node:20-alpine AS production
WORKDIR /app

# Instalamos dumb-init para un manejo correcto de procesos
RUN apk add --no-cache dumb-init

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# 1. COPIAMOS EL ÁRBOL DE DEPENDENCIAS COMPLETO
# Al copiar el node_modules entero del builder, nos aseguramos de que
# 'zod', 'glob' y los enlaces (symlinks) a @shared no se rompan.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 2. COPIAMOS LOS PAQUETES (Estructura necesaria para los symlinks)
# Es vital copiar la carpeta shared porque el symlink en node_modules apunta allí
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json

# 3. COPIAMOS LOS DIST (Código compilado)
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/frontend/dist/meetwithfriends/frontend ./public/client

EXPOSE 3000

# Iniciamos la aplicación
CMD ["dumb-init", "node", "dist/main.js"]