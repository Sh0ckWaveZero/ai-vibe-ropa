import dotenv from 'dotenv';
import { execSync } from 'node:child_process';

// Runs once, in its own process, before any test worker starts.
export default async function globalSetup() {
  dotenv.config({ path: '.env.test', override: true });
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });

  const { seedBaseData } = await import('../db/seed/seedBaseData.js');
  const { prisma } = await import('../db/prisma.js');
  await seedBaseData();
  await prisma.$disconnect();
}
