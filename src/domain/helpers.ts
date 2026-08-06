import crypto from 'node:crypto';

const BOOKING_NUMBER_PREFIX = 'TB';
const MAX_UNIQUENESS_RETRIES = 5;

export function generateBookingNumberCandidate(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${BOOKING_NUMBER_PREFIX}-${year}-${suffix}`;
}

export function generateUniqueBookingNumber(
  isTaken: (bookingNumber: string) => Promise<boolean>,
): Promise<string> {
  return attemptUniqueBookingNumber(isTaken, 0);
}

async function attemptUniqueBookingNumber(
  isTaken: (bookingNumber: string) => Promise<boolean>,
  attempt: number,
): Promise<string> {
  if (attempt >= MAX_UNIQUENESS_RETRIES) {
    throw new Error('Failed to generate a unique booking number');
  }

  const candidate = generateBookingNumberCandidate();
  const taken = await isTaken(candidate);

  if (taken) {
    return attemptUniqueBookingNumber(isTaken, attempt + 1);
  }

  return candidate;
}

export function hashOtpValue(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function generateOtpValue(length: number): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(length, '0');
}
