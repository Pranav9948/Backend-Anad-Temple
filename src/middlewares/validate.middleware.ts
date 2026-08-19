import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { BadRequestException } from '@/exceptions/exceptions.js';

/**
 * Express 5 exposes `req.query` (and sometimes `req.params`) as getter-only.
 * Write parsed values back when possible; otherwise override the getter.
 */
function writeRequestField(
  req: Request,
  key: 'body' | 'query' | 'params',
  value: unknown,
) {
  if (value === undefined) return;

  try {
    (req as unknown as Record<string, unknown>)[key] = value;
  } catch {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

export const validate =
  (schema: ZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      writeRequestField(req, 'body', parsed.body);
      // Express 5: req.query is getter-only. Controllers re-parse query strings.
      writeRequestField(req, 'params', parsed.params);

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
