import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { writeEnvironmentFiles } from './setup-env.mjs';

test('creates scoped local environment files and refuses accidental overwrite', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-local-'));

  try {
    const result = await writeEnvironmentFiles({ environment: 'local', rootDir });
    assert.equal(result.paths.length, 3);

    const [rootEnv, backendEnv, frontendEnv] = await Promise.all([
      readFile(join(rootDir, '.env'), 'utf8'),
      readFile(join(rootDir, 'backend/.env'), 'utf8'),
      readFile(join(rootDir, 'frontend/.env'), 'utf8'),
    ]);

    assert.match(rootEnv, /APP_ENV=local/);
    assert.match(backendEnv, /DATABASE_URL=postgresql:\/\/ropa:ropa@localhost:5433\/ropa\?schema=public/);
    assert.match(backendEnv, /TOTP_ENCRYPTION_KEY=[0-9a-f]{64}/);
    assert.match(frontendEnv, /BACKEND_ORIGIN=http:\/\/localhost:4000/);

    await assert.rejects(
      writeEnvironmentFiles({ environment: 'local', rootDir }),
      /Refusing to replace existing environment files/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

for (const environment of ['qa', 'stg', 'prod']) {
  test(`creates ${environment} values with explicit origins`, async () => {
    const rootDir = await mkdtemp(join(tmpdir(), `ropa-env-${environment}-`));
    const publicOrigin = `https://${environment}.ropa.example`;
    const backendOrigin = `https://api.${environment}.ropa.example`;

    try {
      await writeEnvironmentFiles({ environment, rootDir, publicOrigin, backendOrigin });

      const [rootEnv, backendEnv, frontendEnv] = await Promise.all([
        readFile(join(rootDir, '.env'), 'utf8'),
        readFile(join(rootDir, 'backend/.env'), 'utf8'),
        readFile(join(rootDir, 'frontend/.env'), 'utf8'),
      ]);
      const postgresPassword = rootEnv.match(/^POSTGRES_PASSWORD=(.+)$/m)?.[1];

      assert.match(rootEnv, new RegExp(`APP_ENV=${environment}`));
      assert.match(rootEnv, new RegExp(`POSTGRES_DB=ropa_${environment}`));
      assert.match(rootEnv, new RegExp(`PUBLIC_ORIGIN=https:\\/\\/${environment}\\.ropa\\.example`));
      assert.doesNotMatch(rootEnv, /ChangeMe123!/);
      assert.ok(postgresPassword);
      assert.match(backendEnv, /NODE_ENV=production/);
      assert.match(backendEnv, new RegExp(`DATABASE_URL=postgresql:\\/\\/ropa:${postgresPassword}@`));
      assert.match(backendEnv, new RegExp(`CORS_ORIGIN=https:\\/\\/${environment}\\.ropa\\.example`));
      assert.match(frontendEnv, new RegExp(`BACKEND_ORIGIN=https:\\/\\/api\\.${environment}\\.ropa\\.example`));
      assert.match(frontendEnv, /PORT=3000/);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
}
