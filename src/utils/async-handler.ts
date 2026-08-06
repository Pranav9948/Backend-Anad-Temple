import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  const handler: RequestHandler = (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
  return handler;
}
