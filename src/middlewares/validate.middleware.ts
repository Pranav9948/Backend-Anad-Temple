import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { BadRequestException } from '@/exceptions/exceptions.js';

export const validate =
  (schema: ZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new BadRequestException(
            error.issues
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', '),
          ),
        );
      }

      return next(error);
    }
  };
