import { prisma } from '@/infra/db.js';
import { Request, Response } from 'express';

export const check = async (_req: Request, res: Response) => {
  try {
    // We check the DB connection as part of health
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: 'CONNECTED',
      },
    });
  } catch (error) {
    res
      .status(503)
      .json({ status: 'ERROR', message: 'Database connection failed' });
  }
};
