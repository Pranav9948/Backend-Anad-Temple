import { z } from 'zod';

const uuidParam = z.string().uuid('Invalid booking ID format');

export const createOrderSchema = z.object({
  body: z.object({
    bookingId: uuidParam,
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    bookingId: uuidParam,
    razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
    razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
    razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    bookingId: uuidParam,
  }),
});
