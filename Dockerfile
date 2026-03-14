# Dockerfile optimizado para Next.js en Google Cloud Run

FROM node:20-alpine AS base

# 1. Instalar dependencias necesarias para Puppeteer y libc6-compat para Next.js
FROM base AS deps
RUN apk add --no-cache \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Saltar descarga de Chrome para Puppeteer (usamos Chromium en Alpine)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependencias basadas en package-lock.json
COPY package*.json ./
RUN npm ci

# 2. Construir la aplicación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED 1

# NEXT_PUBLIC_ vars are inlined at build time — must be passed as ARG
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY

RUN npm run build


# 3. Imagen de producción (Runner)
FROM base AS runner
WORKDIR /app

# Instalar Chromium en la imagen final para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Configuración de usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public

# Aprovechar el output standalone de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run inyecta la variable PORT automáticamente
ENV PORT 8080
EXPOSE 8080

# Forzar el hostname a 0.0.0.0 para que Cloud Run pueda rutear el tráfico
ENV HOSTNAME "0.0.0.0"

# server.js es generado por next build en modo standalone
CMD ["node", "server.js"]
