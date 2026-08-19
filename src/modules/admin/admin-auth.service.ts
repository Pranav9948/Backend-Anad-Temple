import type { Admin } from '@/generated/prisma/client.js';
import { logger } from '@/core/logger.js';
import { Security } from '@/core/security.js';
import { UnauthorizedException } from '@/exceptions/exceptions.js';
import {
  type IAdminRepository,
  adminRepository,
} from '@/modules/admin/admin.repository.js';
import { toPublicAdmin, type PublicAdmin } from '@/modules/admin/admin.mapper.js';

export type AdminLoginResult = {
  admin: PublicAdmin;
  token: string;
};

export interface IAdminAuthService {
  login(email: string, password: string): Promise<AdminLoginResult>;
  getProfile(adminId: string): Promise<PublicAdmin>;
}

export class AdminAuthService implements IAdminAuthService {
  constructor(private readonly admins: IAdminRepository = adminRepository) {}

  async login(email: string, password: string): Promise<AdminLoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.admins.findByEmail(normalizedEmail);

    // Constant-ish failure path: always run a bcrypt compare when possible.
    const passwordHash = admin?.passwordHash ?? '!';
    const passwordMatches = await Security.comparePassword(
      password,
      passwordHash,
    );

    if (
      !admin ||
      !passwordMatches ||
      admin.role !== 'ADMIN' ||
      !admin.isAdmin ||
      admin.passwordHash === '!'
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.issueAdminToken(admin);

    logger.info(
      { adminId: admin.id, email: admin.email },
      'Admin login successful',
    );

    return {
      admin: toPublicAdmin(admin),
      token,
    };
  }

  async getProfile(adminId: string): Promise<PublicAdmin> {
    const admin = await this.admins.findById(adminId);
    if (!admin || admin.role !== 'ADMIN' || !admin.isAdmin) {
      throw new UnauthorizedException('Admin not found or inactive');
    }
    return toPublicAdmin(admin);
  }

  private issueAdminToken(admin: Admin): string {
    return Security.generateAdminToken({
      userId: admin.id,
      role: admin.role,
      isAdmin: admin.isAdmin,
      email: admin.email,
    });
  }
}

export const adminAuthService = new AdminAuthService();
