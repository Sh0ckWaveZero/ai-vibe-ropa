import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const TEST_ENV_PATH = fileURLToPath(new URL('../../.env.test', import.meta.url));

export function loadTestEnv(): Record<string, string> {
  const result = dotenv.config({ path: TEST_ENV_PATH, override: true });
  if (result.error) throw result.error;
  return result.parsed ?? {};
}
