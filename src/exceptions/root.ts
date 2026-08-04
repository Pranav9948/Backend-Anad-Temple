export enum ErrorCode {
  //  Authentication & Authorization (1xxx)
  UNAUTHORIZED = 1001, // Invalid or missing auth
  TOKEN_EXPIRED = 1002,
  INVALID_TOKEN = 1003,

  //  Validation Errors (2xxx)
  VALIDATION_FAILED = 2001,
  EMAIL_ALREADY_EXISTS = 2002,
  INVALID_INPUT = 2003,

  // Resource Errors (3xxx)
  NOT_FOUND = 3001,
  USER_NOT_FOUND = 3002,
  RESOURCE_ALREADY_EXISTS = 3003,

  //  Permission / Access (4xxx)
  FORBIDDEN = 4001, // Authenticated but not allowed
  ACCESS_DENIED = 4002,

  //  Server / System Errors (5xxx)
  INTERNAL_EXCEPTION = 5001,
  DATABASE_ERROR = 5002,
  SERVICE_UNAVAILABLE = 5003,
}

export class HttpException extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errorCode: ErrorCode,
    public errors: any = null,
  ) {
    super(message);
    // This captures the line number where the error happened for  logs
    Error.captureStackTrace(this, this.constructor);
  }
}
