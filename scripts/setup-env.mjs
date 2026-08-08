#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED_ENVIRONMENTS = ['local', 'qa', 'stg', 'prod'];
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROFILES = {
  local: {
    nodeEnv: 'development',
    postgresDb: 'ropa',
    postgresPassword: 'ropa',
    publicOrigin: 'https://localhost:8443',
    corsOrigin: 'http://localhost:5173',
    backendOrigin: 'http://localhost:4000',
    frontendPort: 5173,
    adminPassword: 'ChangeMe123!',
  },
  qa: {
    nodeEnv: 'production',
    postgresDb: 'ropa_qa',
    publicOrigin: 'https://qa.example.com',
    backendOrigin: 'http://localhost:4000',
    frontendPort: 3000,
  },
  stg: {
    nodeEnv: 'production',
    postgresDb: 'ropa_stg',
    publicOrigin: 'https://stg.example.com',
    backendOrigin: 'http://localhost:4000',
    frontendPort: 3000,
  },
  prod: {
    nodeEnv: 'production',
    postgresDb: 'ropa_prod',
    publicOrigin: 'https://example.com',
    backendOrigin: 'http://localhost:4000',
    frontendPort: 3000,
  },
};

function usage() {
  return `Usage: npm run env:setup -- [local|qa|stg|prod] [options]

Options:
  --force                       Replace existing .env files
  --public-origin=<url>         Public HTTPS origin used by CORS and Compose
  --backend-origin=<url>        Backend origin used by the frontend server
  --database-url=<url>          Override the backend DATABASE_URL
  --postgres-host-port=<port>   Host port for PostgreSQL (default: 5433)
  --help                        Show this help

Examples:
  npm run env:setup -- local
  npm run env:setup -- qa --public-origin=https://qa.ropa.example
  npm run env:setup -- prod --public-origin=https://ropa.example --force`;
}

function parseOption(argument, name) {
  const prefix = `--${name}=`;
  return argument.startsWith(prefix) ? argument.slice(prefix.length) : undefined;
}

export function parseArgs(args) {
  if (args.includes('--help')) return { help: true };

  const positional = args.filter((argument) => !argument.startsWith('--'));
  if (positional.length > 1) throw new Error(`Expected one environment, received: ${positional.join(', ')}`);

  const environment = positional[0] ?? 'local';
  if (!SUPPORTED_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `Unsupported environment "${environment}". Choose one of: ${SUPPORTED_ENVIRONMENTS.join(', ')}`,
    );
  }

  const valueFlags = [
    '--public-origin=',
    '--backend-origin=',
    '--database-url=',
    '--postgres-host-port=',
  ];
  const unknownFlag = args.find(
    (argument) =>
      argument.startsWith('--') &&
      argument !== '--force' &&
      !valueFlags.some((flag) => argument.startsWith(flag)),
  );
  if (unknownFlag) throw new Error(`Unknown option: ${unknownFlag}`);

  const options = Object.fromEntries(
    args
      .map((argument) => {
        for (const name of ['public-origin', 'backend-origin', 'database-url', 'postgres-host-port']) {
          const value = parseOption(argument, name);
          if (value !== undefined) return [name, value];
        }
        return undefined;
      })
      .filter(Boolean),
  );

  return {
    environment,
    force: args.includes('--force'),
    publicOrigin: options['public-origin'],
    backendOrigin: options['backend-origin'],
    databaseUrl: options['database-url'],
    postgresHostPort: options['postgres-host-port'],
  };
}

function validateUrl(value, option, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${option} must be a valid URL`);
  }

  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${option} must use ${protocols.join(' or ')}`);
  }

  return value.replace(/\/$/, '');
}

function render(lines) {
  return `${lines.join('\n')}\n`;
}

