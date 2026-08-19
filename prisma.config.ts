import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

type AppEnv = 'development' | 'production' | 'test';

/**
 * Explicit Prisma CLI environment selection.
 *
 * Priority:
 * 1) PRISMA_ENV   (recommended for migrate commands)
 * 2) NODE_ENV
 * 3) development  (safe local default)
 *
 * Examples (PowerShell):
 *   $env:PRISMA_ENV="development"; npx prisma migrate status
 *   $env:PRISMA_ENV="production";  npx prisma migrate deploy
 */
function resolveAppEnv(): AppEnv {
  const raw = (process.env.PRISMA_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();

  if (raw === 'production' || raw === 'test' || raw === 'development') {
    return raw;
  }

  return 'development';
}

function envFilenameFor(appEnv: AppEnv): string {
  if (appEnv === 'test') return '.env.test';
  if (appEnv === 'production') return '.env.production';
  return '.env.development';
}

function redactDatabaseTarget(url: string | undefined): string {
  if (!url) return '(not set)';
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace(/^\//, '') || '(none)';
    return `${parsed.hostname}:${parsed.port || '5432'}/${db}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

/**
 * Prisma's Windows migration engine often omits TLS SNI.
 * Neon then cannot route the connection and reports P1001, even though
 * the Neon SQL Editor (browser) works.
 *
 * See https://neon.com/docs/connect/connection-errors#the-endpoint-id-is-not-specified
 */
function preparePrismaDatasourceUrl(
  url: string | undefined,
): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    const isNeon = parsed.hostname.includes('neon.tech');

    parsed.searchParams.delete('channel_binding');
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '30');
    }

    if (isNeon) {
      const hostLabel = parsed.hostname.split('.')[0] ?? '';
      const endpointId = hostLabel.replace(/-pooler$/, '');

      if (endpointId.startsWith('ep-')) {
        if (!parsed.searchParams.get('options')?.includes('endpoint=')) {
          parsed.searchParams.set('options', `endpoint=${endpointId}`);
        }
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function loadEnvFile(appEnv: AppEnv): string | null {
  const filename = envFilenameFor(appEnv);
  const envPath = path.resolve(process.cwd(), filename);

  // Runtime env (ECS/App Runner/CI) always wins over file values.
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    return filename;
  }

  // Production containers typically have no .env.production file; ECS injects vars.
  dotenv.config({ override: false });
  return null;
}

const appEnv = resolveAppEnv();
const loadedFrom = loadEnvFile(appEnv);

// Prefer direct DB URL for migrations/DDL when available (pooler is for app runtime).
const datasourceUrl = preparePrismaDatasourceUrl(
  process.env.DATABASE_DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined,
);

const urlSource = process.env.DATABASE_DIRECT_URL?.trim()
  ? 'DATABASE_DIRECT_URL'
  : 'DATABASE_URL';

// Visible guardrail so migrate commands cannot silently target the wrong DB.
// eslint-disable-next-line no-console
console.info(
  `[prisma.config] appEnv=${appEnv}` +
    ` file=${loadedFrom ?? '(none — using process env only)'}` +
    ` urlSource=${urlSource}` +
    ` target=${redactDatabaseTarget(datasourceUrl)}`,
);

if (appEnv === 'production') {
  const target = redactDatabaseTarget(datasourceUrl).toLowerCase();
  if (target.includes('neon.tech') || target.includes('neondb')) {
    throw new Error(
      '[prisma.config] Refusing production Prisma command: DATABASE_URL points at Neon. ' +
        'Set PRISMA_ENV=production and ensure .env.production / ECS vars target Supabase.',
    );
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
});
