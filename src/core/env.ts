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

  WHATSAPP_PROVIDER: z.enum(['META']).default('META'),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1, 'WHATSAPP_ACCESS_TOKEN is required'),
  WHATSAPP_PHONE_NUMBER_ID: z
    .string()
    .min(1, 'WHATSAPP_PHONE_NUMBER_ID is required'),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  TEMPLE_ADMIN_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, 'TEMPLE_ADMIN_WHATSAPP_NUMBER must be digits with country code'),
  WHATSAPP_RETRY_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .positive()
    .default(3),
  WHATSAPP_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(1_000),
});

const serviceRootDir = process.cwd();

export const env = loadAndValidateEnv(envSchema, {
  serviceName: 'temple-backend',
  serviceRootDir,
  nodeEnv: process.env.NODE_ENV,
}).env;

export type Env = z.infer<typeof envSchema>;
