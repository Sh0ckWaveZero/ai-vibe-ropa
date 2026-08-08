import assert from 'node:assert/strict';
import test from 'node:test';

import { apiFetch } from './client.ts';

test('can log in again immediately after logging out', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let csrfCookie: string | null = null;
  let tokenSequence = 0;

  globalThis.fetch = async (input, init = {}) => {
    const path = String(input);

    if (path === '/api/auth/csrf-token') {
      csrfCookie = `csrf-${++tokenSequence}`;
      return Response.json({ csrfToken: csrfCookie });
    }

    const headerToken = new Headers(init.headers).get('X-CSRF-Token');
    if (!csrfCookie || headerToken !== csrfCookie) {
      return Response.json(
        { error: { code: 'CSRF_INVALID', message: 'Missing or invalid CSRF token' } },
        { status: 403 },
      );
    }

    if (path === '/api/auth/login') {
      csrfCookie = `csrf-${++tokenSequence}`;
      return Response.json({ stage: 'verify_required', csrfToken: csrfCookie });
    }

    if (path === '/api/auth/logout') {
      csrfCookie = null;
      return Response.json({ ok: true });
    }

    return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  };

  await apiFetch('/auth/login', { method: 'POST', body: '{}' });
  await apiFetch('/auth/logout', { method: 'POST' });

  const secondLogin = await apiFetch<{ stage: string }>('/auth/login', {
    method: 'POST',
    body: '{}',
  });

  assert.equal(secondLogin.stage, 'verify_required');
});
