import type { AdminBookingFilter } from '@/modules/booking/booking.repository.js';
import { logger } from '@/core/logger.js';
import { InvalidDateRangeError } from '@/domain/errors.js';
import {
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';
import {
  getISTDayBounds,
  resolveRevenueDateRange,
  type RevenuePeriod,
} from '@/utils/date.util.js';
import { normalizePagination } from '@/utils/pagination.util.js';
import {
  toDashboardResponse,
  toRevenueResponse,
} from '@/modules/admin/admin-dashboard.mapper.js';
import type {
  AdminBookingListQuery,
  AdminRevenueQuery,
} from '@/modules/admin/admin-dashboard.validation.js';
import type { Prisma } from '@/generated/prisma/client.js';

export interface IAdminDashboardService {
  getDashboardSummary(adminId: string): Promise<ReturnType<typeof toDashboardResponse>>;
  getRevenue(
    adminId: string,
    query: AdminRevenueQuery,
  ): Promise<ReturnType<typeof toRevenueResponse>>;
  buildBookingListFilter(
    query: AdminBookingListQuery,
    paymentStatusOverride?: AdminBookingFilter['paymentStatus'],
  ): AdminBookingFilter & ReturnType<typeof normalizePagination>;
}

export class AdminDashboardService implements IAdminDashboardService {
  constructor(private readonly bookings: IBookingRepository = bookingRepository) {}

  async getDashboardSummary(adminId: string) {
    const { start, end } = getISTDayBounds();
    const stats = await this.bookings.getDashboardStats(start, end);

    logger.info({ adminId }, 'Admin dashboard accessed');

    return toDashboardResponse(stats);
  }

  async getRevenue(adminId: string, query: AdminRevenueQuery) {
    let range: { start: Date; end: Date };

    try {
      range = resolveRevenueDateRange({
        period: query.period as RevenuePeriod | undefined,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } catch {
      throw new InvalidDateRangeError('Invalid revenue date range');
    }

    const where: Prisma.BookingWhereInput = {
      createdAt: { gte: range.start, lte: range.end },
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.language ? { language: query.language } : {}),
    };

    const stats = await this.bookings.aggregateRevenue(where);

    logger.info({ adminId, period: query.period ?? 'today' }, 'Admin revenue query');

    return toRevenueResponse(stats);
  }

  buildBookingListFilter(
    query: AdminBookingListQuery,
    paymentStatusOverride?: AdminBookingFilter['paymentStatus'],
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);

    return {
      page,
      limit,
      skip,
      take: limit,
      search: query.search,
      paymentStatus: paymentStatusOverride ?? query.paymentStatus,
      language: query.language,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      bookingKind: query.bookingKind,
      recordStatus: query.recordStatus,
      paymentMethod: query.paymentMethod,
      sortBy: query.sortBy ?? query.sort,
      sortOrder: query.sortOrder,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
