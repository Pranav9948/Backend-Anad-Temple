import type { Request, Response, RequestHandler } from 'express';
import { PaymentStatus } from '@/generated/prisma/client.js';
import type { Nakshatra } from '@/generated/prisma/client.js';
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

export const exportBookings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = adminBookingListQuerySchema.parse(req.query);
    const result = await adminBookingService.exportBookings(
      req.user!.userId,
      query,
    );
    sendSuccess(res, result, 'Bookings exported successfully');
  },
);

export const listDuplicateBookings: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminBookingService.listDuplicateGroups(
      req.user!.userId,
    );
    sendSuccess(res, result, 'Duplicate bookings retrieved successfully');
  },
);

export const getDuplicateBookingsByMobile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const mobile = getRouteParam(req.params.mobile);
    const result = await adminBookingService.getDuplicateGroup(
      req.user!.userId,
      mobile,
    );
    sendSuccess(res, result, 'Duplicate booking group retrieved successfully');
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

export const addMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const { personName, nakshatra } = req.body as {
      personName: string;
      nakshatra: Nakshatra;
    };

    const details = await adminBookingService.addMember(
      req.user!.userId,
      bookingId,
      { name: personName, nakshatra },
    );

    sendSuccess(res, details, 'Member added successfully', 201);
  },
);

export const updateMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const memberId = getRouteParam(req.params.memberId);
    const { personName, nakshatra } = req.body as {
      personName?: string;
      nakshatra?: Nakshatra;
    };

    const details = await adminBookingService.updateMember(
      req.user!.userId,
      bookingId,
      memberId,
      {
        ...(personName !== undefined ? { name: personName } : {}),
        ...(nakshatra !== undefined ? { nakshatra } : {}),
      },
    );

    sendSuccess(res, details, 'Member updated successfully');
  },
);

export const deleteMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const memberId = getRouteParam(req.params.memberId);

    const details = await adminBookingService.deleteMember(
      req.user!.userId,
      bookingId,
      memberId,
    );

    sendSuccess(res, details, 'Member deleted successfully');
  },
);

export const deleteBooking: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const result = await adminBookingService.deleteBooking(
      req.user!.userId,
      bookingId,
    );
    sendSuccess(res, result, 'Booking deleted successfully');
  },
);
