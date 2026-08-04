import type {
  Booking,
  BookingMember,
  Prisma,
} from '@/generated/prisma/client.js';
import { PaymentStatus } from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';
import { runInTransaction } from '@/repositories/transaction.js';

export type BookingCreateData = Prisma.BookingCreateInput;
export type BookingUpdateData = Prisma.BookingUpdateInput;
export type BookingMemberCreateManyData = Omit<
  Prisma.BookingMemberCreateManyInput,
  'bookingId'
>;

export type BookingListParams = {
  skip?: number;
  take?: number;
  orderBy?: Prisma.BookingOrderByWithRelationInput;
};

export type BookingWithMembers = Booking & { members: BookingMember[] };

export interface IBookingRepository {
  create(data: BookingCreateData): Promise<Booking>;
  createWithMembers(
    booking: BookingCreateData,
    members: BookingMemberCreateManyData[],
  ): Promise<BookingWithMembers>;
  findById(id: string): Promise<Booking | null>;
  findByBookingNumber(bookingNumber: string): Promise<Booking | null>;
  findByMobile(mobileNumber: string): Promise<Booking[]>;
  update(id: string, data: BookingUpdateData): Promise<Booking>;
  updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Booking>;
  delete(id: string): Promise<Booking>;
  exists(id: string): Promise<boolean>;
  getAll(params?: BookingListParams): Promise<Booking[]>;
  getPaidBookings(params?: BookingListParams): Promise<Booking[]>;
  getPendingBookings(params?: BookingListParams): Promise<Booking[]>;
  count(): Promise<number>;
  countPaid(): Promise<number>;
  countPending(): Promise<number>;
}

export class BookingRepository
  extends BaseRepository
  implements IBookingRepository
{
  create(data: BookingCreateData): Promise<Booking> {
    return this.db.booking.create({ data });
  }

  createWithMembers(
    booking: BookingCreateData,
    members: BookingMemberCreateManyData[],
  ): Promise<BookingWithMembers> {
    return runInTransaction(async (tx) => {
      const createdBooking = await tx.booking.create({ data: booking });

      if (members.length > 0) {
        await tx.bookingMember.createMany({
          data: members.map((member) => ({
            ...member,
            bookingId: createdBooking.id,
          })),
        });
      }

      const createdMembers = await tx.bookingMember.findMany({
        where: { bookingId: createdBooking.id },
        orderBy: { createdAt: 'asc' },
      });

      return { ...createdBooking, members: createdMembers };
    });
  }

  findById(id: string): Promise<Booking | null> {
    return this.db.booking.findUnique({ where: { id } });
  }

  findByBookingNumber(bookingNumber: string): Promise<Booking | null> {
    return this.db.booking.findUnique({ where: { bookingNumber } });
  }

  findByMobile(mobileNumber: string): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: { mobileNumber },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: BookingUpdateData): Promise<Booking> {
    try {
      return await this.db.booking.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Booking', id);
      }
      throw error;
    }
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Booking> {
    return this.update(id, { paymentStatus });
  }

  async delete(id: string): Promise<Booking> {
    try {
      return await this.db.booking.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('Booking', id);
      }
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.db.booking.findUnique({
      where: { id },
      select: { id: true },
    });
    return record !== null;
  }

  getAll(params: BookingListParams = {}): Promise<Booking[]> {
    return this.db.booking.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
    });
  }

  getPaidBookings(params: BookingListParams = {}): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: { paymentStatus: PaymentStatus.PAID },
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
    });
  }

  getPendingBookings(params: BookingListParams = {}): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: { paymentStatus: PaymentStatus.PENDING },
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
    });
  }

  count(): Promise<number> {
    return this.db.booking.count();
  }

  countPaid(): Promise<number> {
    return this.db.booking.count({
      where: { paymentStatus: PaymentStatus.PAID },
    });
  }

  countPending(): Promise<number> {
    return this.db.booking.count({
      where: { paymentStatus: PaymentStatus.PENDING },
    });
  }
}

export const bookingRepository = new BookingRepository();
