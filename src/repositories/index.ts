export { BaseRepository, type DbClient } from './base.repository.js';
export {
  RepositoryConflictError,
  RepositoryNotFoundError,
  isPrismaNotFoundError,
} from './errors.js';
export { runInTransaction } from './transaction.js';

export {
  AdminRepository,
  adminRepository,
  type AdminCreateData,
  type AdminUpdateData,
  type IAdminRepository,
} from '@/modules/admin/admin.repository.js';

export {
  BookingRepository,
  bookingRepository,
  type BookingCreateData,
  type BookingListParams,
  type BookingMemberCreateManyData as BookingMemberInputForTransaction,
  type BookingUpdateData,
  type BookingWithMembers,
  type IBookingRepository,
} from '@/modules/booking/booking.repository.js';

export {
  BookingMemberRepository,
  bookingMemberRepository,
  type BookingMemberCreateData,
  type BookingMemberCreateManyData,
  type BookingMemberUpdateData,
  type IBookingMemberRepository,
} from '@/modules/booking-member/booking-member.repository.js';

export {
  PaymentRepository,
  paymentRepository,
  type IPaymentRepository,
  type PaymentCreateData,
  type PaymentUpdateData,
} from '@/modules/payment/payment.repository.js';

export {
  OtpRepository,
  otpRepository,
  type IOtpRepository,
  type OtpCreateData,
  type OtpUpdateData,
} from '@/modules/otp/otp.repository.js';
