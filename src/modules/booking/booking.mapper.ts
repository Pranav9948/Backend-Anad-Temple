import type { Booking, BookingMember, Payment } from '@/generated/prisma/client.js';
import {
  isBookingCancelled,
  isBookingCheckedOut,
} from '@/domain/errors.js';
import type { BookingDetailsResponse } from '@/modules/booking/booking.service.js';

export function toPublicBookingSummary(booking: Booking) {
  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.paymentStatus,
    paymentStatus: booking.paymentStatus,
    isCancelled: isBookingCancelled(booking.notes),
    isCheckedOut: isBookingCheckedOut(booking.notes),
  };
}

export function toPublicBooking(booking: Booking) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    devoteeName: booking.devoteeName,
    mobileNumber: booking.mobileNumber,
    language: booking.language,
    paymentStatus: booking.paymentStatus,
    totalAmount: booking.totalAmount,
    notes: booking.notes,
    isCancelled: isBookingCancelled(booking.notes),
    isCheckedOut: isBookingCheckedOut(booking.notes),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function toPublicMember(member: BookingMember) {
  return {
    id: member.id,
    bookingId: member.bookingId,
    personName: member.name,
    nakshatra: member.nakshatra,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export function toPublicPayment(payment: Payment | null) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function toPublicBookingDetails(details: BookingDetailsResponse) {
  return {
    booking: toPublicBooking(details),
    members: details.members.map(toPublicMember),
    payment: toPublicPayment(details.payment),
    paymentStatus: details.paymentStatus,
  };
}

export function toCheckoutSummary(details: BookingDetailsResponse) {
  const memberCount = details.members.length;
  const totalRupees = (details.totalAmount / 100).toFixed(
    details.totalAmount % 100 === 0 ? 0 : 2,
  );

  return {
    booking: toPublicBooking(details),
    members: details.members.map(toPublicMember),
    paymentStatus: details.paymentStatus,
    memberCount,
    message: `Booking created successfully for ${memberCount} member(s). Total amount: ₹${totalRupees}. Please pay in cash at the temple. Payment status remains PENDING.`,
  };
}
