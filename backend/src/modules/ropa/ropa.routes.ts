import { Router, type Request } from 'express';
import { z } from 'zod';
import * as ropaService from './ropa.service.js';
import * as departmentsService from '../departments/departments.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/audit.js';
import { buildRopaExcelWorkbook } from '../../utils/exportExcel.js';
import { buildRopaPdfSummary } from '../../utils/exportPdf.js';

const router = Router();
router.use(requireAuth);

function parseDateRange(fromStr?: string, toStr?: string) {
  return {
    createdFrom: fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : undefined,
    createdTo: toStr ? new Date(`${toStr}T23:59:59.999Z`) : undefined,
  };
}

function sanitizeFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

const listQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
});

router.get(
  '/',
  requireAnyPermission('ropa.read_own', 'ropa.read_all'),
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const records = await ropaService.listRopaRecords(req.user!, {
      ...query,
      ...parseDateRange(query.createdFrom, query.createdTo),
    });
    res.json({ records });
  })
);

const exportQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
});

async function resolveExportScope(req: Request, query: z.infer<typeof exportQuerySchema>) {
  const records = await ropaService.listRopaRecords(req.user!, {
    departmentId: query.departmentId,
    status: query.status,
    ...parseDateRange(query.createdFrom, query.createdTo),
  });

  let scopeLabel = 'All departments (within your access)';
  if (query.departmentId) {
    const departments = await departmentsService.listDepartments();
    const dept = departments.find((d) => d.id === query.departmentId);
    if (dept) scopeLabel = `${dept.code} — ${dept.nameEn}`;
  } else if (!req.user!.permissions.includes('ropa.read_all')) {
    const departments = await departmentsService.listDepartments();
    const dept = departments.find((d) => d.id === req.user!.departmentId);
    scopeLabel = dept ? `${dept.code} — ${dept.nameEn}` : 'Own department';
  }

  return { records, scopeLabel };
}

router.get(
  '/export/excel',
  requireAnyPermission('ropa.export'),
  asyncHandler(async (req, res) => {
    const query = exportQuerySchema.parse(req.query);
    const { records } = await resolveExportScope(req, query);

    const buffer = await buildRopaExcelWorkbook(records);
    const filename = `ropa-export-${sanitizeFilenameSegment(new Date().toISOString().slice(0, 10))}.xlsx`;

    await logAudit({
      userId: req.user!.id,
      action: 'ropa.export_excel',
      entityType: 'RopaRecord',
      metadata: { count: records.length, ...query },
      req,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

router.get(
  '/export/pdf',
  requireAnyPermission('ropa.export'),
  asyncHandler(async (req, res) => {
    const query = exportQuerySchema.parse(req.query);
    const { records, scopeLabel } = await resolveExportScope(req, query);

    const buffer = await buildRopaPdfSummary(records, {
      scopeLabel,
      statusLabel: query.status ?? 'All statuses',
      dateRangeLabel:
        query.createdFrom || query.createdTo
          ? `${query.createdFrom ?? '...'} to ${query.createdTo ?? '...'}`
          : 'All time',
      generatedBy: req.user!.fullName,
    });
    const filename = `ropa-summary-${sanitizeFilenameSegment(new Date().toISOString().slice(0, 10))}.pdf`;

    await logAudit({
      userId: req.user!.id,
      action: 'ropa.export_pdf',
      entityType: 'RopaRecord',
      metadata: { count: records.length, ...query },
      req,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
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
