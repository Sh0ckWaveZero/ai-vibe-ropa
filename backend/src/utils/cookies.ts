import type { Response } from 'express';
import { env, isProd } from '../config/env.js';
import { setCsrfCookie } from './csrf.js';

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Sets the session cookies and rotates the CSRF token (privilege change —
 * a token planted before authentication must not still be valid after).
 * Returns the new CSRF token so the caller can echo it in the JSON body:
 * the client's previously-cached token is now stale, and there's no other
 * cheap way for it to learn the new value since the cookie is set on this
 * same response.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): string {
  res.cookie('ropa_at', accessToken, {
    ...baseOptions,
    maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000,
  });
  res.cookie('ropa_rt', refreshToken, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  return setCsrfCookie(res);
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('ropa_at', baseOptions);
  res.clearCookie('ropa_rt', baseOptions);
}

export function setPreAuthCookie(res: Response, preAuthToken: string): string {
  res.cookie('ropa_pre', preAuthToken, {
    ...baseOptions,
    maxAge: env.PRE_AUTH_TOKEN_TTL_MIN * 60 * 1000,
  });
  return setCsrfCookie(res);
}

export function clearPreAuthCookie(res: Response) {
  res.clearCookie('ropa_pre', baseOptions);
}
