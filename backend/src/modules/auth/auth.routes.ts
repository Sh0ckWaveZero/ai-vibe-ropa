import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../../utils/cookies.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { requireAuth } from '../../middleware/auth.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, req);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    await logAudit({ userId: result.user.id, action: 'auth.login', entityType: 'User', entityId: result.user.id, req });
    res.json({ user: result.user });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.ropa_rt;
    if (!rawRefreshToken) throw AppError.unauthorized('Missing refresh token', 'NO_REFRESH_TOKEN');
    const result = await authService.refresh(rawRefreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.ropa_rt;
    await authService.logout(rawRefreshToken);
    clearAuthCookies(res);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await authService.getMe(req.user!.id);
    res.json({ user: me });
  })
);

export default router;
