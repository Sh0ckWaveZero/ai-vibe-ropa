FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]
