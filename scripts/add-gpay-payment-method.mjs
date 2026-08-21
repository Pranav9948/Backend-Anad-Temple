import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.development'), override: true });

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error('DATABASE_URL is missing in .env.development');
}

const migrationName = '20260820000000_add_gpay_payment_method';
const migrationSqlPath = path.join(
  root,
  'prisma',
  'migrations',
  migrationName,
  'migration.sql',
);

function hostLabel(url) {
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace(/^\//, '') || '(none)';
    return `${parsed.hostname}:${parsed.port || '5432'}/${db}`;
  } catch {
    return '(unparseable)';
  }
}

async function listPaymentMethods(client) {
  const result = await client.query(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod'
    ORDER BY e.enumsortorder
  `);
  return result.rows.map((row) => row.enumlabel);
}

async function stampPrismaMigration(client) {
  const table = await client.query(`
    SELECT to_regclass('public._prisma_migrations') AS name
  `);
  if (!table.rows[0]?.name) {
    console.log('No _prisma_migrations table; skipped migration stamp.');
    return;
  }

  const existing = await client.query(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1`,
    [migrationName],
  );
  if (existing.rowCount > 0) {
    console.log(`Migration ${migrationName} is already recorded.`);
    return;
  }

  const sql = fs.readFileSync(migrationSqlPath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');

  await client.query(
    `
      INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES
        (gen_random_uuid()::text, $1, NOW(), $2, NULL, NULL, NOW(), 1)
    `,
    [checksum, migrationName],
  );
  console.log(`Recorded Prisma migration ${migrationName}.`);
}

const client = new pg.Client({ connectionString });

await client.connect();
console.log(`Connected to ${hostLabel(connectionString)}`);

try {
  const before = await listPaymentMethods(client);
  console.log('PaymentMethod before:', before.join(', ') || '(none)');

  if (before.includes('GPAY')) {
    console.log('GPAY already exists on PaymentMethod.');
  } else {
    await client.query(
      `ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'GPAY'`,
    );
    const after = await listPaymentMethods(client);
    console.log('PaymentMethod after:', after.join(', '));
  }

  await stampPrismaMigration(client);
} finally {
  await client.end();
}
