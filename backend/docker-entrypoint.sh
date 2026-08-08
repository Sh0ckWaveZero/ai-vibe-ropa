#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"

# Empty named volumes inherit ownership from the image, but older deployments
# may already have a root-owned uploads volume. Repair only its top-level
# directory, then run migrations and the application as the unprivileged user.
if [ "$(id -u)" = '0' ]; then
  mkdir -p "$UPLOAD_DIR"
  chown node:node "$UPLOAD_DIR"
  exec su-exec node "$0" "$@"
fi

# Compose passes connection parts separately for compatibility with Apple
# container-compose. Build a correctly escaped Prisma URL at runtime so
# passwords containing URL-reserved characters remain valid.
if [ -z "${DATABASE_URL:-}" ]; then
  : "${POSTGRES_USER:?POSTGRES_USER is required}"
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
  : "${POSTGRES_HOST:?POSTGRES_HOST is required}"
  : "${POSTGRES_PORT:?POSTGRES_PORT is required}"
  : "${POSTGRES_DB:?POSTGRES_DB is required}"

  DATABASE_URL="$(node -e '
    const env = process.env;
    const user = encodeURIComponent(env.POSTGRES_USER);
    const password = encodeURIComponent(env.POSTGRES_PASSWORD);
    const database = encodeURIComponent(env.POSTGRES_DB);
    process.stdout.write(`postgresql://${user}:${password}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${database}?schema=public`);
  ')"
  export DATABASE_URL
fi

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding default roles, permissions, departments and admin user..."
node dist/db/seed/index.js

echo "Starting server..."
exec node dist/index.js
