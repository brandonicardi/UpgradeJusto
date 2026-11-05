# syntax=docker/dockerfile:1

# Etapa 1: dependencias completas + next build.
# node:24.14.0-slim satisface engines de package.json (node >=24.14.0 <25).
FROM node:24.14.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
# next-env.d.ts no se copia: está gitignoreado y next build lo genera solo.
COPY next.config.ts postcss.config.mjs tsconfig.json server.mjs ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
RUN npm run build

# Etapa 2: runtime mínimo del servidor propio (server.mjs + .next + deps de producción).
# server.mjs importa ./lib/*.ts por type-stripping de Node 24, así que lib/ va en la final.
# public/ lo sirve Next en runtime; next.config.ts define las cabeceras de /shares.
FROM node:24.14.0-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/.next ./.next
COPY next.config.ts server.mjs ./
COPY lib ./lib
COPY public ./public
# Escucha 0.0.0.0 dentro del contenedor vía UJ_WEB_HOST; el puerto lo publica el backend.
CMD ["node", "server.mjs"]
