import type { Payment, PaymentMethod } from '@/generated/prisma/client.js';
import { PaymentStatus } from '@/generated/prisma/client.js';
import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  BusinessRuleViolationError,
  DuplicatePaymentError,
  InvalidPaymentTransitionError,
  PaymentNotFoundError,
  isBookingCancelled,
} from '@/domain/errors.js';
import {
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';
import {
  BookingRepository,
} from '@/modules/booking/booking.repository.js';
import {
  PaymentRepository,
  type IPaymentRepository,
  paymentRepository,
} from '@/modules/payment/payment.repository.js';
import { runInTransaction } from '@/repositories/transaction.js';

export type CreatePaymentRecordInput = {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
};

export interface IPaymentService {
  createPaymentRecord(input: CreatePaymentRecordInput): Promise<Payment>;
  markPaymentPaid(paymentId: string, transactionId?: string): Promise<Payment>;
  markPaymentPending(paymentId: string): Promise<Payment>;
  getPaymentByBookingId(bookingId: string): Promise<Payment>;
  getPaymentById(paymentId: string): Promise<Payment>;
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly payments: IPaymentRepository = paymentRepository,
    private readonly bookings: IBookingRepository = bookingRepository,
  ) {}

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
        ...(transactionId ? { transactionId } : {}),
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

  private async requirePayment(paymentId: string): Promise<Payment> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }
    return payment;
  }
}

export const paymentService = new PaymentService();
