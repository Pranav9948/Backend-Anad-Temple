import { DomainError } from '@/domain/errors.js';
import { ErrorCode } from '@/exceptions/root.js';

export function mapDomainErrorToHttp(error: DomainError): {
  statusCode: number;
  errorCode: ErrorCode;
} {
  switch (error.code) {
    case 'BOOKING_NOT_FOUND':
    case 'BOOKING_MEMBER_NOT_FOUND':
    case 'PAYMENT_NOT_FOUND':
    case 'OTP_NOT_FOUND':
    case 'ADMIN_NOT_FOUND':
      return { statusCode: 404, errorCode: ErrorCode.NOT_FOUND };

    case 'DUPLICATE_BOOKING':
    case 'DUPLICATE_PAYMENT':
    case 'BOOKING_ALREADY_CANCELLED':
      return { statusCode: 409, errorCode: ErrorCode.RESOURCE_ALREADY_EXISTS };

    case 'INVALID_OTP':
    case 'OTP_EXPIRED':
    case 'OTP_MAX_ATTEMPTS':
      return { statusCode: 401, errorCode: ErrorCode.UNAUTHORIZED };

    case 'INVALID_PAYMENT_TRANSITION':
    case 'BUSINESS_RULE_VIOLATION':
      return { statusCode: 400, errorCode: ErrorCode.VALIDATION_FAILED };

    default:
      return { statusCode: 500, errorCode: ErrorCode.INTERNAL_EXCEPTION };
  }
}
