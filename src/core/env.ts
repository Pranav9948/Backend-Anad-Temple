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

  /** Gmail SMTP (or any SMTP) for temple admin email alerts */
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required').default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_PASS: z
    .string()
    .min(1, 'SMTP_PASS is required (use a Gmail App Password)')
    .transform((value) => value.replace(/\s+/g, '').trim())
    .refine(
      (value) =>
        !['replace_with_gmail_app_password', 'your_gmail_app_password'].includes(
          value,
        ),
      'SMTP_PASS is still a placeholder. Generate a Gmail App Password and set it in .env.development',
    )
    .refine(
      (value) => /^[a-zA-Z0-9]{16}$/.test(value),
      'SMTP_PASS must be a 16-character Gmail App Password (letters/numbers only, no ! or other symbols)',
    ),
  EMAIL_FROM: z
    .string()
    .min(1, 'EMAIL_FROM is required')
    .default('Anad Chamundi Temple <anadsreechamundidevi@gmail.com>'),
  TEMPLE_ADMIN_EMAIL: z
    .string()
    .email('TEMPLE_ADMIN_EMAIL must be a valid email')
    .default('anadsreechamundidevi@gmail.com'),
  EMAIL_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int().nonnegative().default(1_000),
});

const serviceRootDir = process.cwd();

export const env = loadAndValidateEnv(envSchema, {
  serviceName: 'temple-backend',
  serviceRootDir,
  nodeEnv: process.env.NODE_ENV,
}).env;

export type Env = z.infer<typeof envSchema>;
