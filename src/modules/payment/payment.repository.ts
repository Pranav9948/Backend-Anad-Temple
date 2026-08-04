import type { Payment, Prisma } from '@/generated/prisma/client.js';
import { PaymentStatus } from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';

export type PaymentCreateData = Prisma.PaymentCreateInput;
export type PaymentUpdateData = Prisma.PaymentUpdateInput;

export interface IPaymentRepository {
  create(data: PaymentCreateData): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByBookingId(bookingId: string): Promise<Payment | null>;
  update(id: string, data: PaymentUpdateData): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus): Promise<Payment>;
  delete(id: string): Promise<Payment>;
}

export class PaymentRepository
  extends BaseRepository
  implements IPaymentRepository
{
  create(data: PaymentCreateData): Promise<Payment> {
    return this.db.payment.create({ data });
  }

  findById(id: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { id } });
  }

  findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.db.payment.findUnique({ where: { bookingId } });
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
