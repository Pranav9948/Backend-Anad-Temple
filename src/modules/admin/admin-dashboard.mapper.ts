import type { Booking, Payment } from '@/generated/prisma/client.js';
import type { BookingWithRelations } from '@/modules/booking/booking.repository.js';
import {
  isBookingCancelled,
  isBookingCheckedOut,
} from '@/domain/errors.js';
import {
  toPublicMember,
  toPublicBooking,
} from '@/modules/booking/booking.mapper.js';

export function toAdminBookingListItem(booking: Booking) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    devoteeName: booking.devoteeName,
    mobileNumber: booking.mobileNumber,
    language: booking.language,
    paymentStatus: booking.paymentStatus,
    totalAmount: booking.totalAmount,
    isCancelled: isBookingCancelled(booking.notes),
    isCheckedOut: isBookingCheckedOut(booking.notes),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function toAdminPaymentDetails(payment: Payment | null) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: 'INR',
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function toAdminBookingDetails(record: BookingWithRelations) {
  return {
    booking: {
      ...toPublicBooking(record),
      bookingStatus: {
        paymentStatus: record.paymentStatus,
        isCancelled: isBookingCancelled(record.notes),
        isCheckedOut: isBookingCheckedOut(record.notes),
      },
    },
    members: record.members.map(toPublicMember),
    payment: toAdminPaymentDetails(record.payment),
  };
}

export function toDashboardResponse(stats: {
  bookingCount: number;
  paidCount: number;
  pendingCount: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  todayBookings: number;
  todayRevenue: number;
  todayPaidRevenue: number;
  todayPendingRevenue: number;
}) {
  return {
    totalBookings: stats.bookingCount,
    totalPaidBookings: stats.paidCount,
    totalUnpaidBookings: stats.pendingCount,
    totalRevenue: stats.totalRevenue,
    paidRevenue: stats.paidRevenue,
    pendingRevenue: stats.pendingRevenue,
    today: {
      bookings: stats.todayBookings,
      revenue: stats.todayRevenue,
      paidRevenue: stats.todayPaidRevenue,
      pendingRevenue: stats.todayPendingRevenue,
    },
  };
}

export function toRevenueResponse(stats: {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  bookingCount: number;
  paidCount: number;
  pendingCount: number;
}) {
  return {
    totalRevenue: stats.totalRevenue,
    paidRevenue: stats.paidRevenue,
    pendingRevenue: stats.pendingRevenue,
    bookingCount: stats.bookingCount,
    paidCount: stats.paidCount,
    pendingCount: stats.pendingCount,
  };
}
