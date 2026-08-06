import Razorpay from 'razorpay';
import { config } from '@/core/config.js';

export const razorpayClient = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

export const RAZORPAY_CURRENCY = 'INR' as const;
