import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import * as healthController from './health.controller.js';

const router: ExpressRouter = Router();

router.get('/', healthController.check);

export default router;
