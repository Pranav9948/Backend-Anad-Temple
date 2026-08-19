import type { Admin } from '@/generated/prisma/client.js';

/** Public admin shape — never includes passwordHash. */
export function toPublicAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile,
    role: admin.role,
    isAdmin: admin.isAdmin,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

export type PublicAdmin = ReturnType<typeof toPublicAdmin>;
