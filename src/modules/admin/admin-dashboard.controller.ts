import type { Request, Response, RequestHandler } from 'express';
import { adminDashboardService } from '@/modules/admin/admin-dashboard.service.js';
import { adminRevenueQuerySchema } from '@/modules/admin/admin-dashboard.validation.js';
import { sendSuccess } from '@/utils/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';

export const getDashboard: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const summary = await adminDashboardService.getDashboardSummary(
      req.user!.userId,
    );
    sendSuccess(res, summary, 'Dashboard summary retrieved successfully');
  },
);

export const getRevenue: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = adminRevenueQuerySchema.shape.query.parse(req.query);

    const summary = await adminDashboardService.getRevenue(
      req.user!.userId,
      query,
    );

    sendSuccess(res, summary, 'Revenue summary retrieved successfully');
  },
);
