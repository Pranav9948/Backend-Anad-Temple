import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { validate } from '@/middlewares/validate.middleware.js';
import { authenticate } from '@/middlewares/auth.middleware.js';
import { loginLimiter, authLimiter } from '@/core/rate-limit.js';
import * as adminAuthController from '@/modules/admin/admin-auth.controller.js';
import {
  refreshTokenSchema,
  resendOtpSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '@/modules/admin/admin-auth.validation.js';

const router: ExpressRouter = Router();

router.post(
  '/send-otp',
  loginLimiter,
  validate(sendOtpSchema),
  adminAuthController.sendOtp,
);

router.post(
  '/resend-otp',
  loginLimiter,
  validate(resendOtpSchema),
  adminAuthController.resendOtp,
);

router.post(
  '/verify-otp',
  loginLimiter,
  validate(verifyOtpSchema),
  adminAuthController.verifyOtp,
);

router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  adminAuthController.refreshToken,
);

router.get('/me', authenticate, adminAuthController.getProfile);

export default router;
