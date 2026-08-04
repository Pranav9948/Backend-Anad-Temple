import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incomingRequestId = req.headers['x-request-id'] as string;

  const requestId = incomingRequestId || randomUUID();

  req.requestId = requestId;
  req.startTime = Date.now();

  res.setHeader('x-request-id', requestId);

  next();
};
