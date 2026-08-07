import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as auditService from './audit.service.js';

const router = Router();
router.use(requireAuth);
router.use(requireAnyPermission('audit.view'));

const listQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/entity-types',
  asyncHandler(async (_req, res) => {
    const entityTypes = await auditService.listDistinctEntityTypes();
    res.json({ entityTypes });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await auditService.listAuditLogs({
      entityType: query.entityType,
      action: query.action,
      createdFrom: query.createdFrom ? new Date(`${query.createdFrom}T00:00:00.000Z`) : undefined,
      createdTo: query.createdTo ? new Date(`${query.createdTo}T23:59:59.999Z`) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    res.json(result);
  })
);

export default router;
