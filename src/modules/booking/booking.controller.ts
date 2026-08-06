import type { Request, Response, RequestHandler } from 'express';
import type { Language } from '@/generated/prisma/client.js';
import { bookingService } from '@/modules/booking/booking.service.js';
import {
  toCheckoutSummary,
  toPublicBooking,
  toPublicBookingDetails,
  toPublicBookingSummary,
} from '@/modules/booking/booking.mapper.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { getRouteParam } from '@/utils/route-params.js';

export const createBooking: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { devoteeName, mobile, language } = req.body as {
      devoteeName: string;
      mobile: string;
      language: Language;
    };

    const booking = await bookingService.createInitialBooking({
      devoteeName,
      mobileNumber: mobile,
      language,
    });

    sendSuccess(
      res,
      toPublicBookingSummary(booking),
      'Booking created successfully',
      201,
    );
  },
);

export const getBookingById: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const details = await bookingService.getBookingDetails(bookingId);
    sendSuccess(
      res,
      toPublicBookingDetails(details),
      'Booking retrieved successfully',
    );
  },
);

export const getBookingsByMobile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const mobile = getRouteParam(req.params.mobile);
    const bookings = await bookingService.getBookingByMobile(mobile);

    sendSuccess(
      res,
      bookings.map(toPublicBooking),
      'Bookings retrieved successfully',
    );
  },
);

export const updateBooking: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const { devoteeName, language, notes, totalAmount } = req.body as {
      devoteeName?: string;
      language?: Language;
      notes?: string;
      totalAmount?: number;
    };

    const booking = await bookingService.updateBooking(bookingId, {
      ...(devoteeName !== undefined ? { devoteeName } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(totalAmount !== undefined ? { totalAmount } : {}),
    });

    sendSuccess(res, toPublicBooking(booking), 'Booking updated successfully');
  },
);

export const checkoutBooking: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const details = await bookingService.checkoutWithoutPayment(bookingId);
    sendSuccess(res, toCheckoutSummary(details), 'Booking checkout completed');
  },
);
