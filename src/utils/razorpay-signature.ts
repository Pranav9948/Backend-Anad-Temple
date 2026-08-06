import crypto from 'node:crypto';
import { config } from '@/core/config.js';

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const payload = `${input.orderId}|${input.paymentId}`;
  const expected = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  return timingSafeEqual(expected, input.signature);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(expected: string, received: string): boolean {
  try {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
