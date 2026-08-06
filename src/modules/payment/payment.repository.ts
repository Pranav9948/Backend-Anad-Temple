import type { Payment, Prisma } from '@/generated/prisma/client.js';
import { PaymentMethod, PaymentStatus } from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';

export type PaymentCreateData = Prisma.PaymentCreateInput;
export type PaymentUpdateData = Prisma.PaymentUpdateInput;

export type CreateOrderRecordInput = {
  bookingId: string;
  amount: number;
  gatewayOrderId: string;
};

export type MarkPaidInput = {
  gatewayPaymentId: string;
  paidAt?: Date;
};

export interface IPaymentRepository {
  create(data: PaymentCreateData): Promise<Payment>;
  createOrderRecord(input: CreateOrderRecordInput): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByBookingId(bookingId: string): Promise<Payment | null>;
  findByGatewayOrderId(gatewayOrderId: string): Promise<Payment | null>;
  findByGatewayPaymentId(gatewayPaymentId: string): Promise<Payment | null>;
  update(id: string, data: PaymentUpdateData): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus): Promise<Payment>;
  updateTransaction(
    id: string,
    data: {
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      transactionId?: string;
      status?: PaymentStatus;
      paidAt?: Date | null;
    },
  ): Promise<Payment>;
  markPaid(id: string, input: MarkPaidInput): Promise<Payment>;
  markFailed(id: string): Promise<Payment>;
  delete(id: string): Promise<Payment>;
}

export class PaymentRepository
  extends BaseRepository
  implements IPaymentRepository
{
  create(data: PaymentCreateData): Promise<Payment> {
    return this.db.payment.create({ data });
  }

  createOrderRecord(input: CreateOrderRecordInput): Promise<Payment> {
    return this.db.payment.create({
      data: {
        booking: { connect: { id: input.bookingId } },
        amount: input.amount,
        method: PaymentMethod.ONLINE,
        gatewayOrderId: input.gatewayOrderId,
        status: PaymentStatus.PENDING,
      },
    });
  }

  findById(id: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { id } });
  }

  findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { bookingId } });
  }

  findByGatewayOrderId(gatewayOrderId: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { gatewayOrderId } });
  }

  findByGatewayPaymentId(gatewayPaymentId: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { gatewayPaymentId } });
  }

  async update(id: string, data: PaymentUpdateData): Promise<Payment> {
    try {
      return await this.db.payment.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Payment', id);
      }
      throw error;
    }
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    return this.update(id, { status });
  }

  async updateTransaction(
    id: string,
    data: {
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      transactionId?: string;
      status?: PaymentStatus;
      paidAt?: Date | null;
    },
  ): Promise<Payment> {
    return this.update(id, data);
  }

  async markPaid(id: string, input: MarkPaidInput): Promise<Payment> {
    return this.update(id, {
      status: PaymentStatus.PAID,
      gatewayPaymentId: input.gatewayPaymentId,
      transactionId: input.gatewayPaymentId,
      paidAt: input.paidAt ?? new Date(),
    });
  }

  async markFailed(id: string): Promise<Payment> {
    return this.update(id, {
      status: PaymentStatus.FAILED,
      paidAt: null,
    });
  }

  async delete(id: string): Promise<Payment> {
    try {
      return await this.db.payment.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Payment', id);
      }
      throw error;
    }
  }
}

export const paymentRepository = new PaymentRepository();
