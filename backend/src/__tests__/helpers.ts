import request from 'supertest';
import { authenticator } from 'otplib';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { hashPassword } from '../utils/password.js';

export const app = createApp();

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now()}${counter}`;
}

export async function createTestDepartment(codePrefix = 'TD') {
  const code = unique(codePrefix).slice(0, 20);
  return prisma.department.create({
    data: { code, nameTh: code, nameEn: code, nameZh: code },
  });
}

export async function createTestUser(opts: {
  roleCode: string;
  departmentId?: string | null;
  password?: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: opts.roleCode } });
  const password = opts.password ?? 'TestPass123!';
  const email = `${unique('user')}@test.local`;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: `Test User ${email}`,
      roleId: role.id,
      departmentId: opts.departmentId ?? null,
    },
  });
  return { user, email, password };
}

/**
 * A supertest agent whose post/patch/put/delete calls automatically carry
 * the current CSRF token as the X-CSRF-Token header (the double-submit
 * defense requires it on every mutating request). The token rotates on
 * login/2FA-completion/refresh, so callers must feed each new value back
 * in via `updateToken` as those responses come back.
 */
export async function csrfAgent() {
  const agent = request.agent(app);
  const state = { token: '' };

  for (const method of ['post', 'patch', 'put', 'delete'] as const) {
    const original = agent[method].bind(agent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (agent as any)[method] = (url: string) => original(url).set('X-CSRF-Token', state.token);
  }

  const res = await agent.get('/api/auth/csrf-token');
  state.token = res.body.csrfToken;

  return { agent, updateToken: (token: string) => (state.token = token) };
}

/** Logs in and completes TOTP setup (fresh test users always start there). */
export async function authenticatedAgent(email: string, password: string) {
  const { agent, updateToken } = await csrfAgent();

  const loginRes = await agent.post('/api/auth/login').send({ email, password });
  if (loginRes.body.stage !== 'setup_required') {
    throw new Error(`Expected setup_required, got ${JSON.stringify(loginRes.body)}`);
  }
  updateToken(loginRes.body.csrfToken);

  const setupRes = await agent.post('/api/auth/2fa/setup');
  const code = authenticator.generate(setupRes.body.secret);
  const confirmRes = await agent.post('/api/auth/2fa/setup/confirm').send({ code });
  if (confirmRes.body.stage !== 'complete') {
    throw new Error(`2FA setup did not complete: ${JSON.stringify(confirmRes.body)}`);
  }
  updateToken(confirmRes.body.csrfToken);

  return agent;
}

export async function createAuthenticatedUser(opts: { roleCode: string; departmentId?: string | null }) {
  const { user, email, password } = await createTestUser(opts);
  const agent = await authenticatedAgent(email, password);
  return { user, agent };
}

export function validRopaPayload(departmentId: string, overrides: Record<string, unknown> = {}) {
  return {
    departmentId,
    activityName: 'Test activity',
    purpose: 'Testing purposes',
    legalBasis: 'Consent',
    controllerName: 'Test Controller',
    dataSubjectCategories: ['Employees'],
    dataCategories: ['Name'],
    sensitiveDataCategories: [],
    collectionSource: 'Directly from subject',
    recipients: [],
    hasCrossBorderTransfer: false,
    retentionPeriod: '1 year',
    disposalMethod: 'Secure deletion',
    securityMeasures: 'Encryption at rest',
    ...overrides,
  };
}
