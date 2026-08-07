import { Router } from 'express';
import { z } from 'zod';
import * as usersService from './users.service.js';
import * as authService from '../auth/auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission('users.manage'),
  asyncHandler(async (_req, res) => {
    const users = await usersService.listUsers();
    res.json({ users });
  })
);

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  localePref: z.enum(['th', 'en', 'zh']).optional(),
});

router.post(
  '/',
  requireAnyPermission('users.manage'),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const user = await usersService.createUser(input);
    await logAudit({ userId: req.user!.id, action: 'user.create', entityType: 'User', entityId: user.id, req });
    res.status(201).json({ user });
  })
);

// NOTE: /me routes must be registered before /:id so "me" isn't captured as an :id param.
const updateSelfSchema = z.object({
  fullName: z.string().min(1).optional(),
  localePref: z.enum(['th', 'en', 'zh']).optional(),
});

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const input = updateSelfSchema.parse(req.body);
    const user = await usersService.updateSelf(req.user!.id, input);
    res.json({ user });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  '/me/change-password',
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await usersService.changeOwnPassword(req.user!.id, currentPassword, newPassword);
    res.json({ ok: true });
  })
);

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/:id',
  requireAnyPermission('users.manage'),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id, input);
    await logAudit({ userId: req.user!.id, action: 'user.update', entityType: 'User', entityId: user.id, metadata: input, req });
    res.json({ user });
  })
);

const resetPasswordSchema = z.object({ newPassword: z.string().min(8) });

router.post(
  '/:id/reset-password',
  requireAnyPermission('users.manage'),
  asyncHandler(async (req, res) => {
    const { newPassword } = resetPasswordSchema.parse(req.body);
    await usersService.resetPassword(req.params.id, newPassword);
    await logAudit({ userId: req.user!.id, action: 'user.reset_password', entityType: 'User', entityId: req.params.id, req });
    res.json({ ok: true });
  })
);

router.post(
  '/:id/reset-2fa',
  requireAnyPermission('users.manage'),
  asyncHandler(async (req, res) => {
    await authService.adminResetTwoFactor(req.params.id);
    await logAudit({ userId: req.user!.id, action: 'auth.admin_2fa_reset', entityType: 'User', entityId: req.params.id, req });
    res.json({ ok: true });
  })
);

export default router;
