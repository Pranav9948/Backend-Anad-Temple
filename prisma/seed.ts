import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AdminRole } from '../src/generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN = {
  mobile: process.env.ADMIN_SEED_MOBILE ?? '9020602727',
  name: process.env.ADMIN_SEED_NAME ?? 'Temple Admin',
  role: AdminRole.ADMIN,
} as const;

async function main(): Promise<void> {
  const admin = await prisma.admin.upsert({
    where: { mobile: DEFAULT_ADMIN.mobile },
    update: {
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
    },
    create: {
      mobile: DEFAULT_ADMIN.mobile,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
    },
  });

  console.log(`Seeded default admin: ${admin.name} (${admin.mobile}, ${admin.role})`);
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
