import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { validate } from '@/middlewares/validate.middleware.js';
import * as paymentController from '@/modules/payment/payment.controller.js';
import {
  bookingIdParamSchema,
  createOrderSchema,
  verifyPaymentSchema,
} from '@/modules/payment/payment.validation.js';

const router: ExpressRouter = Router();

router.post(
  '/create-order',
  validate(createOrderSchema),
  paymentController.createOrder,
);

router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);

router.get(
  '/:bookingId',
  validate(bookingIdParamSchema),
  paymentController.getPaymentByBookingId,
);

export default router;
