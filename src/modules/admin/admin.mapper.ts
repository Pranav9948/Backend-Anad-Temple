import type { Admin } from '@/generated/prisma/client.js';

export function toPublicAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name,
    mobile: admin.mobile,
    role: admin.role,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

export type PublicAdmin = ReturnType<typeof toPublicAdmin>;
