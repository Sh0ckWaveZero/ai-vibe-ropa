import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  detectCurrentEnvironment,
  formatGeneratedSummary,
  isConfirmed,
  parseArgs,
  renderBanner,
  resolveEnvironmentSelection,
  resolveSourceEnvironment,
  runApplication,
  writeEnvironmentFiles,
} from './setup-env.mjs';

function sourceEnv(environment) {
  return `APP_ENV=${environment}
POSTGRES_USER=ropa
POSTGRES_PASSWORD=password-${environment}
POSTGRES_DB=ropa_${environment}
POSTGRES_HOST_PORT=6543
BACKEND_PORT=4100
FRONTEND_PORT=5100
ACCESS_TOKEN_SECRET=access-token-secret-${environment}
REFRESH_TOKEN_TTL_DAYS=7
ACCESS_TOKEN_TTL_MIN=15
PRE_AUTH_TOKEN_SECRET=pre-auth-token-secret-${environment}
PRE_AUTH_TOKEN_TTL_MIN=5
TOTP_ENCRYPTION_KEY=21f89afa9005d45a214308296c863ce8c07bfcfbff48639814083b60940bbb60
TWOFA_ISSUER=ROPA ${environment}
PUBLIC_ORIGIN=https://${environment}.ropa.example
BACKEND_ORIGIN=https://api.${environment}.ropa.example
CORS_ORIGIN=https://${environment}.ropa.example
ADMIN_EMAIL=admin@ropa.local
ADMIN_PASSWORD=ChangeMe123!
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
`;
}

