#!/usr/bin/env node

import { constants } from 'node:fs';
import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = '.env';
const PROFILES = {
  local: { nodeEnv: 'development', frontendPort: 5173 },
  qa: { nodeEnv: 'production', frontendPort: 3000 },
  stg: { nodeEnv: 'production', frontendPort: 3000 },
  prod: { nodeEnv: 'production', frontendPort: 3000 },
};

function usage() {
  return `Usage: npm run env:setup -- [current|local|qa|stg|prod] [--force]

Every profile reads .env at the repository root.
Run without a profile to select one interactively and confirm before writing.

The command creates backend/.env and frontend/.env. It never changes the source file.

Options:
  --force  Replace existing backend/.env and frontend/.env
  --help   Show this help`;
}

export function parseArgs(args) {
  if (args.includes('--help')) return { help: true };

  const unknownFlag = args.find(
    (argument) => argument.startsWith('--') && argument !== '--force',
  );
  if (unknownFlag) throw new Error(`Unknown option: ${unknownFlag}`);

  const positional = args.filter((argument) => !argument.startsWith('--'));
  if (positional.length > 1) throw new Error(`Expected one environment, received: ${positional.join(', ')}`);

  if (positional.length === 0) {
    return { interactive: true, force: args.includes('--force') };
  }

  const environment = positional[0];
  if (environment !== 'current' && !Object.hasOwn(PROFILES, environment)) {
    throw new Error(`Unsupported environment "${environment}". Choose one of: current, ${Object.keys(PROFILES).join(', ')}`);
  }

  return { environment, force: args.includes('--force') };
}

export async function detectCurrentEnvironment(rootDir = REPO_ROOT) {
  for (const relativePath of ['backend/.env', 'frontend/.env']) {
    try {
      const content = await readFile(resolve(rootDir, relativePath), 'utf8');
      const parsed = parseEnv(content);
      if (Object.hasOwn(PROFILES, parsed.APP_ENV)) return parsed.APP_ENV;

      const legacyProfile = content.match(/Generated from root\/\.env for (local|qa|stg|prod);/)?.[1];
      if (legacyProfile) return legacyProfile;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return 'local';
}

export function resolveEnvironmentSelection(answer, currentEnvironment) {
  const normalized = answer.trim().toLowerCase();
  const selections = {
    '': currentEnvironment,
    '1': currentEnvironment,
    current: currentEnvironment,
    '2': 'local',
    local: 'local',
    '3': 'qa',
    qa: 'qa',
    '4': 'stg',
    stg: 'stg',
    '5': 'prod',
    prod: 'prod',
  };
  const selected = selections[normalized];
  if (!selected) throw new Error(`Invalid selection "${answer}"`);
  return selected;
}

export function isConfirmed(answer) {
  return ['y', 'yes'].includes(answer.trim().toLowerCase());
}

async function promptForEnvironment({ rootDir = REPO_ROOT, input = process.stdin, output = process.stdout } = {}) {
  const currentEnvironment = await detectCurrentEnvironment(rootDir);
  const prompt = createInterface({ input, output });

  try {
    output.write(`Current environment: ${currentEnvironment}\n`);
    output.write(`1) current (${currentEnvironment})\n2) local\n3) qa\n4) stg\n5) prod\n`);
    const answer = await prompt.question('Select environment [1]: ');
    const environment = resolveEnvironmentSelection(answer, currentEnvironment);
    const confirmation = await prompt.question(
      `Run env:setup with "${environment}" using root .env? [y/N]: `,
    );

    return isConfirmed(confirmation) ? { environment, force: true } : { cancelled: true };
  } finally {
    prompt.close();
  }
}

function requireValue(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required variable ${key} in the root environment file`);
  return value;
}

function optionalInteger(env, key, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[key]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validateUrl(value, key, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }

  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${key} must use ${protocols.join(' or ')}`);
  }
  return value.replace(/\/$/, '');
}

function render(lines) {
  return `${lines.join('\n')}\n`;
}

