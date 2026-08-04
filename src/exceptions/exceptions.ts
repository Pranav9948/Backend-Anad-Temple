import { HttpException, ErrorCode } from './root.js';

// 400 - Validation/Client Input issues
export class BadRequestException extends HttpException {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.VALIDATION_FAILED,
  ) {
    super(message, 400, errorCode, null);
  }
}

// 401 - Identity issues (Wrong password, expired token)
export class UnauthorizedException extends HttpException {
  constructor(
    message: string = 'Invalid credentials',
    errorCode: ErrorCode = ErrorCode.UNAUTHORIZED,
  ) {
    super(message, 401, errorCode, null);
  }
}

// 403 - Permission issues (Valid user, but not allowed here)
export class ForbiddenException extends HttpException {
  constructor(
    message: string = 'Access forbidden',
    errorCode: ErrorCode = ErrorCode.FORBIDDEN,
  ) {
    super(message, 403, errorCode, null);
  }
}

// 404 - Resource not found
export class NotFoundException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, 404, errorCode, null);
  }
}

// 409 - Data conflicts (User already exists)
export class ConflictException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, 409, errorCode, null);
  }
}

// 502 - Upstream service unavailable
export class BadGatewayException extends HttpException {
  constructor(
    message: string = 'Upstream service temporarily unavailable',
    errorCode: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
  ) {
    super(message, 502, errorCode, null);
  }
}

// 500 - Something went wrong in our code/database
export class InternalException extends HttpException {
  constructor(
    message: string,
    errors: any,
    errorCode: ErrorCode = ErrorCode.INTERNAL_EXCEPTION,
  ) {
    super(message, 500, errorCode, errors);
  }
}
