# ============================================================
# Dockerfile — Tomo Verso Editora (Next.js + SQLite)
# Build: docker build -t tomoverso .
# ============================================================

FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app

# ---- Estágio 1: instalar dependências ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Estágio 2: build ----
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Estágio 3: runtime ----
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# .next/standalone contém o servidor compilado + node_modules
COPY --from=builder /app/.next/standalone ./

# Assets estáticos
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Seed do banco (usado em cold start)
COPY --from=builder /app/data/tomoverso.seed.db.gz ./data/
COPY --from=builder /app/data/tomoverso.seed.db ./data/ 2>/dev/null || true

# Uploads (imagens de capa etc)
COPY --from=builder /app/public/uploads ./public/uploads 2>/dev/null || true

RUN chown -R nextjs:nodejs /app
USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
CMD ["node", "server.js"]
