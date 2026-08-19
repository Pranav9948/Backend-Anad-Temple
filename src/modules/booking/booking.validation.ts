import { z } from 'zod';
import { Language, Nakshatra } from '@/generated/prisma/client.js';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const mobileSchema = z
  .string()
  .trim()
  .regex(INDIAN_MOBILE_REGEX, 'Mobile must be a valid 10-digit Indian number');

export const uuidParamSchema = z.string().uuid('Invalid ID format');

export const languageSchema = z.nativeEnum(Language, {
  message: 'Invalid language',
});

export const nakshatraSchema = z.nativeEnum(Nakshatra, {
  message: 'Invalid nakshatra',
});

export const createBookingSchema = z.object({
  body: z.object({
    devoteeName: z.string().trim().min(1, 'Devotee name is required').max(255),
    mobile: mobileSchema,
    address: z
      .string()
      .trim()
      .min(1, 'Address is required')
      .max(500, 'Address must be at most 500 characters'),
    language: languageSchema,
  }),
});

export const updateBookingSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
  body: z
    .object({
      devoteeName: z.string().trim().min(1).max(255).optional(),
      address: z.string().trim().min(1).max(500).optional(),
      language: languageSchema.optional(),
      notes: z.string().max(2000).optional(),
      totalAmount: z.number().int().positive().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required to update',
    }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
});

export const mobileParamSchema = z.object({
  params: z.object({
    mobile: mobileSchema,
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
  body: z.object({
    personName: z.string().trim().min(1, 'Person name is required').max(255),
    nakshatra: nakshatraSchema,
  }),
});

export const updateMemberSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
    memberId: uuidParamSchema,
  }),
  body: z
    .object({
      personName: z.string().trim().min(1).max(255).optional(),
      nakshatra: nakshatraSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required to update',
    }),
});

export const memberParamsSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
    memberId: uuidParamSchema,
  }),
});

export const checkoutSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
});
