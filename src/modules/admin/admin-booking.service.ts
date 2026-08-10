import { PaymentStatus, PaymentMethod } from '@/generated/prisma/client.js';
import { logger } from '@/core/logger.js';
import {
  BookingNotFoundError,
  PaymentUpdateError,
} from '@/domain/errors.js';
import {
  type AdminBookingFilter,
  BookingRepository,
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';
import {
  PaymentRepository,
  type IPaymentRepository,
  paymentRepository,
} from '@/modules/payment/payment.repository.js';
import {
  type INotificationService,
  notificationService,
} from '@/modules/notification/notification.service.js';
import {
  toAdminBookingDetails,
  toAdminBookingListItem,
} from '@/modules/admin/admin-dashboard.mapper.js';
import type { AdminBookingListQuery } from '@/modules/admin/admin-dashboard.validation.js';
import { adminDashboardService } from '@/modules/admin/admin-dashboard.service.js';
import { runInTransaction } from '@/repositories/transaction.js';
import {
  normalizePagination,
  toPaginatedResult,
  type PaginatedResult,
} from '@/utils/pagination.util.js';

export type AdminUpdateBookingInput = {
  devoteeName?: string;
  mobileNumber?: string;
  address?: string;
  notes?: string | null;
};

export interface IAdminBookingService {
  listBookings(
    adminId: string,
    query: AdminBookingListQuery,
  ): Promise<PaginatedResult<ReturnType<typeof toAdminBookingListItem>>>;
  listPaidBookings(
    adminId: string,
    query: AdminBookingListQuery,
  ): Promise<PaginatedResult<ReturnType<typeof toAdminBookingListItem>>>;
  listUnpaidBookings(
    adminId: string,
    query: AdminBookingListQuery,
  ): Promise<PaginatedResult<ReturnType<typeof toAdminBookingListItem>>>;
  getBookingDetails(
    adminId: string,
    bookingId: string,
  ): Promise<ReturnType<typeof toAdminBookingDetails>>;
  updateBooking(
    adminId: string,
    bookingId: string,
    input: AdminUpdateBookingInput,
  ): Promise<ReturnType<typeof toAdminBookingDetails>>;
  updatePaymentStatus(
    adminId: string,
    bookingId: string,
    paymentStatus: typeof PaymentStatus.PAID | typeof PaymentStatus.PENDING,
  ): Promise<ReturnType<typeof toAdminBookingDetails>>;
}

export class AdminBookingService implements IAdminBookingService {
  constructor(
    private readonly bookings: IBookingRepository = bookingRepository,
    private readonly payments: IPaymentRepository = paymentRepository,
    private readonly notifications: INotificationService = notificationService,
  ) {}

  async listBookings(adminId: string, query: AdminBookingListQuery) {
    return this.fetchPaginatedBookings(adminId, query);
  }

  async listPaidBookings(adminId: string, query: AdminBookingListQuery) {
    return this.fetchPaginatedBookings(adminId, query, PaymentStatus.PAID);
  }

  async listUnpaidBookings(adminId: string, query: AdminBookingListQuery) {
    return this.fetchPaginatedBookings(adminId, query, PaymentStatus.PENDING);
  }

  async getBookingDetails(adminId: string, bookingId: string) {
    const record = await this.requireBookingWithRelations(bookingId);

    logger.info({ adminId, bookingId }, 'Admin booking details accessed');

    return toAdminBookingDetails(record);
  }

  async updateBooking(
    adminId: string,
    bookingId: string,
    input: AdminUpdateBookingInput,
  ) {
    const existing = await this.bookings.findById(bookingId);
    if (!existing) {
      throw new BookingNotFoundError(bookingId);
    }

    if (
      input.devoteeName !== undefined ||
      input.mobileNumber !== undefined ||
      input.address !== undefined ||
      input.notes !== undefined
    ) {
      await this.bookings.update(bookingId, {
        ...(input.devoteeName !== undefined ? { devoteeName: input.devoteeName } : {}),
        ...(input.mobileNumber !== undefined ? { mobileNumber: input.mobileNumber } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      });
    }

    logger.info({ adminId, bookingId }, 'Admin updated booking');

    return this.getBookingDetails(adminId, bookingId);
  }

  async updatePaymentStatus(
    adminId: string,
    bookingId: string,
    paymentStatus: typeof PaymentStatus.PAID | typeof PaymentStatus.PENDING,
  ) {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    if (paymentStatus === PaymentStatus.PAID) {
      const result = await this.markBookingPaid(bookingId, booking.totalAmount);

      void this.notifications.notifyPaymentSuccess({
        bookingNumber: booking.bookingNumber,
        amountPaise: result.payment.amount,
        paymentMethod: result.payment.method,
        paymentId: result.payment.transactionId ?? result.payment.id,
        transactionTime: result.payment.paidAt ?? new Date(),
      });

      logger.info({ adminId, bookingId, paymentStatus }, 'Admin marked booking as PAID');
    } else {
      await this.markBookingPending(bookingId);
      logger.info({ adminId, bookingId, paymentStatus }, 'Admin marked booking as PENDING');
    }

    return this.getBookingDetails(adminId, bookingId);
  }

  private async fetchPaginatedBookings(
    adminId: string,
    query: AdminBookingListQuery,
    paymentStatusOverride?: AdminBookingFilter['paymentStatus'],
  ) {
    const filter = adminDashboardService.buildBookingListFilter(
      query,
      paymentStatusOverride,
    );

    const [items, totalRecords] = await Promise.all([
      this.bookings.findManyForAdmin(filter),
      this.bookings.countForAdmin(filter),
    ]);

    logger.info(
      { adminId, page: filter.page, limit: filter.limit, paymentStatus: paymentStatusOverride },
      'Admin booking list accessed',
    );

    return toPaginatedResult(
      items.map(toAdminBookingListItem),
      totalRecords,
      filter.page,
      filter.limit,
    );
  }

  private async requireBookingWithRelations(bookingId: string) {
    const record = await this.bookings.findByIdWithRelations(bookingId);
    if (!record) {
      throw new BookingNotFoundError(bookingId);
    }
    return record;
  }

  private async markBookingPaid(bookingId: string, amount: number) {
    try {
      return await runInTransaction(async (tx) => {
        const bookingRepo = new BookingRepository(tx);
        const paymentRepo = new PaymentRepository(tx);

        await bookingRepo.updatePaymentStatus(bookingId, PaymentStatus.PAID);

        let payment = await paymentRepo.findByBookingId(bookingId);

        if (!payment) {
          payment = await paymentRepo.create({
            booking: { connect: { id: bookingId } },
            amount,
            method: PaymentMethod.CASH,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            transactionId: `manual-${Date.now()}`,
          });
        } else {
          payment = await paymentRepo.update(payment.id, {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            method: PaymentMethod.CASH,
            transactionId: payment.transactionId ?? `manual-${Date.now()}`,
          });
        }

        return { payment };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new PaymentUpdateError(message);
    }
  }

  private async markBookingPending(bookingId: string) {
    try {
      await runInTransaction(async (tx) => {
        const bookingRepo = new BookingRepository(tx);
        const paymentRepo = new PaymentRepository(tx);

        await bookingRepo.updatePaymentStatus(bookingId, PaymentStatus.PENDING);

        const payment = await paymentRepo.findByBookingId(bookingId);
        if (payment) {
          await paymentRepo.update(payment.id, {
            status: PaymentStatus.PENDING,
            paidAt: null,
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new PaymentUpdateError(message);
    }
  }
}

export const adminBookingService = new AdminBookingService();
