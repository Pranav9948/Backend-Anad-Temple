import type { OTP, Prisma } from '@/generated/prisma/client.js';
import { OTPStatus } from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';

export type OtpCreateData = Prisma.OTPCreateInput;
export type OtpUpdateData = Prisma.OTPUpdateInput;

export interface IOtpRepository {
  create(data: OtpCreateData): Promise<OTP>;
  findLatestByMobile(mobile: string): Promise<OTP | null>;
  findPendingByMobile(mobile: string): Promise<OTP | null>;
  verify(id: string): Promise<OTP>;
  markAsExpired(id: string): Promise<OTP>;
  expirePendingByMobile(mobile: string): Promise<Prisma.BatchPayload>;
  deleteExpired(before?: Date): Promise<Prisma.BatchPayload>;
  incrementAttempts(id: string): Promise<OTP>;
}

export class OtpRepository extends BaseRepository implements IOtpRepository {
  create(data: OtpCreateData): Promise<OTP> {
    return this.db.oTP.create({ data });
  }

  findLatestByMobile(mobile: string): Promise<OTP | null> {
    return this.db.oTP.findFirst({
      where: { mobile },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPendingByMobile(mobile: string): Promise<OTP | null> {
    return this.db.oTP.findFirst({
      where: { mobile, status: OTPStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verify(id: string): Promise<OTP> {
    try {
      return await this.db.oTP.update({
        where: { id },
        data: {
          status: OTPStatus.VERIFIED,
          verified: true,
        },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('OTP', id);
      }
      throw error;
    }
  }

  async markAsExpired(id: string): Promise<OTP> {
    try {
      return await this.db.oTP.update({
        where: { id },
        data: { status: OTPStatus.EXPIRED },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('OTP', id);
      }
      throw error;
    }
  }

  expirePendingByMobile(mobile: string): Promise<Prisma.BatchPayload> {
    return this.db.oTP.updateMany({
      where: { mobile, status: OTPStatus.PENDING },
      data: { status: OTPStatus.EXPIRED },
    });
  }

  deleteExpired(before: Date = new Date()): Promise<Prisma.BatchPayload> {
    return this.db.oTP.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: before } }, { status: OTPStatus.EXPIRED }],
      },
    });
  }

  async incrementAttempts(id: string): Promise<OTP> {
    try {
      return await this.db.oTP.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('OTP', id);
      }
      throw error;
    }
  }
}

export const otpRepository = new OtpRepository();
