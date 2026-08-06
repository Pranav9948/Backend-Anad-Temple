import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { validate } from '@/middlewares/validate.middleware.js';
import * as bookingController from '@/modules/booking/booking.controller.js';
import * as bookingMemberController from '@/modules/booking-member/booking-member.controller.js';
import {
  addMemberSchema,
  bookingIdParamSchema,
  checkoutSchema,
  createBookingSchema,
  memberParamsSchema,
  mobileParamSchema,
  updateBookingSchema,
  updateMemberSchema,
} from '@/modules/booking/booking.validation.js';

const router: ExpressRouter = Router();

router.post('/', validate(createBookingSchema), bookingController.createBooking);

router.get(
  '/mobile/:mobile',
  validate(mobileParamSchema),
  bookingController.getBookingsByMobile,
);

router.get(
  '/:bookingId',
  validate(bookingIdParamSchema),
  bookingController.getBookingById,
);

router.patch(
  '/:bookingId',
  validate(updateBookingSchema),
  bookingController.updateBooking,
);

router.post(
  '/:bookingId/checkout',
  validate(checkoutSchema),
  bookingController.checkoutBooking,
);

router.post(
  '/:bookingId/members',
  validate(addMemberSchema),
  bookingMemberController.addMember,
);

router.get(
  '/:bookingId/members',
  validate(bookingIdParamSchema),
  bookingMemberController.listMembers,
);

router.patch(
  '/:bookingId/members/:memberId',
  validate(updateMemberSchema),
  bookingMemberController.updateMember,
);

router.delete(
  '/:bookingId/members/:memberId',
  validate(memberParamsSchema),
  bookingMemberController.deleteMember,
);

export default router;
