import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { env } from '../../config/env.js';

const uploadRoot = path.resolve(env.UPLOAD_DIR);

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
]);

function recordUploadDir(ropaRecordId: string): string {
  return path.join(uploadRoot, ropaRecordId);
}

export async function ensureRecordUploadDir(ropaRecordId: string): Promise<string> {
  const dir = recordUploadDir(ropaRecordId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * storedName is always a server-generated UUID (+ allowlisted extension),
 * never derived from the client-supplied original filename — this resolve
 * is defense in depth confirming that invariant, not a real traversal guard
 * on user input.
 */
export function resolveStoredPath(ropaRecordId: string, storedName: string): string {
  const dir = recordUploadDir(ropaRecordId);
  const resolved = path.resolve(dir, storedName);
  if (resolved !== path.join(dir, storedName) || !resolved.startsWith(dir + path.sep)) {
    throw AppError.badRequest('Invalid attachment path');
  }
  return resolved;
}

export async function listAttachments(ropaRecordId: string) {
  return prisma.ropaAttachment.findMany({
    where: { ropaRecordId },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  });
}

export async function createAttachment(input: {
  ropaRecordId: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}) {
  return prisma.ropaAttachment.create({
    data: input,
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  });
}

export async function getAttachment(ropaRecordId: string, attachmentId: string) {
  const attachment = await prisma.ropaAttachment.findFirst({
    where: { id: attachmentId, ropaRecordId },
  });
  if (!attachment) throw AppError.notFound('Attachment not found');
  return attachment;
}

export async function deleteAttachment(ropaRecordId: string, attachmentId: string) {
  const attachment = await getAttachment(ropaRecordId, attachmentId);
  await prisma.ropaAttachment.delete({ where: { id: attachmentId } });
  const filePath = resolveStoredPath(ropaRecordId, attachment.storedName);
  await fs.rm(filePath, { force: true });
  return attachment;
}
