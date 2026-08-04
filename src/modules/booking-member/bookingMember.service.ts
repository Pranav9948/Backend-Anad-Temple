import type { BookingMember, Nakshatra } from '@/generated/prisma/client.js';
import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  BusinessRuleViolationError,
  isBookingCancelled,
} from '@/domain/errors.js';
import {
  type BookingMemberUpdateData,
  type IBookingMemberRepository,
  bookingMemberRepository,
} from '@/modules/booking-member/booking-member.repository.js';
import {
  type IBookingRepository,
  bookingRepository,
} from '@/modules/booking/booking.repository.js';

export type AddMemberInput = {
  name: string;
  nakshatra: Nakshatra;
};

export interface IBookingMemberService {
  addMember(bookingId: string, input: AddMemberInput): Promise<BookingMember>;
  updateMember(
    bookingId: string,
    memberId: string,
    data: BookingMemberUpdateData,
  ): Promise<BookingMember>;
  deleteMember(bookingId: string, memberId: string): Promise<BookingMember>;
  listMembers(bookingId: string): Promise<BookingMember[]>;
}

export class BookingMemberService implements IBookingMemberService {
  constructor(
    private readonly members: IBookingMemberRepository = bookingMemberRepository,
    private readonly bookings: IBookingRepository = bookingRepository,
  ) {}

  async addMember(bookingId: string, input: AddMemberInput): Promise<BookingMember> {
    await this.requireActiveBooking(bookingId);

    if (!input.name.trim()) {
      throw new BusinessRuleViolationError('Member name is required');
    }

    return this.members.create({
      name: input.name.trim(),
      nakshatra: input.nakshatra,
      booking: { connect: { id: bookingId } },
    });
  }

  async updateMember(
    bookingId: string,
    memberId: string,
    data: BookingMemberUpdateData,
  ): Promise<BookingMember> {
    await this.requireActiveBooking(bookingId);
    await this.requireMemberOfBooking(bookingId, memberId);
    return this.members.update(memberId, data);
  }

  async deleteMember(bookingId: string, memberId: string): Promise<BookingMember> {
    await this.requireActiveBooking(bookingId);

    const members = await this.members.findByBookingId(bookingId);
    const target = members.find((member) => member.id === memberId);

    if (!target) {
      throw new BusinessRuleViolationError(
        `Member ${memberId} does not belong to booking ${bookingId}`,
      );
    }

    if (members.length <= 1) {
      throw new BusinessRuleViolationError(
        'Cannot delete the last member from a booking',
      );
    }

    return this.members.delete(memberId);
  }

  async listMembers(bookingId: string): Promise<BookingMember[]> {
    await this.requireBookingExists(bookingId);
    return this.members.findByBookingId(bookingId);
  }

  private async requireBookingExists(bookingId: string): Promise<void> {
    const exists = await this.bookings.exists(bookingId);
    if (!exists) {
      throw new BookingNotFoundError(bookingId);
    }
  }

  private async requireActiveBooking(bookingId: string): Promise<void> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    if (isBookingCancelled(booking.notes)) {
      throw new BookingAlreadyCancelledError(bookingId);
    }
  }

  private async requireMemberOfBooking(
    bookingId: string,
    memberId: string,
  ): Promise<BookingMember> {
    const members = await this.members.findByBookingId(bookingId);
    const member = members.find((item) => item.id === memberId);

    if (!member) {
      throw new BusinessRuleViolationError(
        `Member ${memberId} does not belong to booking ${bookingId}`,
      );
    }

    return member;
  }
}

export const bookingMemberService = new BookingMemberService();
