import crypto from 'node:crypto';
import type { Response } from 'express';
import { isProd } from '../config/env.js';

const CSRF_COOKIE = 'ropa_csrf';

// Double-submit-cookie CSRF defense: this cookie is deliberately NOT
// httpOnly so frontend JS can read it and echo it back as the
// X-CSRF-Token header on mutating requests. A cross-site attacker can
// make the browser *send* the cookie (in the Lax-exempt cases) but cannot
// *read* it to forge a matching header, since same-origin policy blocks
// that regardless of SameSite.
export function setCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  return token;
}

export { CSRF_COOKIE };
