import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import healthRoutes from '../../modules/health/index.js';

const router: ExpressRouter = Router();
router.use('/health', healthRoutes);
export default router;
