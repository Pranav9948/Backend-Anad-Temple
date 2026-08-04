export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class BookingNotFoundError extends DomainError {
  readonly code = 'BOOKING_NOT_FOUND';

  constructor(identifier: string) {
    super(`Booking not found: ${identifier}`);
  }
}

export class BookingMemberNotFoundError extends DomainError {
  readonly code = 'BOOKING_MEMBER_NOT_FOUND';

  constructor(identifier: string) {
    super(`Booking member not found: ${identifier}`);
  }
}

export class BookingAlreadyCancelledError extends DomainError {
  readonly code = 'BOOKING_ALREADY_CANCELLED';

  constructor(bookingId: string) {
    super(`Booking is already cancelled: ${bookingId}`);
  }
}

export class DuplicateBookingError extends DomainError {
  readonly code = 'DUPLICATE_BOOKING';

  constructor(bookingNumber: string) {
    super(`Booking number already exists: ${bookingNumber}`);
  }
}

export class PaymentNotFoundError extends DomainError {
  readonly code = 'PAYMENT_NOT_FOUND';

  constructor(identifier: string) {
    super(`Payment not found: ${identifier}`);
  }
}

export class DuplicatePaymentError extends DomainError {
  readonly code = 'DUPLICATE_PAYMENT';

  constructor(bookingId: string) {
    super(`Payment already exists for booking: ${bookingId}`);
  }
}

export class AdminNotFoundError extends DomainError {
  readonly code = 'ADMIN_NOT_FOUND';

  constructor(identifier: string) {
    super(`Admin not found: ${identifier}`);
  }
}

export class OTPNotFoundError extends DomainError {
  readonly code = 'OTP_NOT_FOUND';

  constructor(identifier: string) {
    super(`OTP not found: ${identifier}`);
  }
}

export class OTPExpiredError extends DomainError {
  readonly code = 'OTP_EXPIRED';

  constructor(mobile: string) {
    super(`OTP has expired for mobile: ${mobile}`);
  }
}

export class InvalidOTPError extends DomainError {
  readonly code = 'INVALID_OTP';

  constructor() {
    super('Invalid OTP provided');
  }
}

export class OTPMaxAttemptsError extends DomainError {
  readonly code = 'OTP_MAX_ATTEMPTS';

  constructor(mobile: string) {
    super(`Maximum OTP attempts exceeded for mobile: ${mobile}`);
  }
}

export class InvalidPaymentTransitionError extends DomainError {
  readonly code = 'INVALID_PAYMENT_TRANSITION';

  constructor(message: string) {
    super(message);
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(message: string) {
    super(message);
  }
}

export const CANCELLED_BOOKING_PREFIX = '[CANCELLED]';
export const CHECKED_OUT_BOOKING_PREFIX = '[CHECKED_OUT]';

export function isBookingCancelled(notes: string | null | undefined): boolean {
  return (notes ?? '').startsWith(CANCELLED_BOOKING_PREFIX);
}

export function isBookingCheckedOut(notes: string | null | undefined): boolean {
  return (notes ?? '').includes(CHECKED_OUT_BOOKING_PREFIX);
}
