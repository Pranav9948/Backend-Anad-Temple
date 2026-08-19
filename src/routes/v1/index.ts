import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import healthRoutes from '../../modules/health/index.js';
import bookingRoutes from './booking.routes.js';
import adminRoutes from './admin.routes.js';

const router: ExpressRouter = Router();
router.use('/health', healthRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);
export default router;
