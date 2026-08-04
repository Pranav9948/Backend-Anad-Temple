import { Request, Response, NextFunction } from 'express';

export const errorHandler = (method: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (error) {
      next(error); // Passes the error to our errorMiddleware
    }
  };
};
