import type { Payment } from '@/generated/prisma/client.js';
import { PaymentMethod, PaymentStatus } from '@/generated/prisma/client.js';
import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  BusinessRuleViolationError,
  DuplicatePaymentError,
  InvalidPaymentSignatureError,
  InvalidPaymentTransitionError,
  InvalidWebhookSignatureError,
  PaymentAlreadyCompletedError,
  PaymentNotFoundError,
  PaymentVerificationFailedError,
  RazorpayOrderCreationError,
  isBookingCancelled,
  isBookingCheckedOut,
} from '@/domain/errors.js';
import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import { RAZORPAY_CURRENCY, razorpayClient } from '@/infra/razorpay.js';
import {
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';
import { BookingRepository } from '@/modules/booking/booking.repository.js';
import {
  type IBookingMemberRepository,
  bookingMemberRepository,
} from '@/modules/booking-member/booking-member.repository.js';
import {
  PaymentRepository,
  type IPaymentRepository,
  paymentRepository,
} from '@/modules/payment/payment.repository.js';
import { runInTransaction } from '@/repositories/transaction.js';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '@/utils/razorpay-signature.js';

export type CreatePaymentRecordInput = {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
};

export type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: typeof RAZORPAY_CURRENCY;
  keyId: string;
  bookingId: string;
  paymentId: string;
};

