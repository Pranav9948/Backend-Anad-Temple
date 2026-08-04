import type { PrismaClient } from '@/generated/prisma/client.js';
import type { Prisma } from '@/generated/prisma/client.js';
import { prisma } from '@/infra/db.js';

/** Prisma client or an active transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Shared constructor dependency for all repositories.
 * Accepts the singleton Prisma client by default, or a transaction client
 * when participating in `runInTransaction`.
 */
export abstract class BaseRepository {
  constructor(protected readonly db: DbClient = prisma) {}
}
