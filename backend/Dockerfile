FROM node:22-alpine AS base
WORKDIR /app
RUN npm install --global npm@11.19.0
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend/prisma ./backend/prisma

FROM base AS deps
RUN npm ci --workspace=ropa-backend
RUN DATABASE_URL='postgresql://generate-only:generate-only@localhost:5432/generate-only' \
  npm run prisma:generate --workspace=ropa-backend

FROM deps AS build
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN npm run build --workspace=ropa-backend

FROM deps AS production-deps
RUN npm prune --omit=dev --workspace=ropa-backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps /app/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/prisma ./prisma
COPY --from=build /app/backend/dist ./dist
COPY backend/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
