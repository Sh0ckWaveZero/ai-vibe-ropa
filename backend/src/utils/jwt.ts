import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  roleCode: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

export type PreAuthStage = 'setup' | 'verify';

export interface PreAuthTokenPayload {
  sub: string;
  stage: PreAuthStage;
  typ: 'pre_auth';
}

// Signed with its own secret (never ACCESS_TOKEN_SECRET) so a leaked
// short-lived pre-auth token can never be replayed as a full session token.
export function signPreAuthToken(sub: string, stage: PreAuthStage): string {
  const payload: PreAuthTokenPayload = { sub, stage, typ: 'pre_auth' };
  return jwt.sign(payload, env.PRE_AUTH_TOKEN_SECRET, {
    expiresIn: `${env.PRE_AUTH_TOKEN_TTL_MIN}m`,
  });
}

export function verifyPreAuthToken(token: string): PreAuthTokenPayload {
  return jwt.verify(token, env.PRE_AUTH_TOKEN_SECRET) as PreAuthTokenPayload;
}

export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { raw, hash, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
