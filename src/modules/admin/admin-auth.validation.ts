import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('A valid admin email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  }),
});

export type AdminLoginBody = z.infer<typeof adminLoginSchema>['body'];
