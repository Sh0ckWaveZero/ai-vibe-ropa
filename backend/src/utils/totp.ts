import crypto from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_KEY = Buffer.from(env.TOTP_ENCRYPTION_KEY, 'hex');

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join('.');
}

export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function buildQrCode(secretBase32: string, email: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
  const otpauthUrl = generateURI({ issuer: env.TWOFA_ISSUER, label: email, secret: secretBase32 });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { otpauthUrl, qrCodeDataUrl };
}

export async function verifyTotpCode(secretBase32: string, code: string): Promise<boolean> {
  try {
    const result = await verify({ secret: secretBase32, token: code, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}
