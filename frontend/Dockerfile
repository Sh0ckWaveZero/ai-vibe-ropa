# syntax=docker/dockerfile:1.7

FROM node:24.17.0-alpine3.24 AS deps
WORKDIR /app
RUN npm install --global npm@11.19.0
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=ropa-frontend

FROM deps AS build
COPY frontend ./frontend
RUN npm run build --workspace=ropa-frontend

FROM node:24.17.0-alpine3.24 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
RUN rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /app/frontend/build ./build

USER node
EXPOSE 3000
CMD ["node", "build/index.js"]
