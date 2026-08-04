import type {
  Booking,
  BookingMember,
  Language,
  Nakshatra,
  Payment,
  PaymentMethod,
} from '@/generated/prisma/client.js';
import { PaymentStatus } from '@/generated/prisma/client.js';
import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  BusinessRuleViolationError,
  CANCELLED_BOOKING_PREFIX,
  CHECKED_OUT_BOOKING_PREFIX,
  DuplicateBookingError,
  isBookingCancelled,
  isBookingCheckedOut,
} from '@/domain/errors.js';
import { BOOKING_PLACEHOLDER_AMOUNT_PAISE } from '@/domain/booking.constants.js';
import { generateUniqueBookingNumber } from '@/domain/helpers.js';
import {
  BookingRepository,
  type BookingListParams,
  type BookingUpdateData,
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';
import {
  BookingMemberRepository,
  type IBookingMemberRepository,
  bookingMemberRepository,
} from '@/modules/booking-member/booking-member.repository.js';
import {
  PaymentRepository,
  type IPaymentRepository,
  paymentRepository,
} from '@/modules/payment/payment.repository.js';
import { runInTransaction } from '@/repositories/transaction.js';

export type CreateBookingMemberInput = {
  name: string;
  nakshatra: Nakshatra;
};

export type CreateBookingInput = {
  devoteeName: string;
  mobileNumber: string;
  language: Language;
  totalAmount: number;
  notes?: string;
  members: CreateBookingMemberInput[];
  initialPayment?: {
    amount: number;
    method: PaymentMethod;
    transactionId?: string;
  };
};

export type BookingDetail = Booking & {
  members: BookingMember[];
};

export type BookingDetailsResponse = BookingDetail & {
  payment: Payment | null;
};

export type CreateInitialBookingInput = {
  devoteeName: string;
  mobileNumber: string;
  language: Language;
};

export interface IBookingService {
  createInitialBooking(input: CreateInitialBookingInput): Promise<Booking>;
  checkoutWithoutPayment(bookingId: string): Promise<BookingDetailsResponse>;
  getBookingDetails(id: string): Promise<BookingDetailsResponse>;
  createBooking(input: CreateBookingInput): Promise<BookingDetail>;
  addBookingMember(
    bookingId: string,
    member: CreateBookingMemberInput,
  ): Promise<BookingMember>;
  removeBookingMember(
    bookingId: string,
    memberId: string,
  ): Promise<BookingMember>;
  updateBooking(id: string, data: BookingUpdateData): Promise<Booking>;
  getBooking(id: string): Promise<BookingDetail>;
  getBookingByMobile(mobileNumber: string): Promise<Booking[]>;
  getAllBookings(params?: BookingListParams): Promise<Booking[]>;
  getPaidBookings(params?: BookingListParams): Promise<Booking[]>;
  getPendingBookings(params?: BookingListParams): Promise<Booking[]>;
  markAsPaid(id: string): Promise<Booking>;
  markAsUnpaid(id: string): Promise<Booking>;
  cancelBooking(id: string, reason?: string): Promise<Booking>;
}

export class BookingService implements IBookingService {
  constructor(
    private readonly bookings: IBookingRepository = bookingRepository,
    private readonly members: IBookingMemberRepository = bookingMemberRepository,
    private readonly payments: IPaymentRepository = paymentRepository,
  ) {}

  async createInitialBooking(
    input: CreateInitialBookingInput,
  ): Promise<Booking> {
    const bookingNumber = await generateUniqueBookingNumber(
      async (candidate) => {
        const existing = await this.bookings.findByBookingNumber(candidate);
        return existing !== null;
      },
    );

    const duplicate = await this.bookings.findByBookingNumber(bookingNumber);
    if (duplicate) {
      throw new DuplicateBookingError(bookingNumber);
    }

    return this.bookings.create({
      bookingNumber,
      devoteeName: input.devoteeName.trim(),
      mobileNumber: input.mobileNumber,
      language: input.language,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount: BOOKING_PLACEHOLDER_AMOUNT_PAISE,
    });
  }

  async getBookingDetails(id: string): Promise<BookingDetailsResponse> {
    const booking = await this.getBooking(id);
    const payment = await this.payments.findByBookingId(id);
    return { ...booking, payment };
  }

  async checkoutWithoutPayment(
    bookingId: string,
  ): Promise<BookingDetailsResponse> {
    const booking = await this.getBooking(bookingId);

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(bookingId);
    }

    if (isBookingCheckedOut(booking.notes)) {
      throw new BusinessRuleViolationError(
        'Booking has already been checked out',
      );
    }

    if (booking.members.length === 0) {
      throw new BusinessRuleViolationError(
        'At least one Archana member is required before checkout',
      );
    }

    const checkoutNote = `${CHECKED_OUT_BOOKING_PREFIX} ${new Date().toISOString()}`;
    const notes = booking.notes
      ? `${checkoutNote}\n${booking.notes}`
      : checkoutNote;

    await this.bookings.update(bookingId, {
      notes,
      paymentStatus: PaymentStatus.PENDING,
    });

    return this.getBookingDetails(bookingId);
  }

  async createBooking(input: CreateBookingInput): Promise<BookingDetail> {
    if (input.members.length === 0) {
      throw new BusinessRuleViolationError(
        'At least one Archana member is required for a booking',
      );
    }

    if (input.totalAmount <= 0) {
      throw new BusinessRuleViolationError(
        'Total amount must be greater than zero',
      );
    }

    const bookingNumber = await generateUniqueBookingNumber(
      async (candidate) => {
        const existing = await this.bookings.findByBookingNumber(candidate);
        return existing !== null;
      },
    );

    const duplicate = await this.bookings.findByBookingNumber(bookingNumber);
    if (duplicate) {
      throw new DuplicateBookingError(bookingNumber);
    }

    return runInTransaction(async (tx) => {
      const bookingRepo = new BookingRepository(tx);
      const memberRepo = new BookingMemberRepository(tx);
      const paymentRepo = new PaymentRepository(tx);

      const createdBooking = await bookingRepo.create({
        bookingNumber,
        devoteeName: input.devoteeName,
        mobileNumber: input.mobileNumber,
        language: input.language,
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: input.totalAmount,
        notes: input.notes ?? null,
      });

      await memberRepo.createMany(
        input.members.map((member) => ({
          bookingId: createdBooking.id,
          name: member.name,
          nakshatra: member.nakshatra,
        })),
      );

      if (input.initialPayment) {
        await paymentRepo.create({
          booking: { connect: { id: createdBooking.id } },
          amount: input.initialPayment.amount,
          method: input.initialPayment.method,
          transactionId: input.initialPayment.transactionId ?? null,
          status: PaymentStatus.PENDING,
        });
      }

      const createdMembers = await memberRepo.findByBookingId(
        createdBooking.id,
      );
      return { ...createdBooking, members: createdMembers };
    });
  }

  async addBookingMember(
    bookingId: string,
    member: CreateBookingMemberInput,
  ): Promise<BookingMember> {
    const booking = await this.requireActiveBooking(bookingId);

    return this.members.create({
      name: member.name,
      nakshatra: member.nakshatra,
      booking: { connect: { id: booking.id } },
    });
  }

  async removeBookingMember(
    bookingId: string,
    memberId: string,
  ): Promise<BookingMember> {
    await this.requireActiveBooking(bookingId);

    const members = await this.members.findByBookingId(bookingId);
    const target = members.find((item) => item.id === memberId);

    if (!target) {
      throw new BusinessRuleViolationError(
        `Member ${memberId} does not belong to booking ${bookingId}`,
      );
    }

    if (members.length <= 1) {
      throw new BusinessRuleViolationError(
        'Cannot remove the last member from a booking',
      );
    }

    return this.members.delete(memberId);
  }

  async updateBooking(id: string, data: BookingUpdateData): Promise<Booking> {
    await this.requireActiveBooking(id);
    return this.bookings.update(id, data);
  }

  async getBooking(id: string): Promise<BookingDetail> {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new BookingNotFoundError(id);
    }

    const members = await this.members.findByBookingId(id);
    return { ...booking, members };
  }

  getBookingByMobile(mobileNumber: string): Promise<Booking[]> {
    return this.bookings.findByMobile(mobileNumber);
  }

  getAllBookings(params?: BookingListParams): Promise<Booking[]> {
    return this.bookings.getAll(params);
  }

  getPaidBookings(params?: BookingListParams): Promise<Booking[]> {
    return this.bookings.getPaidBookings(params);
  }

  getPendingBookings(params?: BookingListParams): Promise<Booking[]> {
    return this.bookings.getPendingBookings(params);
  }

  async markAsPaid(id: string): Promise<Booking> {
    await this.requireActiveBooking(id);
    return this.bookings.updatePaymentStatus(id, PaymentStatus.PAID);
  }

  async markAsUnpaid(id: string): Promise<Booking> {
    await this.requireActiveBooking(id);
    return this.bookings.updatePaymentStatus(id, PaymentStatus.PENDING);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const booking = await this.getBooking(id);

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(id);
    }

    const cancellationNote = reason
      ? `${CANCELLED_BOOKING_PREFIX} ${new Date().toISOString()} — ${reason}`
      : `${CANCELLED_BOOKING_PREFIX} ${new Date().toISOString()}`;

    const notes = booking.notes
      ? `${cancellationNote}\n${booking.notes}`
      : cancellationNote;

    return this.bookings.update(id, { notes });
  }

  private async requireActiveBooking(id: string): Promise<Booking> {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new BookingNotFoundError(id);
    }

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(id);
    }

    return booking;
  }
}

export const bookingService = new BookingService();
