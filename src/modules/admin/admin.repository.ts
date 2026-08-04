import type {
  Admin,
  Prisma,
} from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';

export type AdminCreateData = Prisma.AdminCreateInput;
export type AdminUpdateData = Prisma.AdminUpdateInput;

export interface IAdminRepository {
  create(data: AdminCreateData): Promise<Admin>;
  findById(id: string): Promise<Admin | null>;
  findByMobile(mobile: string): Promise<Admin | null>;
  update(id: string, data: AdminUpdateData): Promise<Admin>;
  delete(id: string): Promise<Admin>;
}

export class AdminRepository extends BaseRepository implements IAdminRepository {
  create(data: AdminCreateData): Promise<Admin> {
    return this.db.admin.create({ data });
  }

  findById(id: string): Promise<Admin | null> {
    return this.db.admin.findUnique({ where: { id } });
  }

  findByMobile(mobile: string): Promise<Admin | null> {
    return this.db.admin.findUnique({ where: { mobile } });
  }

  async update(id: string, data: AdminUpdateData): Promise<Admin> {
    try {
      return await this.db.admin.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Admin', id);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<Admin> {
    try {
      return await this.db.admin.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Admin', id);
      }
      throw error;
    }
  }
}

export const adminRepository = new AdminRepository();
