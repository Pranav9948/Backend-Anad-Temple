import type { Language } from '@/generated/prisma/client.js';
import { convertUTCToIST } from '@/utils/date.util.js';
import type {
  BookingCreatedNotificationPayload,
  PaymentFailedNotificationPayload,
  PaymentSuccessNotificationPayload,
} from '@/modules/notification/notification.types.js';

const LANGUAGE_LABELS: Record<Language, string> = {
  ENGLISH: 'English',
  MALAYALAM: 'Malayalam',
  TAMIL: 'Tamil',
  TELUGU: 'Telugu',
  HINDI: 'Hindi',
};

export function formatAmountInr(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

export function formatPaymentMethod(method: string): string {
  if (method === 'ONLINE') return 'Online (Razorpay)';
  if (method === 'CASH') return 'Cash';
  return method;
}

export function buildBookingCreatedMessage(
  payload: BookingCreatedNotificationPayload,
): string {
  const bookingTime = convertUTCToIST(payload.bookingTime) ?? payload.bookingTime.toISOString();

  return [
    '🛕 *New Temple Booking*',
    '',
    `*Booking Number:* ${payload.bookingNumber}`,
    `*Devotee Name:* ${payload.devoteeName}`,
    `*Mobile Number:* ${payload.mobileNumber}`,
    `*Language:* ${LANGUAGE_LABELS[payload.language]}`,
    `*Archana Members:* ${payload.memberCount}`,
    `*Payment Status:* ${payload.paymentStatus}`,
    `*Booking Time:* ${bookingTime}`,
  ].join('\n');
}

export function buildPaymentSuccessMessage(
  payload: PaymentSuccessNotificationPayload,
): string {
  const transactionTime =
    convertUTCToIST(payload.transactionTime) ?? payload.transactionTime.toISOString();

  return [
    '✅ *Payment Received*',
    '',
    `*Booking Number:* ${payload.bookingNumber}`,
    `*Amount:* ${formatAmountInr(payload.amountPaise)}`,
    `*Payment Method:* ${formatPaymentMethod(payload.paymentMethod)}`,
    `*Payment ID:* ${payload.paymentId}`,
    `*Payment Status:* PAID`,
    `*Transaction Time:* ${transactionTime}`,
  ].join('\n');
}

export function buildPaymentFailedMessage(
  payload: PaymentFailedNotificationPayload,
): string {
  return [
    '❌ *Payment Failed*',
    '',
    `*Booking Number:* ${payload.bookingNumber}`,
    `*Devotee Name:* ${payload.devoteeName}`,
    `*Mobile Number:* ${payload.mobileNumber}`,
    `*Failure Status:* ${payload.failureStatus}`,
  ].join('\n');
}
