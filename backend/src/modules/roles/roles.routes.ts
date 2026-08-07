import { Router } from 'express';
import { z } from 'zod';
import * as rolesService from './roles.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/permissions',
  requireAnyPermission('roles.manage'),
  asyncHandler(async (_req, res) => {
    res.json({ permissions: await rolesService.listPermissions() });
  })
);

router.get(
  '/',
  requireAnyPermission('roles.manage', 'users.manage'),
  asyncHandler(async (_req, res) => {
    res.json({ roles: await rolesService.listRoles() });
  })
);

const createSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, underscore only'),
  nameTh: z.string().min(1),
  nameEn: z.string().min(1),
  nameZh: z.string().min(1),
  permissionCodes: z.array(z.string()).default([]),
});

router.post(
  '/',
  requireAnyPermission('roles.manage'),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const role = await rolesService.createRole(input);
    await logAudit({ userId: req.user!.id, action: 'role.create', entityType: 'Role', entityId: role.id, req });
    res.status(201).json({ role });
  })
);

const updateSchema = z.object({
  nameTh: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  permissionCodes: z.array(z.string()).optional(),
});

router.patch(
  '/:id',
  requireAnyPermission('roles.manage'),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const role = await rolesService.updateRole(req.params.id, input);
    await logAudit({
      userId: req.user!.id,
      action: 'role.update_permissions',
      entityType: 'Role',
      entityId: role.id,
      metadata: { permissionCodes: input.permissionCodes },
      req,
    });
    res.json({ role });
  })
);

router.delete(
  '/:id',
  requireAnyPermission('roles.manage'),
  asyncHandler(async (req, res) => {
    await rolesService.deleteRole(req.params.id);
    await logAudit({ userId: req.user!.id, action: 'role.delete', entityType: 'Role', entityId: req.params.id, req });
    res.json({ ok: true });
  })
);

export default router;
