import crypto from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { hashPassword, comparePassword } from './password.js';

// Excludes ambiguous characters (0/O, 1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_COUNT = 10;

function randomCode(): string {
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function normalize(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function looksLikeBackupCode(input: string): boolean {
  return /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(normalize(input));
}

export async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, randomCode);
  const hashes = await Promise.all(codes.map((code) => hashPassword(normalize(code))));

  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ]);

  return codes;
}

export async function consumeBackupCode(userId: string, rawCode: string): Promise<boolean> {
  const normalized = normalize(rawCode);
  const candidates = await prisma.backupCode.findMany({ where: { userId, usedAt: null } });

  for (const candidate of candidates) {
    if (await comparePassword(normalized, candidate.codeHash)) {
      await prisma.backupCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
      return true;
    }
  }

  return false;
}
