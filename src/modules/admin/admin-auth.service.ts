import type { Admin } from '@/generated/prisma/client.js';
import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import { OTP_CONFIG } from '@/domain/otp.constants.js';
import { Security } from '@/core/security.js';
import {
  type IAdminService,
  adminService,
} from '@/modules/admin/admin.service.js';
import { toPublicAdmin, type PublicAdmin } from '@/modules/admin/admin.mapper.js';
import {
  type INotificationService,
  notificationService,
} from '@/modules/notification/notification.service.js';
import {
  type IOtpService,
  otpService,
} from '@/modules/otp/otp.service.js';
import { normalizeIndianMobile } from '@/utils/mobile.util.js';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
};

export type SendOtpResult = {
  mobile: string;
  expiresAt: Date;
  message: string;
  devOtp?: string;
};

export type VerifyOtpResult = AuthTokens & {
  admin: PublicAdmin;
};

export interface IAdminAuthService {
  sendOtp(mobile: string): Promise<SendOtpResult>;
  resendOtp(mobile: string): Promise<SendOtpResult>;
  verifyOtp(mobile: string, otp: string): Promise<VerifyOtpResult>;
  refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
  getProfile(adminId: string): Promise<PublicAdmin>;
}

export class AdminAuthService implements IAdminAuthService {
  constructor(
    private readonly otps: IOtpService = otpService,
    private readonly admins: IAdminService = adminService,
    private readonly notifications: INotificationService = notificationService,
  ) {}

  async sendOtp(mobile: string): Promise<SendOtpResult> {
    const normalizedMobile = normalizeIndianMobile(mobile);

    const { plainOtp, expiresAt } = await this.otps.generateOTP(normalizedMobile);

    void this.notifications.notifyAdminOtp(plainOtp, OTP_CONFIG.EXPIRY_MINUTES);

    logger.info({ mobile: normalizedMobile }, 'Admin OTP generated');

    return this.buildSendOtpResult(normalizedMobile, expiresAt, plainOtp);
  }

  async resendOtp(mobile: string): Promise<SendOtpResult> {
    const normalizedMobile = normalizeIndianMobile(mobile);

    const { plainOtp, expiresAt } = await this.otps.resendOTP(normalizedMobile);

    void this.notifications.notifyAdminOtp(plainOtp, OTP_CONFIG.EXPIRY_MINUTES);

    logger.info({ mobile: normalizedMobile }, 'Admin OTP resent');

    return this.buildSendOtpResult(normalizedMobile, expiresAt, plainOtp);
  }

  async verifyOtp(mobile: string, otp: string): Promise<VerifyOtpResult> {
    const normalizedMobile = normalizeIndianMobile(mobile);

    await this.otps.verifyOTP(normalizedMobile, otp);

    const admin = await this.admins.verifyAdminExists(normalizedMobile);
    const tokens = this.issueTokens(admin);

    logger.info({ adminId: admin.id, mobile: normalizedMobile }, 'Admin login successful');

    return {
      ...tokens,
      admin: toPublicAdmin(admin),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const payload = Security.verifyRefreshToken(refreshToken);
    const admin = await this.admins.getAdmin(payload.userId);

    return this.issueTokens(admin);
  }

  async getProfile(adminId: string): Promise<PublicAdmin> {
    const admin = await this.admins.getAdmin(adminId);
    return toPublicAdmin(admin);
  }

  private issueTokens(admin: Admin): AuthTokens {
    const accessToken = Security.generateAccessToken({
      userId: admin.id,
      role: admin.role,
    });

    const refreshToken = Security.generateRefreshToken({
      userId: admin.id,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
    };
  }

  private buildSendOtpResult(
    mobile: string,
    expiresAt: Date,
    plainOtp: string,
  ): SendOtpResult {
    const result: SendOtpResult = {
      mobile,
      expiresAt,
      message: 'OTP sent to temple admin WhatsApp number',
    };

    if (config.NODE_ENV === 'development') {
      result.devOtp = plainOtp;
    }

    return result;
  }
}

export const adminAuthService = new AdminAuthService();
