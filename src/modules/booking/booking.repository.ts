import type {
  Booking,
  BookingMember,
  Language,
  Payment,
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

export type AdminBookingSortField =
  | 'createdAt'
  | 'devoteeName'
  | 'bookingNumber'
  | 'amount';

export type AdminBookingFilter = {
  search?: string;
  paymentStatus?: PaymentStatus;
  language?: Language;
  dateFrom?: Date;
  dateTo?: Date;
  skip?: number;
  take?: number;
  sortBy?: AdminBookingSortField;
  sortOrder?: 'asc' | 'desc';
};

export type BookingWithRelations = Booking & {
  members: BookingMember[];
  payment: Payment | null;
};

export type RevenueAggregate = {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  bookingCount: number;
  paidCount: number;
  pendingCount: number;
};

export type DashboardStats = RevenueAggregate & {
  todayBookings: number;
  todayRevenue: number;
  todayPaidRevenue: number;
  todayPendingRevenue: number;
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
  findManyForAdmin(filter: AdminBookingFilter): Promise<Booking[]>;
  countForAdmin(filter: AdminBookingFilter): Promise<number>;
  findByIdWithRelations(id: string): Promise<BookingWithRelations | null>;
  aggregateRevenue(where?: Prisma.BookingWhereInput): Promise<RevenueAggregate>;
  getDashboardStats(todayStart: Date, todayEnd: Date): Promise<DashboardStats>;
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

  findManyForAdmin(filter: AdminBookingFilter): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: buildAdminBookingWhere(filter),
      skip: filter.skip,
      take: filter.take,
      orderBy: buildAdminBookingOrderBy(filter.sortBy, filter.sortOrder),
    });
  }

  countForAdmin(filter: AdminBookingFilter): Promise<number> {
    return this.db.booking.count({
      where: buildAdminBookingWhere(filter),
    });
  }

  findByIdWithRelations(id: string): Promise<BookingWithRelations | null> {
    return this.db.booking.findUnique({
      where: { id },
      include: {
        members: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });
  }

  async aggregateRevenue(
    where: Prisma.BookingWhereInput = {},
  ): Promise<RevenueAggregate> {
    const [total, paid, pending] = await Promise.all([
      this.db.booking.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.db.booking.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.PAID },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.db.booking.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.PENDING },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      totalRevenue: total._sum.totalAmount ?? 0,
      paidRevenue: paid._sum.totalAmount ?? 0,
      pendingRevenue: pending._sum.totalAmount ?? 0,
      bookingCount: total._count._all,
      paidCount: paid._count._all,
      pendingCount: pending._count._all,
    };
  }

  async getDashboardStats(
    todayStart: Date,
    todayEnd: Date,
  ): Promise<DashboardStats> {
    const [overall, today] = await Promise.all([
      this.aggregateRevenue(),
      this.aggregateRevenue({
        createdAt: { gte: todayStart, lte: todayEnd },
      }),
    ]);

    return {
      ...overall,
      todayBookings: today.bookingCount,
      todayRevenue: today.totalRevenue,
      todayPaidRevenue: today.paidRevenue,
      todayPendingRevenue: today.pendingRevenue,
    };
  }
}

function buildAdminBookingWhere(
  filter: AdminBookingFilter,
): Prisma.BookingWhereInput {
  const conditions: Prisma.BookingWhereInput[] = [];

  if (filter.paymentStatus) {
    conditions.push({ paymentStatus: filter.paymentStatus });
  }

  if (filter.language) {
    conditions.push({ language: filter.language });
  }

  if (filter.dateFrom || filter.dateTo) {
    conditions.push({
      createdAt: {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      },
    });
  }

  if (filter.search) {
    const term = filter.search.trim();
    conditions.push({
      OR: [
        { bookingNumber: { contains: term, mode: 'insensitive' } },
        { devoteeName: { contains: term, mode: 'insensitive' } },
        { mobileNumber: { contains: term } },
      ],
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  return { AND: conditions };
}

function buildAdminBookingOrderBy(
  sortBy: AdminBookingSortField = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Prisma.BookingOrderByWithRelationInput {
  if (sortBy === 'amount') {
    return { totalAmount: sortOrder };
  }

  return { [sortBy]: sortOrder };
}

export const bookingRepository = new BookingRepository();
