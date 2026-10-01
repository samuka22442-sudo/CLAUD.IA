# syntax=docker/dockerfile:1
#
# Imagem do Ritmo: um único container serve a API (/api) e o front buildado (PWA).
# Usa Debian "slim" (glibc) em todos os estágios para evitar problemas com binários nativos do Vite/Tailwind no Alpine.

# ---------- 1) build: instala tudo e compila o front (Vite) e o servidor (tsup) ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# Primeiro só os manifestos: a camada de `npm ci` fica em cache enquanto as dependências não mudarem.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci

COPY shared shared
COPY server server
COPY web web
RUN npm run build

# ---------- 2) dependências de PRODUÇÃO do servidor (sem React, Vite, Tailwind, vitest…) ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace=@ritmo/server

# ---------- 3) imagem final ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/migrations ./server/migrations
COPY --from=build /app/web/dist ./web/dist
COPY package.json ./

# Roda sem privilégios de root.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# O servidor aplica as migrações do banco sozinho ao subir.
CMD ["node", "server/dist/index.js"]
