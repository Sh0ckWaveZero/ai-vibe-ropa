import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(16),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().default('admin@ropa.local'),
  ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
