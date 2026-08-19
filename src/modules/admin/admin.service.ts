import type { Admin } from '@/generated/prisma/client.js';
import { AdminNotFoundError } from '@/domain/errors.js';
import {
  type AdminUpdateData,
  type IAdminRepository,
  adminRepository,
} from '@/modules/admin/admin.repository.js';

export interface IAdminService {
  getAdmin(id: string): Promise<Admin>;
  getAdminByEmail(email: string): Promise<Admin>;
  updateAdmin(id: string, data: AdminUpdateData): Promise<Admin>;
  verifyAdminExists(mobile: string): Promise<Admin>;
}

export class AdminService implements IAdminService {
  constructor(private readonly admins: IAdminRepository = adminRepository) {}

  async getAdmin(id: string): Promise<Admin> {
    const admin = await this.admins.findById(id);
    if (!admin) {
      throw new AdminNotFoundError(id);
    }
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin> {
    const admin = await this.admins.findByEmail(email);
    if (!admin) {
      throw new AdminNotFoundError(email);
    }
    return admin;
  }

  async updateAdmin(id: string, data: AdminUpdateData): Promise<Admin> {
    await this.getAdmin(id);
    return this.admins.update(id, data);
  }

  async verifyAdminExists(mobile: string): Promise<Admin> {
    const admin = await this.admins.findByMobile(mobile);
    if (!admin) {
      throw new AdminNotFoundError(mobile);
    }
    return admin;
  }
}

export const adminService = new AdminService();
