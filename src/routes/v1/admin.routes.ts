import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { protectAdmin } from '@/middlewares/auth.middleware.js';
import { validate } from '@/middlewares/validate.middleware.js';
import * as adminDashboardController from '@/modules/admin/admin-dashboard.controller.js';
import * as adminBookingController from '@/modules/admin/admin-booking.controller.js';
import * as adminAuthController from '@/modules/admin/admin-auth.controller.js';
import { loginLimiter } from '@/core/rate-limit.js';
import { adminLoginSchema } from '@/modules/admin/admin-auth.validation.js';
import {
  adminBookingIdParamSchema,
  adminBookingListSchema,
  adminDuplicateMobileParamSchema,
  adminPaidBookingsSchema,
  adminRevenueQuerySchema,
  adminUnpaidBookingsSchema,
  adminUpdateBookingSchema,
  adminUpdatePaymentSchema,
} from '@/modules/admin/admin-dashboard.validation.js';
import {
  addMemberSchema,
  memberParamsSchema,
  updateMemberSchema,
} from '@/modules/booking/booking.validation.js';

const router: ExpressRouter = Router();

// Versioned aliases: POST /api/v1/admin/login|logout
router.post(
  '/login',
  loginLimiter,
  validate(adminLoginSchema),
  adminAuthController.login,
);
router.post('/logout', adminAuthController.logout);
router.get('/me', protectAdmin, adminAuthController.getProfile);

router.use(protectAdmin);

router.get('/dashboard', adminDashboardController.getDashboard);

router.get(
  '/revenue',
  validate(adminRevenueQuerySchema),
  adminDashboardController.getRevenue,
);

router.get(
  '/bookings/paid',
  validate(adminPaidBookingsSchema),
  adminBookingController.listPaidBookings,
);

router.get(
  '/bookings/unpaid',
  validate(adminUnpaidBookingsSchema),
  adminBookingController.listUnpaidBookings,
);

router.get(
  '/bookings/export',
  validate(adminBookingListSchema),
  adminBookingController.exportBookings,
);

router.get(
  '/bookings/duplicates',
  adminBookingController.listDuplicateBookings,
);

router.get(
  '/bookings/duplicates/:mobile',
  validate(adminDuplicateMobileParamSchema),
  adminBookingController.getDuplicateBookingsByMobile,
);

router.get(
  '/bookings',
  validate(adminBookingListSchema),
  adminBookingController.listBookings,
);

router.get(
  '/bookings/:bookingId',
  validate(adminBookingIdParamSchema),
  adminBookingController.getBookingById,
);

router.post(
  '/bookings/:bookingId/members',
  validate(addMemberSchema),
  adminBookingController.addMember,
);

router.patch(
  '/bookings/:bookingId/members/:memberId',
  validate(updateMemberSchema),
  adminBookingController.updateMember,
);

router.delete(
  '/bookings/:bookingId/members/:memberId',
  validate(memberParamsSchema),
  adminBookingController.deleteMember,
);

router.patch(
  '/bookings/:bookingId',
  validate(adminUpdateBookingSchema),
  adminBookingController.updateBooking,
);

router.patch(
  '/bookings/:bookingId/payment',
  validate(adminUpdatePaymentSchema),
  adminBookingController.updateBookingPayment,
);

router.delete(
  '/bookings/:bookingId',
  validate(adminBookingIdParamSchema),
  adminBookingController.deleteBooking,
);

export default router;
