import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfTokensEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch rather than returning false,
  // and lengths differing is itself not secret, so compare that first.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Double-submit-cookie CSRF defense (see utils/csrf.ts for the cookie side).
 * Not implemented via the `csurf` package deliberately: that package is
 * deprecated upstream and pulls in its own advisories — this is the same
 * OWASP-documented pattern, hand-rolled with a timing-safe comparison.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.ropa_csrf;
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || !csrfTokensEqual(cookieToken, headerToken)) {
    throw AppError.forbidden('Missing or invalid CSRF token', 'CSRF_INVALID');
  }

  next();
}