export function createEnvContents({ environment, rootEnv, sourceName = SOURCE_FILE }) {
  const profile = PROFILES[environment];
  if (!profile) throw new Error(`Unsupported environment "${environment}"`);

  const postgresUser = requireValue(rootEnv, 'POSTGRES_USER');
  const postgresPassword = requireValue(rootEnv, 'POSTGRES_PASSWORD');
  const postgresDb = requireValue(rootEnv, 'POSTGRES_DB');
  const postgresHost = rootEnv.POSTGRES_HOST?.trim() || 'localhost';
  const postgresHostPort = optionalInteger(rootEnv, 'POSTGRES_HOST_PORT', 5433, { max: 65535 });
  const backendPort = optionalInteger(rootEnv, 'BACKEND_PORT', 4000, { max: 65535 });
  const frontendPort = optionalInteger(rootEnv, 'FRONTEND_PORT', profile.frontendPort, { max: 65535 });

  const accessTokenSecret = requireValue(rootEnv, 'ACCESS_TOKEN_SECRET');
  if (accessTokenSecret.length < 16) throw new Error('ACCESS_TOKEN_SECRET must contain at least 16 characters');
  const preAuthTokenSecret = requireValue(rootEnv, 'PRE_AUTH_TOKEN_SECRET');
  if (preAuthTokenSecret.length < 16) throw new Error('PRE_AUTH_TOKEN_SECRET must contain at least 16 characters');
  const totpEncryptionKey = requireValue(rootEnv, 'TOTP_ENCRYPTION_KEY');
  if (!/^[0-9a-fA-F]{64}$/.test(totpEncryptionKey)) {
    throw new Error('TOTP_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters');
  }

  const publicOrigin = validateUrl(requireValue(rootEnv, 'PUBLIC_ORIGIN'), 'PUBLIC_ORIGIN', ['http:', 'https:']);
  const backendOrigin = validateUrl(
    rootEnv.BACKEND_ORIGIN?.trim() || `http://localhost:${backendPort}`,
    'BACKEND_ORIGIN',
    ['http:', 'https:'],
  );
  const corsOrigin = validateUrl(
    rootEnv.CORS_ORIGIN?.trim() || (environment === 'local' ? `http://localhost:${frontendPort}` : publicOrigin),
    'CORS_ORIGIN',
    ['http:', 'https:'],
  );

  const databaseUrl = rootEnv.DATABASE_URL?.trim()
    ? validateUrl(rootEnv.DATABASE_URL.trim(), 'DATABASE_URL', ['postgres:', 'postgresql:'])
    : `postgresql://${encodeURIComponent(postgresUser)}:${encodeURIComponent(postgresPassword)}@${postgresHost}:${postgresHostPort}/${encodeURIComponent(postgresDb)}?schema=public`;
  const adminEmail = requireValue(rootEnv, 'ADMIN_EMAIL');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('ADMIN_EMAIL must be a valid email address');
  const adminPassword = requireValue(rootEnv, 'ADMIN_PASSWORD');
  if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must contain at least 8 characters');

  const header = `# Generated from root/${sourceName} for ${environment}; edit the source file and rerun env:setup`;
  return {
    backend: render([
      header,
      `APP_ENV=${environment}`,
      `NODE_ENV=${profile.nodeEnv}`,
      `PORT=${backendPort}`,
      `DATABASE_URL=${databaseUrl}`,
      `ACCESS_TOKEN_SECRET=${accessTokenSecret}`,
      `REFRESH_TOKEN_TTL_DAYS=${optionalInteger(rootEnv, 'REFRESH_TOKEN_TTL_DAYS', 7)}`,
      `ACCESS_TOKEN_TTL_MIN=${optionalInteger(rootEnv, 'ACCESS_TOKEN_TTL_MIN', 15)}`,
      `PRE_AUTH_TOKEN_SECRET=${preAuthTokenSecret}`,
      `PRE_AUTH_TOKEN_TTL_MIN=${optionalInteger(rootEnv, 'PRE_AUTH_TOKEN_TTL_MIN', 5)}`,
      `TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`,
      `TWOFA_ISSUER=${rootEnv.TWOFA_ISSUER?.trim() || 'ROPA'}`,
      `CORS_ORIGIN=${corsOrigin}`,
      `ADMIN_EMAIL=${adminEmail}`,
      `ADMIN_PASSWORD=${adminPassword}`,
      `UPLOAD_DIR=${rootEnv.UPLOAD_DIR?.trim() || './uploads'}`,
      `MAX_UPLOAD_SIZE_MB=${optionalInteger(rootEnv, 'MAX_UPLOAD_SIZE_MB', 10)}`,
    ]),
    frontend: render([
      header,
      `APP_ENV=${environment}`,
      `BACKEND_ORIGIN=${backendOrigin}`,
      `PORT=${frontendPort}`,
    ]),
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

export async function writeEnvironmentFiles({ rootDir = REPO_ROOT, environment, force = false }) {
  if (environment === 'current') environment = await detectCurrentEnvironment(rootDir);
  if (!Object.hasOwn(PROFILES, environment)) throw new Error(`Unsupported environment "${environment}"`);

  const sourceName = SOURCE_FILE;
  const sourcePath = resolve(rootDir, sourceName);
  let sourceContent;
  try {
    sourceContent = await readFile(sourcePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Source file ${sourcePath} does not exist. Create it from .env.example first.`);
    }
    throw error;
  }

  let rootEnv;
  try {
    rootEnv = parseEnv(sourceContent);
  } catch (error) {
    throw new Error(`Cannot parse ${sourcePath}: ${error.message}`);
  }

  const contents = createEnvContents({ environment, rootEnv, sourceName });
  const targets = [
    [resolve(rootDir, 'backend/.env'), contents.backend],
    [resolve(rootDir, 'frontend/.env'), contents.frontend],
  ];
  const existing = [];

  for (const [path] of targets) {
    if (await fileExists(path)) existing.push(path);
  }

  if (existing.length > 0 && !force) {
    throw new Error(
      `Refusing to replace existing generated files:\n${existing.map((path) => `  - ${path}`).join('\n')}\nRun again with --force to regenerate both files from ${sourceName}.`,
    );
  }

  for (const [path, content] of targets) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { encoding: 'utf8', mode: 0o600 });
    await chmod(path, 0o600);
  }

  return { environment, sourcePath, paths: targets.map(([path]) => path) };
}

async function main() {
  try {
    let options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }

    if (options.interactive) {
      options = await promptForEnvironment();
      if (options.cancelled) {
        console.log('Cancelled. No files were changed.');
        return;
      }
    }

    const result = await writeEnvironmentFiles(options);
    console.log(`Selected environment: ${result.environment}`);
    console.log(`Read environment from ${result.sourcePath}`);
    console.log('Generated:');
    for (const path of result.paths) console.log(`  - ${path}`);
  } catch (error) {
    console.error(`env:setup failed: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
