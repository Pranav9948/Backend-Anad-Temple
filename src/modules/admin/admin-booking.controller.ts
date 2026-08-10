import type { Request, Response, RequestHandler } from 'express';
import { PaymentStatus } from '@/generated/prisma/client.js';
import { adminBookingService } from '@/modules/admin/admin-booking.service.js';
import { adminBookingListQuerySchema } from '@/modules/admin/admin-dashboard.validation.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { getRouteParam } from '@/utils/route-params.js';

export const listBookings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = adminBookingListQuerySchema.parse(req.query);

    const result = await adminBookingService.listBookings(req.user!.userId, query);

    sendSuccess(res, result, 'Bookings retrieved successfully');
  },
);

export const listPaidBookings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = adminBookingListQuerySchema.parse(req.query);

    const result = await adminBookingService.listPaidBookings(req.user!.userId, query);

    sendSuccess(res, result, 'Paid bookings retrieved successfully');
  },
);

export const listUnpaidBookings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = adminBookingListQuerySchema.parse(req.query);

    const result = await adminBookingService.listUnpaidBookings(req.user!.userId, query);

    sendSuccess(res, result, 'Unpaid bookings retrieved successfully');
  },
);

export const getBookingById: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const details = await adminBookingService.getBookingDetails(
      req.user!.userId,
      bookingId,
    );
    sendSuccess(res, details, 'Booking details retrieved successfully');
  },
);

export const updateBooking: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const { devoteeName, mobile, address, notes } = req.body as {
      devoteeName?: string;
      mobile?: string;
      address?: string;
      notes?: string | null;
    };

    const details = await adminBookingService.updateBooking(
      req.user!.userId,
      bookingId,
      {
        ...(devoteeName !== undefined ? { devoteeName } : {}),
        ...(mobile !== undefined ? { mobileNumber: mobile } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    );

    sendSuccess(res, details, 'Booking updated successfully');
  },
);

export const updateBookingPayment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const { paymentStatus } = req.body as {
      paymentStatus: typeof PaymentStatus.PAID | typeof PaymentStatus.PENDING;
    };

    const details = await adminBookingService.updatePaymentStatus(
      req.user!.userId,
      bookingId,
      paymentStatus,
    );

    sendSuccess(res, details, 'Booking payment status updated successfully');
  },
);
