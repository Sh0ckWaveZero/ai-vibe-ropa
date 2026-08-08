# syntax=docker/dockerfile:1.7

FROM node:24.17.0-alpine3.24 AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma

FROM base AS deps
RUN npm ci && npx prisma generate

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM deps AS production-deps
RUN npm prune --omit=dev && npm cache clean --force

FROM node:24.17.0-alpine3.24 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache su-exec \
  && mkdir -p /app/uploads \
  && chown node:node /app/uploads \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
