import type { Request, Response, RequestHandler } from 'express';
import type { Nakshatra } from '@/generated/prisma/client.js';
import { bookingMemberService } from '@/modules/booking-member/bookingMember.service.js';
import { toPublicMember } from '@/modules/booking/booking.mapper.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { getRouteParam } from '@/utils/route-params.js';

export const addMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);

    const { personName, nakshatra } = req.body as {
      personName: string;
      nakshatra: Nakshatra;
    };

    const member = await bookingMemberService.addMember(bookingId, {
      name: personName,
      nakshatra,
    });

    sendSuccess(res, toPublicMember(member), 'Member added successfully', 201);
  },
);

export const listMembers: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const members = await bookingMemberService.listMembers(bookingId);

    sendSuccess(
      res,
      members.map(toPublicMember),
      'Members retrieved successfully',
    );
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

    const member = await bookingMemberService.updateMember(
      bookingId,
      memberId,
      {
        ...(personName !== undefined ? { name: personName } : {}),
        ...(nakshatra !== undefined ? { nakshatra } : {}),
      },
    );

    sendSuccess(res, toPublicMember(member), 'Member updated successfully');
  },
);

export const deleteMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = getRouteParam(req.params.bookingId);
    const memberId = getRouteParam(req.params.memberId);
    const member = await bookingMemberService.deleteMember(bookingId, memberId);

    sendSuccess(res, toPublicMember(member), 'Member deleted successfully');
  },
);
