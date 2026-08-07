#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding default roles, permissions, departments and admin user..."
node dist/db/seed/index.js

echo "Starting server..."
exec node dist/index.js
