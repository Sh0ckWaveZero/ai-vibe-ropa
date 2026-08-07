FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma

FROM base AS deps
RUN npm install
RUN npx prisma generate

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
