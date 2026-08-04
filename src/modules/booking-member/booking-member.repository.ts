import type {
  BookingMember,
  Prisma,
} from '@/generated/prisma/client.js';
import { BaseRepository } from '@/repositories/base.repository.js';
import {
  isPrismaNotFoundError,
  RepositoryNotFoundError,
} from '@/repositories/errors.js';

export type BookingMemberCreateData = Prisma.BookingMemberCreateInput;
export type BookingMemberCreateManyData = Prisma.BookingMemberCreateManyInput;
export type BookingMemberUpdateData = Prisma.BookingMemberUpdateInput;

export interface IBookingMemberRepository {
  create(data: BookingMemberCreateData): Promise<BookingMember>;
  createMany(data: BookingMemberCreateManyData[]): Promise<Prisma.BatchPayload>;
  findByBookingId(bookingId: string): Promise<BookingMember[]>;
  update(id: string, data: BookingMemberUpdateData): Promise<BookingMember>;
  delete(id: string): Promise<BookingMember>;
  deleteMany(bookingId: string): Promise<Prisma.BatchPayload>;
}

export class BookingMemberRepository
  extends BaseRepository
  implements IBookingMemberRepository
{
  create(data: BookingMemberCreateData): Promise<BookingMember> {
    return this.db.bookingMember.create({ data });
  }

  createMany(data: BookingMemberCreateManyData[]): Promise<Prisma.BatchPayload> {
    return this.db.bookingMember.createMany({ data });
  }

  findByBookingId(bookingId: string): Promise<BookingMember[]> {
    return this.db.bookingMember.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: BookingMemberUpdateData): Promise<BookingMember> {
    try {
      return await this.db.bookingMember.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('BookingMember', id);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<BookingMember> {
    try {
      return await this.db.bookingMember.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new RepositoryNotFoundError('BookingMember', id);
      }
      throw error;
    }
  }

  deleteMany(bookingId: string): Promise<Prisma.BatchPayload> {
    return this.db.bookingMember.deleteMany({ where: { bookingId } });
  }
}

export const bookingMemberRepository = new BookingMemberRepository();
