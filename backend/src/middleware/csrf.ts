import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { CSRF_COOKIE } from '../utils/csrf.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw AppError.forbidden('Missing or invalid CSRF token', 'CSRF_INVALID');
  }

  next();
}
