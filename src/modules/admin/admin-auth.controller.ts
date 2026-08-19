import type { Request, Response, RequestHandler } from 'express';
import { adminAuthService } from '@/modules/admin/admin-auth.service.js';
import {
  clearAdminAuthCookie,
  setAdminAuthCookie,
} from '@/core/admin-cookie.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';

export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const result = await adminAuthService.login(email, password);

    setAdminAuthCookie(res, result.token);

    sendSuccess(
      res,
      { admin: result.admin },
      'Login successful',
    );
  },
);

export const logout: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    clearAdminAuthCookie(res);
    sendSuccess(res, null, 'Logged out successfully');
  },
);

export const getProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const admin = await adminAuthService.getProfile(adminId);
    sendSuccess(res, admin, 'Admin profile retrieved successfully');
  },
);
