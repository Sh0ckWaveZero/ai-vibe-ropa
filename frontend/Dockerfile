FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install --global npm@11.19.0
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=ropa-frontend

FROM deps AS build
COPY frontend ./frontend
RUN npm run build --workspace=ropa-frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=build /app/frontend/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]
