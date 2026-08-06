import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import * as paymentController from '@/modules/payment/payment.controller.js';

const router: ExpressRouter = Router();

router.post('/webhook', paymentController.handleWebhook);

export default router;
