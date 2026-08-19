import pg from 'pg';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AdminRole } from '../src/generated/prisma/client.js';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const BCRYPT_ROUNDS = 12;

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_DIRECT_URL?.trim() || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

type AdminSeed = {
  email: string;
  password: string;
  name: string;
  mobile: string | null;
  role: AdminRole;
  isAdmin: true;
};

function resolveAdminSeed(): AdminSeed {
  const isProduction =
    (process.env.NODE_ENV ?? '').toLowerCase() === 'production';

  const rawEmail =
    process.env.ADMIN_SEED_EMAIL?.trim() ||
    process.env.TEMPLE_ADMIN_EMAIL?.trim();
  const rawPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
  const rawName = process.env.ADMIN_SEED_NAME?.trim();
  const rawMobile = process.env.ADMIN_SEED_MOBILE?.trim();

  if (isProduction && (!rawEmail || !rawPassword)) {
    throw new Error(
      'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required when seeding in production.',
    );
  }

  const email = (rawEmail || 'admin@anadchamundidevi.org').toLowerCase();
  const password = rawPassword || 'ChangeMeAdmin!123';
  const name = rawName || 'Temple Admin';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid ADMIN_SEED_EMAIL "${email}".`);
  }

  if (password.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters.');
  }

  if (!name || name.length > 255) {
    throw new Error('ADMIN_SEED_NAME must be 1–255 characters.');
  }

  let mobile: string | null = null;
  if (rawMobile) {
    mobile = normalizeIndianMobile(rawMobile);
    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      throw new Error(
        `Invalid ADMIN_SEED_MOBILE "${rawMobile}". Expected a 10-digit Indian mobile.`,
      );
    }
  }

  return {
    email,
    password,
    name,
    mobile,
    role: AdminRole.ADMIN,
    isAdmin: true,
  };
}

async function main(): Promise<void> {
  const seed = resolveAdminSeed();
  const passwordHash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);

  const existingByEmail = await prisma.admin.findUnique({
    where: { email: seed.email },
  });

  const existingByMobile =
    !existingByEmail && seed.mobile
      ? await prisma.admin.findUnique({ where: { mobile: seed.mobile } })
      : null;

  let admin;

  if (existingByEmail) {
    admin = await prisma.admin.update({
      where: { id: existingByEmail.id },
      data: {
        name: seed.name,
        passwordHash,
        role: seed.role,
        isAdmin: seed.isAdmin,
        ...(seed.mobile ? { mobile: seed.mobile } : {}),
      },
    });
  } else if (existingByMobile) {
    admin = await prisma.admin.update({
      where: { id: existingByMobile.id },
      data: {
        email: seed.email,
        name: seed.name,
        passwordHash,
        role: seed.role,
        isAdmin: seed.isAdmin,
      },
    });
  } else {
    admin = await prisma.admin.create({
      data: {
        email: seed.email,
        name: seed.name,
        passwordHash,
        mobile: seed.mobile,
        role: seed.role,
        isAdmin: seed.isAdmin,
      },
    });
  }

  console.log(
    `Seeded admin: name="${admin.name}" email=${admin.email} role=${admin.role} isAdmin=${admin.isAdmin} id=${admin.id}`,
  );
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
