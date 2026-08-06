import { z } from 'zod';
import { loadAndValidateEnv } from './runtime-env.js';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(4000),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(10, 'JWT_ACCESS_SECRET must be at least 10 characters long'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long'),

  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
});

const serviceRootDir = process.cwd();

export const env = loadAndValidateEnv(envSchema, {
  serviceName: 'temple-backend',
  serviceRootDir,
  nodeEnv: process.env.NODE_ENV,
}).env;

export type Env = z.infer<typeof envSchema>;
