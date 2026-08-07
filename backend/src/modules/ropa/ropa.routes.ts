import { Router } from 'express';
import { z } from 'zod';
import * as ropaService from './ropa.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission('ropa.read_own', 'ropa.read_all'),
  asyncHandler(async (req, res) => {
    const records = await ropaService.listRopaRecords(req.user!, {
      departmentId: typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({ records });
  })
);

router.get(
  '/:id',
  requireAnyPermission('ropa.read_own', 'ropa.read_all'),
  asyncHandler(async (req, res) => {
    const record = await ropaService.getRopaRecord(req.user!, req.params.id);
    res.json({ record });
  })
);

const ropaInputSchema = z.object({
  departmentId: z.string().uuid(),
  activityName: z.string().min(1),
  purpose: z.string().min(1),
  legalBasis: z.string().min(1),
  controllerName: z.string().min(1),
  jointController: z.string().nullable().optional(),
  dataSubjectCategories: z.array(z.string()).default([]),
  dataCategories: z.array(z.string()).default([]),
  sensitiveDataCategories: z.array(z.string()).default([]),
  collectionSource: z.string().min(1),
  recipients: z.array(z.string()).default([]),
  hasCrossBorderTransfer: z.boolean().default(false),
  crossBorderDestination: z.string().nullable().optional(),
  crossBorderSafeguards: z.string().nullable().optional(),
  retentionPeriod: z.string().min(1),
  disposalMethod: z.string().min(1),
  securityMeasures: z.string().min(1),
  dpoContact: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

router.post(
  '/',
  requireAnyPermission('ropa.create'),
  asyncHandler(async (req, res) => {
    const input = ropaInputSchema.parse(req.body);
    const record = await ropaService.createRopaRecord(req.user!, input);
    await logAudit({ userId: req.user!.id, action: 'ropa.create', entityType: 'RopaRecord', entityId: record.id, req });
    res.status(201).json({ record });
  })
);

router.patch(
  '/:id',
  requireAnyPermission('ropa.update_own', 'ropa.update_all'),
  asyncHandler(async (req, res) => {
    const input = ropaInputSchema.partial().parse(req.body);
    const record = await ropaService.updateRopaRecord(req.user!, req.params.id, input);
    await logAudit({ userId: req.user!.id, action: 'ropa.update', entityType: 'RopaRecord', entityId: record.id, req });
    res.json({ record });
  })
);

router.delete(
  '/:id',
  requireAnyPermission('ropa.delete'),
  asyncHandler(async (req, res) => {
    await ropaService.deleteRopaRecord(req.user!, req.params.id);
    await logAudit({ userId: req.user!.id, action: 'ropa.delete', entityType: 'RopaRecord', entityId: req.params.id, req });
    res.json({ ok: true });
  })
);

router.post(
  '/:id/submit',
  requireAnyPermission('ropa.submit'),
  asyncHandler(async (req, res) => {
    const record = await ropaService.submitRopaRecord(req.user!, req.params.id);
    await logAudit({ userId: req.user!.id, action: 'ropa.submit', entityType: 'RopaRecord', entityId: record.id, req });
    res.json({ record });
  })
);

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(1).optional(),
});

router.post(
  '/:id/review',
  requireAnyPermission('ropa.approve'),
  asyncHandler(async (req, res) => {
    const { decision, rejectionReason } = reviewSchema.parse(req.body);
    const record = await ropaService.reviewRopaRecord(req.user!, req.params.id, decision, rejectionReason);
    await logAudit({
      userId: req.user!.id,
      action: decision === 'approve' ? 'ropa.approve' : 'ropa.reject',
      entityType: 'RopaRecord',
      entityId: record.id,
      metadata: { rejectionReason },
      req,
    });
    res.json({ record });
  })
);

export default router;
