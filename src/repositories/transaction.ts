import type { Prisma } from '@/generated/prisma/client.js';
import { prisma } from '@/infra/db.js';

/**
 * Execute callback inside a Prisma interactive transaction.
 * Repositories can receive the `tx` client for atomic multi-table writes.
 */
export async function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  },
): Promise<T> {
  return prisma.$transaction(fn, options);
}
