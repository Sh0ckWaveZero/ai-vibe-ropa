import { describe, it, expect } from 'vitest';
import { generate } from 'otplib';
import { createTestUser, csrfAgent } from './helpers.js';

describe('Two-factor authentication flow', () => {
  it('fresh user gets setup_required, then a full session after completing setup', async () => {
    const { email, password } = await createTestUser({ roleCode: 'viewer' });
    const { agent, updateToken } = await csrfAgent();

    const login = await agent.post('/api/auth/login').send({ email, password });
    expect(login.body.stage).toBe('setup_required');
    updateToken(login.body.csrfToken);

    const setup = await agent.post('/api/auth/2fa/setup');
    expect(setup.body.secret).toBeTruthy();
    expect(setup.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const code = await generate({ secret: setup.body.secret });
    const confirm = await agent.post('/api/auth/2fa/setup/confirm').send({ code });
    expect(confirm.status).toBe(200);
    expect(confirm.body.stage).toBe('complete');
    expect(confirm.body.backupCodes).toHaveLength(10);
    updateToken(confirm.body.csrfToken);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    expect(me.body.user.totpEnabled).toBe(true);
  });

  it('wrong code during setup confirm is rejected and does not enable 2FA', async () => {
    const { email, password } = await createTestUser({ roleCode: 'viewer' });
    const { agent, updateToken } = await csrfAgent();
    const login = await agent.post('/api/auth/login').send({ email, password });
    updateToken(login.body.csrfToken);
    await agent.post('/api/auth/2fa/setup');

    const wrongConfirm = await agent.post('/api/auth/2fa/setup/confirm').send({ code: '000000' });
    expect(wrongConfirm.status).toBe(400);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('returning user (2FA already enabled) gets verify_required, and a backup code works exactly once', async () => {
    const { email, password } = await createTestUser({ roleCode: 'viewer' });
    const { agent, updateToken } = await csrfAgent();
    const login = await agent.post('/api/auth/login').send({ email, password });
    updateToken(login.body.csrfToken);
    const setup = await agent.post('/api/auth/2fa/setup');
    const code = await generate({ secret: setup.body.secret });
    const confirm = await agent.post('/api/auth/2fa/setup/confirm').send({ code });
    updateToken(confirm.body.csrfToken);
    const backupCode = confirm.body.backupCodes[0];

    await agent.post('/api/auth/logout');

    const { agent: agent2, updateToken: updateToken2 } = await csrfAgent();
    const login2 = await agent2.post('/api/auth/login').send({ email, password });
    expect(login2.body.stage).toBe('verify_required');
    updateToken2(login2.body.csrfToken);

    const verify = await agent2.post('/api/auth/2fa/verify').send({ code: backupCode });
    expect(verify.status).toBe(200);
    expect(verify.body.stage).toBe('complete');
    updateToken2(verify.body.csrfToken);

    // The same backup code must not work a second time.
    await agent2.post('/api/auth/logout');
    const { agent: agent3, updateToken: updateToken3 } = await csrfAgent();
    const login3 = await agent3.post('/api/auth/login').send({ email, password });
    updateToken3(login3.body.csrfToken);
    const secondUse = await agent3.post('/api/auth/2fa/verify').send({ code: backupCode });
    expect(secondUse.status).toBe(400);
  });

  it('login does not distinguish a wrong password from a non-existent account', async () => {
    const { email } = await createTestUser({ roleCode: 'viewer', password: 'CorrectPass123!' });

    const { agent: agentA } = await csrfAgent();
    const wrongPassword = await agentA.post('/api/auth/login').send({ email, password: 'WrongPass123!' });

    const { agent: agentB } = await csrfAgent();
    const noSuchUser = await agentB
      .post('/api/auth/login')
      .send({ email: 'nobody-here@test.local', password: 'WhateverPass123!' });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe(noSuchUser.body.error.code);
    expect(wrongPassword.body.error.message).toBe(noSuchUser.body.error.message);
  });

  it('a pre-auth token for the setup stage cannot be used against the verify-only endpoint', async () => {
    const { email, password } = await createTestUser({ roleCode: 'viewer' });
    const { agent, updateToken } = await csrfAgent();
    const login = await agent.post('/api/auth/login').send({ email, password });
    updateToken(login.body.csrfToken);

    // Still in "setup" stage — /2fa/verify requires "verify" stage.
    const res = await agent.post('/api/auth/2fa/verify').send({ code: '123456' });
    expect(res.status).toBe(403);
  });

  it('a mutating request without a CSRF token is rejected', async () => {
    const { email, password } = await createTestUser({ roleCode: 'viewer' });
    const { agent } = await csrfAgent();
    // Deliberately bypass the CSRF-aware wrapper via a fresh request-less call.
    const res = await agent.post('/api/auth/login').set('X-CSRF-Token', '').send({ email, password });
    expect(res.status).toBe(403);
  });
});