test('reads root .env, creates only package files, and preserves the source', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-local-'));
  const source = sourceEnv('local');

  try {
    await writeFile(join(rootDir, '.env'), source);
    const result = await writeEnvironmentFiles({ environment: 'local', rootDir });
    assert.equal(result.paths.length, 2);

    const [sourceAfter, backendEnv, frontendEnv] = await Promise.all([
      readFile(join(rootDir, '.env'), 'utf8'),
      readFile(join(rootDir, 'backend/.env'), 'utf8'),
      readFile(join(rootDir, 'frontend/.env'), 'utf8'),
    ]);

    assert.equal(sourceAfter, source);
    assert.match(backendEnv, /APP_ENV=local/);
    assert.match(backendEnv, /NODE_ENV=development/);
    assert.match(backendEnv, /DATABASE_URL=postgresql:\/\/ropa:password-local@localhost:6543\/ropa_local\?schema=public/);
    assert.match(backendEnv, /ACCESS_TOKEN_SECRET=access-token-secret-local/);
    assert.match(frontendEnv, /BACKEND_ORIGIN=https:\/\/api\.local\.ropa\.example/);
    assert.match(frontendEnv, /PORT=5100/);
    assert.equal(await detectCurrentEnvironment(rootDir), 'local');

    await assert.rejects(
      writeEnvironmentFiles({ environment: 'local', rootDir }),
      /Refusing to replace existing generated files/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

for (const environment of ['qa', 'stg', 'prod']) {
  test(`reads the same root .env for ${environment}`, async () => {
    const rootDir = await mkdtemp(join(tmpdir(), `ropa-env-${environment}-`));

    try {
      await writeFile(join(rootDir, '.env'), sourceEnv(environment));
      await writeEnvironmentFiles({ environment, rootDir });

      const [backendEnv, frontendEnv] = await Promise.all([
        readFile(join(rootDir, 'backend/.env'), 'utf8'),
        readFile(join(rootDir, 'frontend/.env'), 'utf8'),
      ]);

      assert.match(backendEnv, /NODE_ENV=production/);
      assert.match(backendEnv, new RegExp(`APP_ENV=${environment}`));
      assert.match(backendEnv, new RegExp(`DATABASE_URL=postgresql:\\/\\/ropa:password-${environment}@`));
      assert.match(backendEnv, new RegExp(`ACCESS_TOKEN_SECRET=access-token-secret-${environment}`));
      assert.doesNotMatch(backendEnv, /access-token-secret-local/);
      assert.match(frontendEnv, new RegExp(`BACKEND_ORIGIN=https:\\/\\/api\\.${environment}\\.ropa\\.example`));
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
}

test('requires the selected root source file', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-missing-'));

  try {
    await mkdir(join(rootDir, 'backend'), { recursive: true });
    await assert.rejects(
      writeEnvironmentFiles({ environment: 'qa', rootDir }),
      /\.env does not exist/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('supports a database port separate from the published Postgres port', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-database-port-'));

  try {
    const source = sourceEnv('local').replace('POSTGRES_HOST_PORT=6543', 'POSTGRES_HOST_PORT=6543\nDATABASE_PORT=5432');
    await writeFile(join(rootDir, '.env'), source);
    await writeEnvironmentFiles({ environment: 'local', rootDir });
    const backendEnv = await readFile(join(rootDir, 'backend/.env'), 'utf8');

    assert.match(backendEnv, /DATABASE_URL=postgresql:\/\/ropa:password-local@localhost:5432\/ropa_local\?schema=public/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('supports interactive choices and confirmation', () => {
  assert.deepEqual(parseArgs([]), { interactive: true, force: false, run: false });
  assert.deepEqual(parseArgs(['current', '--force', '--run']), {
    environment: 'current',
    force: true,
    run: true,
  });
  assert.equal(resolveEnvironmentSelection('', 'stg'), 'stg');
  assert.equal(resolveEnvironmentSelection('current', 'qa'), 'qa');
  assert.equal(resolveEnvironmentSelection('2', 'prod'), 'local');
  assert.equal(resolveEnvironmentSelection('prod', 'local'), 'prod');
  assert.equal(isConfirmed('y'), true);
  assert.equal(isConfirmed('YES'), true);
  assert.equal(isConfirmed('n'), false);
  assert.equal(resolveSourceEnvironment({ APP_ENV: 'STG' }), 'stg');
  assert.equal(resolveSourceEnvironment({}), null);
  assert.throws(() => resolveSourceEnvironment({ APP_ENV: 'demo' }), /APP_ENV must be one of/);
});

test('rejects a selected profile that does not match the active root block', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-mismatch-'));

  try {
    await writeFile(join(rootDir, '.env'), sourceEnv('local'));
    await assert.rejects(
      writeEnvironmentFiles({ environment: 'prod', rootDir }),
      /root \.env has APP_ENV=local/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('renders a readable ROPA banner with optional terminal color', () => {
  const plain = renderBanner();
  const colored = renderBanner({ color: true });

  assert.match(plain, /██████╗/);
  assert.match(plain, /Environment Setup/);
  assert.doesNotMatch(plain, /\u001B\[/);
  assert.match(colored, /\u001B\[38;2;/);
  assert.match(colored, /\u001B\[2mEnvironment Setup/);
});

test('summarizes generated files with relative paths', () => {
  const rootDir = '/workspace/ropa';
  const summary = formatGeneratedSummary(
    {
      sourcePath: '/workspace/ropa/.env',
      paths: ['/workspace/ropa/backend/.env', '/workspace/ropa/frontend/.env'],
    },
    rootDir,
  );

  assert.equal(summary, 'Generated from .env:\n  ✓ backend/.env\n  ✓ frontend/.env');
  assert.doesNotMatch(summary, /\/workspace\/ropa/);
});

test('runs the root dev script when requested', async () => {
  const child = new EventEmitter();
  let invocation;
  const spawnProcess = (command, args, options) => {
    invocation = { command, args, options };
    queueMicrotask(() => child.emit('exit', 0, null));
    return child;
  };

  const exitCode = await runApplication({ rootDir: '/repo', spawnProcess });
  assert.equal(exitCode, 0);
  assert.deepEqual(invocation.args, ['run', 'dev']);
  assert.equal(invocation.options.cwd, '/repo');
  assert.equal(invocation.options.stdio, 'inherit');
});

test('current regenerates the last selected profile', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ropa-env-current-'));

  try {
    await writeFile(join(rootDir, '.env'), sourceEnv('qa'));
    await writeEnvironmentFiles({ environment: 'qa', rootDir });
    const result = await writeEnvironmentFiles({ environment: 'current', rootDir, force: true });
    const backendEnv = await readFile(join(rootDir, 'backend/.env'), 'utf8');

    assert.equal(result.environment, 'qa');
    assert.match(backendEnv, /APP_ENV=qa/);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