export function createEnvContents({
  environment,
  publicOrigin: publicOriginOverride,
  backendOrigin: backendOriginOverride,
  databaseUrl: databaseUrlOverride,
  postgresHostPort: postgresHostPortOverride,
}) {
  const profile = PROFILES[environment];
  if (!profile) throw new Error(`Unsupported environment "${environment}"`);

  const publicOrigin = validateUrl(
    publicOriginOverride ?? profile.publicOrigin,
    '--public-origin',
    ['http:', 'https:'],
  );
  const backendOrigin = validateUrl(
    backendOriginOverride ?? profile.backendOrigin,
    '--backend-origin',
    ['http:', 'https:'],
  );
  const postgresHostPort = Number(postgresHostPortOverride ?? 5433);
  if (!Number.isInteger(postgresHostPort) || postgresHostPort < 1 || postgresHostPort > 65535) {
    throw new Error('--postgres-host-port must be an integer between 1 and 65535');
  }

  const postgresUser = 'ropa';
  const postgresPassword = profile.postgresPassword ?? randomBytes(24).toString('hex');
  const accessTokenSecret = randomBytes(32).toString('hex');
  const preAuthTokenSecret = randomBytes(32).toString('hex');
  const totpEncryptionKey = randomBytes(32).toString('hex');
  const adminPassword = profile.adminPassword ?? `${randomBytes(18).toString('base64url')}Aa1!`;
  const generatedDatabaseUrl = `postgresql://${encodeURIComponent(postgresUser)}:${encodeURIComponent(postgresPassword)}@localhost:${postgresHostPort}/${encodeURIComponent(profile.postgresDb)}?schema=public`;
  const databaseUrl = validateUrl(
    databaseUrlOverride ?? generatedDatabaseUrl,
    '--database-url',
    ['postgres:', 'postgresql:'],
  );
  const header = `# Generated for ${environment} by npm run env:setup -- ${environment}`;

  return {
    root: render([
      header,
      `APP_ENV=${environment}`,
      '',
      `POSTGRES_USER=${postgresUser}`,
      `POSTGRES_PASSWORD=${postgresPassword}`,
      `POSTGRES_DB=${profile.postgresDb}`,
      `POSTGRES_HOST_PORT=${postgresHostPort}`,
      '',
      `ACCESS_TOKEN_SECRET=${accessTokenSecret}`,
      'REFRESH_TOKEN_TTL_DAYS=7',
      'ACCESS_TOKEN_TTL_MIN=15',
      `PRE_AUTH_TOKEN_SECRET=${preAuthTokenSecret}`,
      'PRE_AUTH_TOKEN_TTL_MIN=5',
      `TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`,
      'TWOFA_ISSUER=ROPA',
      '',
      `PUBLIC_ORIGIN=${publicOrigin}`,
      'PUBLIC_PORT=8080',
      'PUBLIC_HTTPS_PORT=8443',
      '',
      'ADMIN_EMAIL=admin@ropa.local',
      `ADMIN_PASSWORD=${adminPassword}`,
      'UPLOAD_DIR=./uploads',
      'MAX_UPLOAD_SIZE_MB=10',
    ]),
    backend: render([
      header,
      `NODE_ENV=${profile.nodeEnv}`,
      'PORT=4000',
      `DATABASE_URL=${databaseUrl}`,
      `ACCESS_TOKEN_SECRET=${accessTokenSecret}`,
      'REFRESH_TOKEN_TTL_DAYS=7',
      'ACCESS_TOKEN_TTL_MIN=15',
      `PRE_AUTH_TOKEN_SECRET=${preAuthTokenSecret}`,
      'PRE_AUTH_TOKEN_TTL_MIN=5',
      `TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`,
      'TWOFA_ISSUER=ROPA',
      `CORS_ORIGIN=${environment === 'local' ? profile.corsOrigin : publicOrigin}`,
      'ADMIN_EMAIL=admin@ropa.local',
      `ADMIN_PASSWORD=${adminPassword}`,
      'UPLOAD_DIR=./uploads',
      'MAX_UPLOAD_SIZE_MB=10',
    ]),
    frontend: render([
      header,
      `BACKEND_ORIGIN=${backendOrigin}`,
      `PORT=${profile.frontendPort}`,
    ]),
    usesPlaceholderOrigin: !publicOriginOverride && environment !== 'local',
  };
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeEnvironmentFiles({ rootDir = REPO_ROOT, force = false, ...options }) {
  const contents = createEnvContents(options);
  const targets = [
    [resolve(rootDir, '.env'), contents.root],
    [resolve(rootDir, 'backend/.env'), contents.backend],
    [resolve(rootDir, 'frontend/.env'), contents.frontend],
  ];
  const existing = [];

  for (const [path] of targets) {
    if (await fileExists(path)) existing.push(path);
  }

  if (existing.length > 0 && !force) {
    throw new Error(
      `Refusing to replace existing environment files:\n${existing.map((path) => `  - ${path}`).join('\n')}\nRun again with --force to replace all three files.`,
    );
  }

  for (const [path, content] of targets) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { encoding: 'utf8', mode: 0o600 });
    await chmod(path, 0o600);
  }

  return {
    paths: targets.map(([path]) => path),
    usesPlaceholderOrigin: contents.usesPlaceholderOrigin,
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }

    const result = await writeEnvironmentFiles(options);
    console.log(`Environment "${options.environment}" is ready:`);
    for (const path of result.paths) console.log(`  - ${path}`);
    if (result.usesPlaceholderOrigin) {
      console.warn(
        `Warning: ${options.environment} uses a placeholder public origin. Run again with --public-origin=https://your-domain --force before deployment.`,
      );
    }
    if (options.environment === 'local') {
      console.warn('Local credentials are for development only. Do not reuse them outside your machine.');
    }
  } catch (error) {
    console.error(`env:setup failed: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
