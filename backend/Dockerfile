# syntax=docker/dockerfile:1.7

FROM node:24.17.0-alpine3.24 AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend/prisma.config.ts ./backend/prisma.config.ts
COPY backend/prisma ./backend/prisma

FROM base AS deps
RUN npm ci --workspace=ropa-backend \
  && DATABASE_URL='postgresql://generate-only:generate-only@localhost:5432/generate-only' \
    npm run prisma:generate --workspace=ropa-backend

FROM deps AS build
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN npm run build --workspace=ropa-backend

FROM deps AS production-deps
RUN npm prune --omit=dev --workspace=ropa-backend \
  && npm cache clean --force

FROM node:24.17.0-alpine3.24 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache su-exec \
  && mkdir -p /app/uploads \
  && chown node:node /app/uploads \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY --chown=node:node backend/package.json ./package.json
COPY --chown=node:node backend/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node backend/prisma ./prisma
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
