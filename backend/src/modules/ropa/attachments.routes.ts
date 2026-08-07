import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { logAudit } from '../../utils/audit.js';
import { env } from '../../config/env.js';
import * as ropaService from './ropa.service.js';
import * as attachmentsService from './attachments.service.js';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      attachmentsService
        .ensureRecordUploadDir(req.params.id)
        .then((dir) => cb(null, dir))
        .catch((err) => cb(err as Error, ''));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${attachmentsService.ALLOWED_EXTENSIONS.has(ext) ? ext : ''}`);
    },
  }),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!attachmentsService.ALLOWED_EXTENSIONS.has(ext)) {
      cb(AppError.badRequest('File type not allowed', 'FILE_TYPE_NOT_ALLOWED'));
      return;
    }
    cb(null, true);
  },
});

/** RFC 6266/5987 — strip control chars and provide both a plain and UTF-8-encoded filename. */
function contentDispositionHeader(fileName: string): string {
  const cleaned = fileName.replace(/[\r\n"]/g, '_');
  const asciiFallback = cleaned.replace(/[^\x20-\x7e]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}

router.get(
  '/',
  requireAnyPermission('ropa.read_own', 'ropa.read_all'),
  asyncHandler(async (req, res) => {
    await ropaService.getRopaRecord(req.user!, req.params.id);
    const attachments = await attachmentsService.listAttachments(req.params.id);
    res.json({ attachments });
  })
);

router.post(
  '/',
  requireAnyPermission('ropa.update_own', 'ropa.update_all'),
  asyncHandler(async (req, res, next) => {
    await ropaService.getMutableRopaRecord(req.user!, req.params.id);
    next();
  }),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          next(AppError.badRequest(`File exceeds the ${env.MAX_UPLOAD_SIZE_MB}MB limit`, 'FILE_TOO_LARGE'));
          return;
        }
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest('No file uploaded');

    const attachment = await attachmentsService.createAttachment({
      ropaRecordId: req.params.id,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedById: req.user!.id,
    });

    await logAudit({
      userId: req.user!.id,
      action: 'ropa.attachment_upload',
      entityType: 'RopaAttachment',
      entityId: attachment.id,
      metadata: { ropaRecordId: req.params.id, fileName: attachment.fileName },
      req,
    });

    res.status(201).json({ attachment });
  })
);

router.get(
  '/:attachmentId/download',
  requireAnyPermission('ropa.read_own', 'ropa.read_all'),
  asyncHandler(async (req, res) => {
    await ropaService.getRopaRecord(req.user!, req.params.id);
    const attachment = await attachmentsService.getAttachment(req.params.id, req.params.attachmentId);
    const filePath = attachmentsService.resolveStoredPath(req.params.id, attachment.storedName);

    res.setHeader('Content-Disposition', contentDispositionHeader(attachment.fileName));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: { message: 'File not found on disk' } });
      }
    });
  })
);

router.delete(
  '/:attachmentId',
  requireAnyPermission('ropa.update_own', 'ropa.update_all'),
  asyncHandler(async (req, res) => {
    await ropaService.getMutableRopaRecord(req.user!, req.params.id);
    const attachment = await attachmentsService.deleteAttachment(req.params.id, req.params.attachmentId);

    await logAudit({
      userId: req.user!.id,
      action: 'ropa.attachment_delete',
      entityType: 'RopaAttachment',
      entityId: attachment.id,
      metadata: { ropaRecordId: req.params.id, fileName: attachment.fileName },
      req,
    });

    res.json({ ok: true });
  })
);

export default router;
