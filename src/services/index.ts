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

export {
  adminAuthService,
  AdminAuthService,
  type IAdminAuthService,
} from '@/modules/admin/admin-auth.service.js';

export {
  adminDashboardService,
  AdminDashboardService,
  type IAdminDashboardService,
} from '@/modules/admin/admin-dashboard.service.js';

export {
  adminBookingService,
  AdminBookingService,
  type IAdminBookingService,
} from '@/modules/admin/admin-booking.service.js';

export * from '@/domain/errors.js';
