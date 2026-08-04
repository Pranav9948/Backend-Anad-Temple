import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AdminRole } from '../src/generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN = {
  email: process.env.ADMIN_SEED_EMAIL ?? 'admin@temple.local',
  name: process.env.ADMIN_SEED_NAME ?? 'Temple Admin',
  role: AdminRole.SUPER_ADMIN,
} as const;

async function main(): Promise<void> {
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!seedPassword) {
    throw new Error(
      'ADMIN_SEED_PASSWORD is required to seed the default admin. ' +
        'Set it in .env.development (never commit real passwords).',
    );
  }

  if (seedPassword.length < 10) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 10 characters.');
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: {
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
      passwordHash,
      isActive: true,
    },
    create: {
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`Seeded default admin: ${admin.email} (${admin.role})`);
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
