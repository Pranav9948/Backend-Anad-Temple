import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import { PrismaClient } from '@/generated/prisma/client.js';

// SAFETY CHECK
if (
  config.NODE_ENV === 'test' &&
  config.DATABASE_URL.includes('dev_temple_booking')
) {
  throw new Error(
    '❌ CRITICAL: Test environment is pointing to the Development Database!',
  );
}

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log:
    config.NODE_ENV === 'test' ? ['error'] : ['query', 'info', 'warn', 'error'],
} as any);

export type WaitForDatabaseOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
};

const DEFAULT_WAIT_OPTIONS: Required<WaitForDatabaseOptions> = {
  maxAttempts: 10,
  initialDelayMs: 500,
  maxDelayMs: 8_000,
  factor: 2,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDatabaseTargetLabel(): string {
  try {
    const url = new URL(config.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, '').split('?')[0] || '(unknown-db)';
    return `${url.hostname}:${url.port || '5432'}/${dbName}`;
  } catch {
    return config.DATABASE_URL.split('/').pop() ?? 'database';
  }
}

/** Safe summary for logs — never includes password or full connection string. */
export function getDatabaseConnectionSummary(): {
  target: string;
  host: string;
  database: string;
  inferredKind: 'development' | 'production' | 'unknown';
} {
  try {
    const url = new URL(config.DATABASE_URL);
    const database =
      url.pathname.replace(/^\//, '').split('?')[0] || '(unknown-db)';
    const host = url.hostname;
    const lowerHost = host.toLowerCase();
    const lowerDb = database.toLowerCase();

    let inferredKind: 'development' | 'production' | 'unknown' = 'unknown';
    if (
      lowerHost === 'localhost' ||
      lowerHost === '127.0.0.1' ||
      lowerDb.includes('dev') ||
      lowerDb.includes('test')
    ) {
      inferredKind = 'development';
    } else if (
      lowerDb.includes('prod') ||
      lowerHost.includes('supabase') ||
      lowerHost.includes('neon.tech') ||
      lowerHost.includes('amazonaws.com')
    ) {
      inferredKind = 'production';
    }

    return {
      target: `${host}:${url.port || '5432'}/${database}`,
      host,
      database,
      inferredKind,
    };
  } catch {
    return {
      target: 'unparseable-database-url',
      host: 'unknown',
      database: 'unknown',
      inferredKind: 'unknown',
    };
  }
}

function isTransientConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code.toLowerCase()
      : '';

  return (
    code === 'econnrefused' ||
    code === 'enotfound' ||
    code === 'etimedout' ||
    code === 'econnreset' ||
    message.includes('connect') ||
    message.includes('connection refused') ||
    message.includes('timeout')
  );
}

/**
 * Verifies PostgreSQL is reachable with a real query and retries transient failures.
 */
export async function waitForDatabase(
  options: WaitForDatabaseOptions = {},
): Promise<void> {
  const { maxAttempts, initialDelayMs, maxDelayMs, factor } = {
    ...DEFAULT_WAIT_OPTIONS,
    ...options,
  };

  let waitMs = initialDelayMs;
  const target = getDatabaseTargetLabel();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info(`✅ Database ready at ${target} (attempt ${attempt})`);
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      const shouldRetry = !isLastAttempt && isTransientConnectionError(error);

      if (!shouldRetry) {
        logger.error(
          {
            err: error,
            attempt,
            target,
            appEnv: config.NODE_ENV,
            databaseKind: getDatabaseConnectionSummary().inferredKind,
          },
          '❌ Database connectivity check failed',
        );
        throw error;
      }

      logger.warn(
        { err: error, attempt, maxAttempts, retryInMs: waitMs, target },
        'Database not ready yet, retrying connection',
      );

      await delay(waitMs);
      waitMs = Math.min(waitMs * factor, maxDelayMs);
    }
  }
}

export const connectDB = async () => {
  try {
    await prisma.$connect();
    await waitForDatabase();

    const db = getDatabaseConnectionSummary();
    logger.info(
      {
        appEnv: config.NODE_ENV,
        databaseKind: db.inferredKind,
        databaseHost: db.host,
        databaseName: db.database,
        databaseTarget: db.target,
      },
      `✅ Database connected | appEnv=${config.NODE_ENV} | dbKind=${db.inferredKind} | target=${db.target}`,
    );
  } catch (err) {
    const db = getDatabaseConnectionSummary();
    logger.error(
      {
        err,
        appEnv: config.NODE_ENV,
        databaseKind: db.inferredKind,
        databaseTarget: db.target,
      },
      '❌ Database connection failed',
    );
    process.exit(1);
  }
};

export const disConnectDB = async () => {
  await prisma.$disconnect();
  await pool.end();
};
