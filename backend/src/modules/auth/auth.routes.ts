import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import { setAuthCookies, clearAuthCookies, setPreAuthCookie, clearPreAuthCookie } from '../../utils/cookies.js';
import { setCsrfCookie, CSRF_COOKIE } from '../../utils/csrf.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePreAuth } from '../../middleware/requirePreAuth.js';
import { loginLimiter, twoFaLimiter } from '../../middleware/rateLimit.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();

// Public, safe (GET) — lets the frontend obtain a CSRF token before it has
// any session at all (e.g. on the login page). The double-submit cookie
// this sets is re-issued on every login/2FA-completion/refresh too.
router.get('/csrf-token', (_req, res) => {
  const csrfToken = setCsrfCookie(res);
  res.json({ csrfToken });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    const csrfToken = setPreAuthCookie(res, result.preAuthToken);
    await logAudit({ action: 'auth.login_password_verified', entityType: 'User', metadata: { email }, req });
    res.json({ stage: result.stage, csrfToken });
  })
);

router.post(
  '/2fa/setup',
  requirePreAuth('setup'),
  asyncHandler(async (req, res) => {
    const result = await authService.startTotpSetup(req.preAuthUserId!);
    res.json(result);
  })
);

const codeSchema = z.object({ code: z.string().min(1).max(16) });

router.post(
  '/2fa/setup/confirm',
  twoFaLimiter,
  requirePreAuth('setup'),
  asyncHandler(async (req, res) => {
    const { code } = codeSchema.parse(req.body);
    const userId = req.preAuthUserId!;
    const result = await authService.confirmTotpSetup(userId, code);
    clearPreAuthCookie(res);
    const csrfToken = setAuthCookies(res, result.accessToken, result.refreshToken);
    await logAudit({ userId, action: 'auth.2fa_setup_complete', entityType: 'User', entityId: userId, req });
    res.json({ stage: 'complete', user: result.user, backupCodes: result.backupCodes, csrfToken });
  })
);

router.post(
  '/2fa/verify',
  twoFaLimiter,
  requirePreAuth('verify'),
  asyncHandler(async (req, res) => {
    const { code } = codeSchema.parse(req.body);
    const userId = req.preAuthUserId!;
    const result = await authService.verifyTotpOrBackupCode(userId, code);
    clearPreAuthCookie(res);
    const csrfToken = setAuthCookies(res, result.accessToken, result.refreshToken);
    await logAudit({ userId, action: 'auth.2fa_verify_success', entityType: 'User', entityId: userId, req });
    res.json({ stage: 'complete', user: result.user, csrfToken });
  })
);

router.post(
  '/2fa/backup-codes/regenerate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const backupCodes = await authService.regenerateBackupCodes(req.user!.id);
    await logAudit({ userId: req.user!.id, action: 'auth.backup_codes_regenerated', entityType: 'User', entityId: req.user!.id, req });
    res.json({ backupCodes });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.ropa_rt;
    if (!rawRefreshToken) throw AppError.unauthorized('Missing refresh token', 'NO_REFRESH_TOKEN');
    const result = await authService.refresh(rawRefreshToken);
    const csrfToken = setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true, csrfToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.ropa_rt;
    await authService.logout(rawRefreshToken);
    clearAuthCookies(res);
    res.clearCookie(CSRF_COOKIE, { path: '/' });
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
