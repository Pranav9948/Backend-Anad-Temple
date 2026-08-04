import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requireAdmin } from '@/middlewares/auth.middleware.js';
import { validate } from '@/middlewares/validate.middleware.js';
import * as adminDashboardController from '@/modules/admin/admin-dashboard.controller.js';
import * as adminBookingController from '@/modules/admin/admin-booking.controller.js';
import {
  adminBookingIdParamSchema,
  adminBookingListSchema,
  adminPaidBookingsSchema,
  adminRevenueQuerySchema,
  adminUnpaidBookingsSchema,
  adminUpdateBookingSchema,
  adminUpdatePaymentSchema,
} from '@/modules/admin/admin-dashboard.validation.js';

const router: ExpressRouter = Router();

router.use(authenticate, requireAdmin);

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
  '/bookings',
  validate(adminBookingListSchema),
  adminBookingController.listBookings,
);

router.get(
  '/bookings/:bookingId',
  validate(adminBookingIdParamSchema),
  adminBookingController.getBookingById,
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

export default router;
