import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@/generated/prisma/client.js';
import { DomainError } from '@/domain/errors.js';
import { HttpException, ErrorCode } from '@/exceptions/root.js';
import { logger } from '@/core/logger.js';
import { mapDomainErrorToHttp } from '@/utils/domain-error-mapper.js';

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (res.headersSent) {
    return;
  }

  const requestId = req.requestId;
  const userId = req.user?.userId ?? null;

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = ErrorCode.INTERNAL_EXCEPTION;
  let errors: unknown = null;

  if (error instanceof HttpException) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.errorCode;
    errors = error.errors;

    const baseLog = {
      requestId,
      statusCode,
      errorCode,
      message,
      userId,
    };

    if (statusCode >= 500) {
      logger.error({ msg: 'Server error', ...baseLog });
    } else {
      logger.warn({ msg: 'Client error', ...baseLog });
    }

    res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      errors,
    });
    return;
  }

  if (error instanceof DomainError) {
    const mapped = mapDomainErrorToHttp(error);
    statusCode = mapped.statusCode;
    message = error.message;
    errorCode = mapped.errorCode;
    errors = { code: error.code };

    logger.warn({
      msg: 'Domain error',
      requestId,
      statusCode,
      errorCode: error.code,
      message,
      userId,
    });

    res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      errors,
    });
    return;
  }

  if (error instanceof ZodError) {
    statusCode = 422;
    message = 'Validation Error';
    errorCode = ErrorCode.VALIDATION_FAILED;
    errors = error.flatten().fieldErrors;

    logger.warn({
      msg: 'Validation error',
      requestId,
      statusCode,
      errorCode,
      errors,
      userId,
    });

    res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      errors,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      message = `Unique constraint failed on ${String(error.meta?.target ?? 'field')}`;
      errorCode = ErrorCode.EMAIL_ALREADY_EXISTS;

      logger.warn({
        msg: 'Database constraint error',
        requestId,
        statusCode,
        error: error.message,
        userId,
      });

      res.status(statusCode).json({
        success: false,
        message,
        errorCode,
      });
      return;
    }
  }

  const err = error instanceof Error ? error : new Error(String(error));

  if (err.message.startsWith('Not allowed by CORS')) {
    logger.warn({
      msg: 'CORS rejection',
      requestId,
      message: err.message,
      origin: req.headers.origin ?? null,
      userId,
    });
    res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS',
      errorCode: ErrorCode.FORBIDDEN,
    });
    return;
  }

  logger.error({
    msg: 'System error',
    requestId,
    error: {
      message: err.message,
      stack: err.stack,
    },
    userId,
  });

  res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    errorCode: ErrorCode.INTERNAL_EXCEPTION,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
