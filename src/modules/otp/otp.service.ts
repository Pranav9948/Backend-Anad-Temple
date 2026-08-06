import type { OTP } from '@/generated/prisma/client.js';
import { OTPStatus } from '@/generated/prisma/client.js';
import {
  AdminNotFoundError,
  InvalidOTPError,
  OTPExpiredError,
  OTPMaxAttemptsError,
  OTPNotFoundError,
} from '@/domain/errors.js';
import { generateOtpValue, hashOtpValue } from '@/domain/helpers.js';
import { OTP_CONFIG } from '@/domain/otp.constants.js';
import {
  type IOtpRepository,
  otpRepository,
} from '@/modules/otp/otp.repository.js';
import {
  type IAdminRepository,
  adminRepository,
} from '@/modules/admin/admin.repository.js';

export type GeneratedOtpResult = {
  otpRecord: OTP;
  /** Plain OTP — for delivery by controller/SMS layer in Stage 6+. Not persisted. */
  plainOtp: string;
  expiresAt: Date;
};

export interface IOtpService {
  generateOTP(mobile: string): Promise<GeneratedOtpResult>;
  verifyOTP(mobile: string, otp: string): Promise<OTP>;
  resendOTP(mobile: string): Promise<GeneratedOtpResult>;
  expireOTP(mobile: string): Promise<void>;
}

export class OtpService implements IOtpService {
  constructor(
    private readonly otps: IOtpRepository = otpRepository,
    private readonly admins: IAdminRepository = adminRepository,
  ) {}

  async generateOTP(mobile: string): Promise<GeneratedOtpResult> {
    await this.ensureAdminMobile(mobile);

    await this.otps.expirePendingByMobile(mobile);

    const plainOtp = generateOtpValue(OTP_CONFIG.LENGTH);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    const otpRecord = await this.otps.create({
      mobile,
      otpHash: hashOtpValue(plainOtp),
      status: OTPStatus.PENDING,
      verified: false,
      attempts: 0,
      expiresAt,
    });

    return { otpRecord, plainOtp, expiresAt };
  }

  async verifyOTP(mobile: string, otp: string): Promise<OTP> {
    await this.ensureAdminMobile(mobile);

    const record = await this.otps.findPendingByMobile(mobile);
    if (!record) {
      throw new OTPNotFoundError(mobile);
    }

    if (this.isExpired(record.expiresAt)) {
      await this.otps.markAsExpired(record.id);
      throw new OTPExpiredError(mobile);
    }

    if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new OTPMaxAttemptsError(mobile);
    }

    const isValid = hashOtpValue(otp) === record.otpHash;

    if (!isValid) {
      await this.otps.incrementAttempts(record.id);
      throw new InvalidOTPError();
    }

    return this.otps.verify(record.id);
  }

  async resendOTP(mobile: string): Promise<GeneratedOtpResult> {
    await this.expireOTP(mobile);
    return this.generateOTP(mobile);
  }

  async expireOTP(mobile: string): Promise<void> {
    await this.otps.expirePendingByMobile(mobile);
  }

  private async ensureAdminMobile(mobile: string): Promise<void> {
    const admin = await this.admins.findByMobile(mobile);
    if (!admin) {
      throw new AdminNotFoundError(mobile);
    }
  }

  private isExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() <= Date.now();
  }
}

export const otpService = new OtpService();
