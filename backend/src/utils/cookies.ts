import type { Response } from 'express';
import { env, isProd } from '../config/env.js';

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('ropa_at', accessToken, {
    ...baseOptions,
    maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000,
  });
  res.cookie('ropa_rt', refreshToken, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('ropa_at', baseOptions);
  res.clearCookie('ropa_rt', baseOptions);
}

export function setPreAuthCookie(res: Response, preAuthToken: string) {
  res.cookie('ropa_pre', preAuthToken, {
    ...baseOptions,
    maxAge: env.PRE_AUTH_TOKEN_TTL_MIN * 60 * 1000,
  });
}

export function clearPreAuthCookie(res: Response) {
  res.clearCookie('ropa_pre', baseOptions);
}
