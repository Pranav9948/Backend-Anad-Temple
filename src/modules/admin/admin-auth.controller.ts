import type { Request, Response, RequestHandler } from 'express';
import { adminAuthService } from '@/modules/admin/admin-auth.service.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';

export const sendOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { mobile } = req.body as { mobile: string };

    const result = await adminAuthService.sendOtp(mobile);

    sendSuccess(res, result, 'OTP sent successfully');
  },
);

export const resendOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { mobile } = req.body as { mobile: string };

    const result = await adminAuthService.resendOtp(mobile);

    sendSuccess(res, result, 'OTP resent successfully');
  },
);

export const verifyOtp: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { mobile, otp } = req.body as { mobile: string; otp: string };

    const result = await adminAuthService.verifyOtp(mobile, otp);

    sendSuccess(res, result, 'Login successful');
  },
);

export const refreshToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken: token } = req.body as { refreshToken: string };

    const tokens = await adminAuthService.refreshAccessToken(token);

    sendSuccess(res, tokens, 'Token refreshed successfully');
  },
);

export const getProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = req.user!.userId;

    const admin = await adminAuthService.getProfile(adminId);

    sendSuccess(res, admin, 'Admin profile retrieved successfully');
  },
);
