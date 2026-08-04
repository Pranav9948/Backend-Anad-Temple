export {
  adminService,
  AdminService,
  type IAdminService,
} from '@/modules/admin/admin.service.js';

export {
  bookingService,
  BookingService,
  type BookingDetail,
  type CreateBookingInput,
  type CreateBookingMemberInput,
  type IBookingService,
} from '@/modules/booking/booking.service.js';

export {
  bookingMemberService,
  BookingMemberService,
  type AddMemberInput,
  type IBookingMemberService,
} from '@/modules/booking-member/bookingMember.service.js';

export {
  paymentService,
  PaymentService,
  type CreatePaymentRecordInput,
  type IPaymentService,
} from '@/modules/payment/payment.service.js';

export {
  otpService,
  OtpService,
  type GeneratedOtpResult,
  type IOtpService,
} from '@/modules/otp/otp.service.js';

export {
  notificationService,
  NotificationService,
  type INotificationService,
} from '@/modules/notification/notification.service.js';

export * from '@/domain/errors.js';
