import type { Response } from 'express';

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiSuccessResponse<T>);
}
