import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { validate } from '@/middlewares/validate.middleware.js';
import { protectAdmin } from '@/middlewares/auth.middleware.js';
import { loginLimiter } from '@/core/rate-limit.js';
import * as adminAuthController from '@/modules/admin/admin-auth.controller.js';
import { adminLoginSchema } from '@/modules/admin/admin-auth.validation.js';

/**
 * Public admin session routes.
 * Mounted at `/api/admin` → POST /api/admin/login|logout
 * Also remounted under `/api/v1/admin` for versioned clients.
 */
const router: ExpressRouter = Router();

router.post(
  '/login',
  loginLimiter,
  validate(adminLoginSchema),
  adminAuthController.login,
);

router.post('/logout', adminAuthController.logout);

router.get('/me', protectAdmin, adminAuthController.getProfile);

export default router;
