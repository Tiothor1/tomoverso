# ============================================================
# Dockerfile — Tomo Verso Editora (Next.js + SQLite)
# Build: docker build -f infra/Dockerfile -t tomoverso .
# ============================================================

FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

# ---- Estágio 1: instalar dependências ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Estágio 2: build ----
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN NEXT_STANDALONE=1 npm run build

# ---- Estágio 3: runtime ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat wget
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# .next/standalone contém o servidor compilado + node_modules
COPY --from=builder /app/.next/standalone ./

# Assets estáticos
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Seed comprimido do banco. O app descompacta para DB_DIR=/data no primeiro start.
COPY --from=builder /app/data/tomoverso.seed.db.gz ./data/tomoverso.seed.db.gz

RUN mkdir -p /data && chown -R nextjs:nodejs /app /data
USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DB_DIR=/data

EXPOSE 3000
CMD ["node", "server.js"]
