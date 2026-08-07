import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as notificationsService from './notifications.service.js';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    res.json({ count });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationsService.markAllRead(req.user!.id);
    res.json({ ok: true });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await notificationsService.listNotifications(req.user!.id, query);
    res.json(result);
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await notificationsService.markRead(req.user!.id, req.params.id);
    res.json({ ok: true });
  })
);

export default router;
