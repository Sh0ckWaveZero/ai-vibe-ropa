import { Router } from 'express';
import { z } from 'zod';
import * as departmentsService from './departments.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ departments: await departmentsService.listDepartments() });
  })
);

const createSchema = z.object({
  code: z.string().min(1).max(20),
  nameTh: z.string().min(1),
  nameEn: z.string().min(1),
  nameZh: z.string().min(1),
});

router.post(
  '/',
  requireAnyPermission('departments.manage'),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const dept = await departmentsService.createDepartment(input);
    await logAudit({ userId: req.user!.id, action: 'department.create', entityType: 'Department', entityId: dept.id, req });
    res.status(201).json({ department: dept });
  })
);

const updateSchema = z.object({
  nameTh: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/:id',
  requireAnyPermission('departments.manage'),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const dept = await departmentsService.updateDepartment(req.params.id, input);
    await logAudit({ userId: req.user!.id, action: 'department.update', entityType: 'Department', entityId: dept.id, req });
    res.json({ department: dept });
  })
);

router.delete(
  '/:id',
  requireAnyPermission('departments.manage'),
  asyncHandler(async (req, res) => {
    await departmentsService.deleteDepartment(req.params.id);
    await logAudit({ userId: req.user!.id, action: 'department.delete', entityType: 'Department', entityId: req.params.id, req });
    res.json({ ok: true });
  })
);

export default router;