export type VerifyPaymentInput = {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type PaymentStatusResponse = {
  bookingId: string;
  paymentStatus: PaymentStatus;
  payment: Payment | null;
};

export interface IPaymentService {
  createPaymentRecord(input: CreatePaymentRecordInput): Promise<Payment>;
  createRazorpayOrder(bookingId: string): Promise<RazorpayOrderResponse>;
  verifyPaymentSignature(input: VerifyPaymentInput): Promise<Payment>;
  completePayment(input: VerifyPaymentInput): Promise<Payment>;
  markPaymentFailed(bookingId: string, razorpayOrderId?: string): Promise<Payment>;
  getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse>;
  getPaymentByBookingId(bookingId: string): Promise<Payment>;
  getPaymentById(paymentId: string): Promise<Payment>;
  markPaymentPaid(paymentId: string, transactionId?: string): Promise<Payment>;
  markPaymentPending(paymentId: string): Promise<Payment>;
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<void>;
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly payments: IPaymentRepository = paymentRepository,
    private readonly bookings: IBookingRepository = bookingRepository,
    private readonly members: IBookingMemberRepository = bookingMemberRepository,
  ) {}

  async createRazorpayOrder(bookingId: string): Promise<RazorpayOrderResponse> {
    const booking = await this.requirePayableBooking(bookingId);

    const memberCount = (await this.members.findByBookingId(bookingId)).length;
    if (memberCount === 0) {
      throw new BusinessRuleViolationError(
        'At least one member is required before creating a payment order',
      );
    }

    if (!isBookingCheckedOut(booking.notes)) {
      throw new BusinessRuleViolationError(
        'Booking must be checked out before initiating online payment',
      );
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new PaymentAlreadyCompletedError(bookingId);
    }

    let payment = await this.payments.findByBookingId(bookingId);

    if (payment?.status === PaymentStatus.PAID) {
      throw new PaymentAlreadyCompletedError(bookingId);
    }

    let orderId: string;

    try {
      const order = await razorpayClient.orders.create({
        amount: booking.totalAmount,
        currency: RAZORPAY_CURRENCY,
        receipt: booking.bookingNumber,
        notes: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
      });

      orderId = order.id;

      logger.info(
        { bookingId, orderId, amount: booking.totalAmount },
        'Razorpay order created',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Razorpay error';
      logger.error({ err: error, bookingId }, 'Razorpay order creation failed');
      throw new RazorpayOrderCreationError(message);
    }

    if (payment) {
      payment = await this.payments.update(payment.id, {
        gatewayOrderId: orderId,
        gatewayPaymentId: null,
        status: PaymentStatus.PENDING,
        paidAt: null,
        amount: booking.totalAmount,
        method: PaymentMethod.ONLINE,
      });
    } else {
      payment = await this.payments.createOrderRecord({
        bookingId,
        amount: booking.totalAmount,
        gatewayOrderId: orderId,
      });
    }

    return {
      orderId,
      amount: booking.totalAmount,
      currency: RAZORPAY_CURRENCY,
      keyId: config.RAZORPAY_KEY_ID,
      bookingId,
      paymentId: payment.id,
    };
  }

  async verifyPaymentSignature(input: VerifyPaymentInput): Promise<Payment> {
    const isValid = verifyRazorpayPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!isValid) {
      logger.warn(
        { bookingId: input.bookingId, orderId: input.razorpayOrderId },
        'Razorpay payment signature verification failed',
      );
      throw new InvalidPaymentSignatureError();
    }

    return this.completePayment(input);
  }

  async completePayment(input: VerifyPaymentInput): Promise<Payment> {
    const payment = await this.payments.findByBookingId(input.bookingId);

    if (!payment) {
      throw new PaymentNotFoundError(input.bookingId);
    }

    if (payment.gatewayOrderId !== input.razorpayOrderId) {
      throw new PaymentVerificationFailedError('Order ID does not match booking payment');
    }

    if (payment.status === PaymentStatus.PAID) {
      logger.info({ bookingId: input.bookingId }, 'Payment already completed (idempotent)');
      return payment;
    }

    const completed = await runInTransaction(async (tx) => {
      const paymentRepo = new PaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      const updatedPayment = await paymentRepo.markPaid(payment.id, {
        gatewayPaymentId: input.razorpayPaymentId,
        paidAt: new Date(),
      });

      await bookingRepo.updatePaymentStatus(input.bookingId, PaymentStatus.PAID);

      return updatedPayment;
    });

    logger.info(
      {
        bookingId: input.bookingId,
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
      },
      'Razorpay payment verified and completed',
    );

    return completed;
  }

  async markPaymentFailed(
    bookingId: string,
    razorpayOrderId?: string,
  ): Promise<Payment> {
    const payment = await this.payments.findByBookingId(bookingId);

    if (!payment) {
      throw new PaymentNotFoundError(bookingId);
    }

    if (razorpayOrderId && payment.gatewayOrderId !== razorpayOrderId) {
      throw new PaymentVerificationFailedError('Order ID does not match booking payment');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new PaymentAlreadyCompletedError(bookingId);
    }

    const failed = await runInTransaction(async (tx) => {
      const paymentRepo = new PaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      const updatedPayment = await paymentRepo.markFailed(payment.id);
      await bookingRepo.updatePaymentStatus(bookingId, PaymentStatus.PENDING);

      return updatedPayment;
    });

    logger.warn({ bookingId, orderId: razorpayOrderId }, 'Payment marked as failed');

    return failed;
  }

  async getPaymentStatus(bookingId: string): Promise<PaymentStatusResponse> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    const payment = await this.payments.findByBookingId(bookingId);

    return {
      bookingId,
      paymentStatus: booking.paymentStatus,
      payment,
    };
  }

  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<void> {
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      logger.warn('Razorpay webhook signature verification failed');
      throw new InvalidWebhookSignatureError();
    }

    const payload =
      typeof rawBody === 'string'
        ? (JSON.parse(rawBody) as RazorpayWebhookPayload)
        : (JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload);

    const event = payload.event;

    logger.info({ event }, 'Processing Razorpay webhook event');

    if (event === 'payment.captured') {
      await this.handlePaymentCaptured(payload);
      return;
    }

    if (event === 'payment.failed') {
      await this.handlePaymentFailed(payload);
      return;
    }

    logger.info({ event }, 'Unhandled Razorpay webhook event ignored');
  }

  async createPaymentRecord(input: CreatePaymentRecordInput): Promise<Payment> {
    const booking = await this.bookings.findById(input.bookingId);
    if (!booking) {
      throw new BookingNotFoundError(input.bookingId);
    }

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(input.bookingId);
    }

    if (input.amount <= 0) {
      throw new BusinessRuleViolationError('Payment amount must be greater than zero');
    }

    const existing = await this.payments.findByBookingId(input.bookingId);
    if (existing) {
      throw new DuplicatePaymentError(input.bookingId);
    }

    return this.payments.create({
      booking: { connect: { id: input.bookingId } },
      amount: input.amount,
      method: input.method,
      transactionId: input.transactionId ?? null,
      status: PaymentStatus.PENDING,
    });
  }

  async markPaymentPaid(
    paymentId: string,
    transactionId?: string,
  ): Promise<Payment> {
    const payment = await this.requirePayment(paymentId);

    if (payment.status === PaymentStatus.PAID) {
      throw new InvalidPaymentTransitionError('Payment is already marked as paid');
    }

    return runInTransaction(async (tx) => {
      const paymentRepo = new PaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      const updatedPayment = await paymentRepo.update(paymentId, {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        ...(transactionId
          ? {
              transactionId,
              gatewayPaymentId: transactionId,
            }
          : {}),
      });

      await bookingRepo.updatePaymentStatus(payment.bookingId, PaymentStatus.PAID);

      return updatedPayment;
    });
  }

  async markPaymentPending(paymentId: string): Promise<Payment> {
    const payment = await this.requirePayment(paymentId);

    if (payment.status === PaymentStatus.PENDING) {
      throw new InvalidPaymentTransitionError('Payment is already pending');
    }

    return runInTransaction(async (tx) => {
      const paymentRepo = new PaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      const updatedPayment = await paymentRepo.update(paymentId, {
        status: PaymentStatus.PENDING,
        paidAt: null,
      });

      await bookingRepo.updatePaymentStatus(payment.bookingId, PaymentStatus.PENDING);

      return updatedPayment;
    });
  }

  async getPaymentByBookingId(bookingId: string): Promise<Payment> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    const payment = await this.payments.findByBookingId(bookingId);
    if (!payment) {
      throw new PaymentNotFoundError(bookingId);
    }

    return payment;
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    return this.requirePayment(paymentId);
  }

  private async requirePayableBooking(bookingId: string) {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(bookingId);
    }

    return booking;
  }

  private async requirePayment(paymentId: string): Promise<Payment> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }
    return payment;
  }

  private async handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      throw new PaymentVerificationFailedError('Missing payment entity in webhook');
    }

    const orderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    let record = await this.payments.findByGatewayOrderId(orderId);

    if (!record && paymentEntity.notes?.bookingId) {
      record = await this.payments.findByBookingId(paymentEntity.notes.bookingId);
    }

    if (!record) {
      throw new PaymentNotFoundError(orderId);
    }

    if (record.status === PaymentStatus.PAID) {
      return;
    }

    if (record.gatewayOrderId && record.gatewayOrderId !== orderId) {
      throw new PaymentVerificationFailedError('Order ID mismatch in webhook');
    }

    await runInTransaction(async (tx) => {
      const paymentRepo = new PaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      await paymentRepo.markPaid(record!.id, {
        gatewayPaymentId: razorpayPaymentId,
        paidAt: new Date(),
      });

      await bookingRepo.updatePaymentStatus(record!.bookingId, PaymentStatus.PAID);
    });

    logger.info(
      { bookingId: record.bookingId, orderId, razorpayPaymentId },
      'Webhook payment captured — marked paid',
    );
  }

  private async handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      return;
    }

    const orderId = paymentEntity.order_id;
    const bookingId = paymentEntity.notes?.bookingId;

    const record = orderId
      ? await this.payments.findByGatewayOrderId(orderId)
      : bookingId
        ? await this.payments.findByBookingId(bookingId)
        : null;

    if (!record) {
      logger.warn({ orderId, bookingId }, 'Webhook payment.failed — record not found');
      return;
    }

    await this.markPaymentFailed(record.bookingId, orderId);
  }
}

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        notes?: {
          bookingId?: string;
          bookingNumber?: string;
        };
      };
    };
  };
};

export const paymentService = new PaymentService();
