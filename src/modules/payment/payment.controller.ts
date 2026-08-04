import type { Request, Response, RequestHandler } from 'express';
import { paymentService } from '@/modules/payment/payment.service.js';
import {
  toCreateOrderResponse,
  toPublicPaymentDetails,
} from '@/modules/payment/payment.mapper.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { getRouteParam } from '@/utils/route-params.js';

export const createOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { bookingId } = req.body as { bookingId: string };

    const order = await paymentService.createRazorpayOrder(bookingId);

    sendSuccess(
      res,
      toCreateOrderResponse(order),
      'Razorpay order created successfully',
      201,
    );
  },
);

export const verifyPayment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body as {
      bookingId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    const payment = await paymentService.verifyPaymentSignature({
      bookingId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    sendSuccess(
      res,
      toPublicPaymentDetails(payment),
      'Payment verified successfully',
    );
  },
);

export const getPaymentByBookingId: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);

    const status = await paymentService.getPaymentStatus(bookingId);

    sendSuccess(res, {
      bookingId: status.bookingId,
      paymentStatus: status.paymentStatus,
      payment: status.payment ? toPublicPaymentDetails(status.payment) : null,
    });
  },
);

export const handleWebhook: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body as Buffer | string;

    if (typeof signature !== 'string' || !signature) {
      res.status(400).json({
        success: false,
        message: 'Missing X-Razorpay-Signature header',
      });
      return;
    }

    await paymentService.handleWebhook(rawBody, signature);

    sendSuccess(res, { received: true }, 'Webhook processed successfully');
  },
);

export const markFailed: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { bookingId, razorpay_order_id } = req.body as {
      bookingId: string;
      razorpay_order_id?: string;
    };

    const payment = await paymentService.markPaymentFailed(
      bookingId,
      razorpay_order_id,
    );

    sendSuccess(res, toPublicPaymentDetails(payment), 'Payment marked as failed');
  },
);
