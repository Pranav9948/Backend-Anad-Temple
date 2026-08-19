import type { Payment } from '@/generated/prisma/client.js';
import type {
  AdminBookingListRecord,
  BookingWithMembers,
  BookingWithRelations,
} from '@/modules/booking/booking.repository.js';
import {
  isBookingCancelled,
  isBookingCheckedOut,
} from '@/domain/errors.js';
import {
  calculateHomamTotalPaise,
  FAMILY_BOOKING_MIN_MEMBERS,
} from '@/domain/booking.constants.js';
import {
  toPublicMember,
  toPublicBooking,
} from '@/modules/booking/booking.mapper.js';

export function toAdminBookingListItem(booking: AdminBookingListRecord) {
  const memberCount = booking._count.members;
  const bookingKind =
    memberCount >= FAMILY_BOOKING_MIN_MEMBERS ? 'family' : 'individual';

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    devoteeName: booking.devoteeName,
    mobileNumber: booking.mobileNumber,
    address: booking.address,
    language: booking.language,
    paymentStatus: booking.paymentStatus,
    totalAmount: calculateHomamTotalPaise(memberCount),
    memberCount,
    bookingKind,
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

function toAdminDuplicateBookingSummary(booking: BookingWithMembers) {
  const memberCount = booking.members.length;
  const bookingKind =
    memberCount >= FAMILY_BOOKING_MIN_MEMBERS ? 'family' : 'individual';

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    devoteeName: booking.devoteeName,
    paymentStatus: booking.paymentStatus,
    totalAmount: calculateHomamTotalPaise(memberCount),
    memberCount,
    bookingKind,
    createdAt: booking.createdAt,
  };
}

export function toAdminDuplicateListGroup(
  mobileNumber: string,
  bookings: BookingWithMembers[],
) {
  return {
    mobileNumber,
    count: bookings.length,
    devoteeNames: [...new Set(bookings.map((booking) => booking.devoteeName))],
    bookings: bookings.map(toAdminDuplicateBookingSummary),
  };
}

export function toAdminDuplicateCompareBooking(booking: BookingWithMembers) {
  return {
    ...toAdminDuplicateBookingSummary(booking),
    mobileNumber: booking.mobileNumber,
    address: booking.address,
    language: booking.language,
    notes: booking.notes,
    isCancelled: isBookingCancelled(booking.notes),
    isCheckedOut: isBookingCheckedOut(booking.notes),
    members: booking.members.map(toPublicMember),
  };
}

export function toAdminDuplicateCompareGroup(
  mobileNumber: string,
  bookings: BookingWithMembers[],
) {
  return {
    mobileNumber,
    count: bookings.length,
    devoteeNames: [...new Set(bookings.map((booking) => booking.devoteeName))],
    bookings: bookings.map(toAdminDuplicateCompareBooking),
  };
}

export function toAdminBookingExportItem(booking: BookingWithMembers) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    devoteeName: booking.devoteeName,
    mobileNumber: booking.mobileNumber,
    paymentStatus: booking.paymentStatus,
    totalAmount: calculateHomamTotalPaise(booking.members.length),
    members: booking.members.map((member) => ({
      personName: member.name,
      nakshatra: member.nakshatra,
    })),
  };
}

export function toAdminBookingDetails(record: BookingWithRelations) {
  const priced = {
    ...record,
    totalAmount: calculateHomamTotalPaise(record.members.length),
  };

  return {
    booking: {
      ...toPublicBooking(priced),
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
