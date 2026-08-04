import { Request, Response, NextFunction } from 'express';
import { logger } from '@/core/logger.js';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { method, originalUrl } = req;

  logger.info({
    msg: 'Incoming request',
    requestId: req.requestId,
    method,
    route: originalUrl,
    userId: req.user?.userId ?? null,
  });

  res.on('finish', () => {
    const responseTime = Date.now() - req.startTime;

    logger.info({
      msg: 'Request completed',
      requestId: req.requestId,
      method,
      route: originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user?.userId ?? null,
    });
  });

  next();
};
