import { z } from 'zod';
import { isValidIndianMobile, normalizeIndianMobile } from '@/utils/mobile.util.js';

export const adminMobileSchema = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine(isValidIndianMobile, 'Mobile must be a valid Indian number (+91)');

export const normalizedAdminMobileSchema = adminMobileSchema.transform(
  normalizeIndianMobile,
);

export const sendOtpSchema = z.object({
  body: z.object({
    mobile: adminMobileSchema,
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    mobile: adminMobileSchema,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
  }),
});

export const resendOtpSchema = sendOtpSchema;

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
