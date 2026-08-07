import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission('audit.view'),
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take) || 50, 200);
    const logs = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    res.json({ logs });
  })
);

export default router;
