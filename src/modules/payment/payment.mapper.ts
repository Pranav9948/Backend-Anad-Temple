import type { Payment } from '@/generated/prisma/client.js';

export function toPublicPaymentDetails(payment: Payment) {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: 'INR',
    method: payment.method,
    status: payment.status,
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function toCreateOrderResponse(input: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingId: string;
  paymentId: string;
}) {
  return {
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    keyId: input.keyId,
    bookingId: input.bookingId,
    paymentId: input.paymentId,
  };
}
