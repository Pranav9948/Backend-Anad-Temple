import { z } from 'zod';
import { Language, PaymentStatus } from '@/generated/prisma/client.js';
import { mobileSchema, uuidParamSchema } from '@/modules/booking/booking.validation.js';

const pageSchema = z.coerce.number().int().positive().default(1);
const limitSchema = z.coerce.number().int().positive().max(100).default(20);

const sortBySchema = z.enum(['createdAt', 'devoteeName', 'bookingNumber', 'amount']).default('createdAt');
const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

const optionalDateSchema = z
  .string()
  .datetime({ message: 'Invalid ISO date format' })
  .transform((value) => new Date(value))
  .optional();

const adminBookingListQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: z.string().trim().min(1).optional(),
  sort: sortBySchema.optional(),
  sortBy: sortBySchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  language: z.nativeEnum(Language).optional(),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
});

export const adminBookingListSchema = z.object({
  query: adminBookingListQuerySchema,
});

export { adminBookingListQuerySchema };

export const adminPaidBookingsSchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    sort: sortBySchema.optional(),
    sortBy: sortBySchema.optional(),
    sortOrder: sortOrderSchema.optional(),
  }),
});

export const adminUnpaidBookingsSchema = adminPaidBookingsSchema;

export const adminBookingIdParamSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
});

export const adminUpdateBookingSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
  body: z
    .object({
      devoteeName: z.string().trim().min(1).max(255).optional(),
      mobile: mobileSchema.optional(),
      address: z.string().trim().min(1).max(500).optional(),
      notes: z.string().max(2000).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required to update',
    }),
});

export const adminUpdatePaymentSchema = z.object({
  params: z.object({
    bookingId: uuidParamSchema,
  }),
  body: z.object({
    paymentStatus: z.enum([PaymentStatus.PAID, PaymentStatus.PENDING], {
      message: 'paymentStatus must be PAID or PENDING',
    }),
  }),
});

export const adminRevenueQuerySchema = z.object({
  query: z
    .object({
      period: z.enum(['today', 'week', 'month', 'custom']).optional(),
      dateFrom: optionalDateSchema,
      dateTo: optionalDateSchema,
      paymentStatus: z.nativeEnum(PaymentStatus).optional(),
      language: z.nativeEnum(Language).optional(),
    })
    .superRefine((query, ctx) => {
      if (query.period === 'custom' && (!query.dateFrom || !query.dateTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dateFrom and dateTo are required when period is custom',
          path: ['dateFrom'],
        });
      }

      if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dateFrom must be before or equal to dateTo',
          path: ['dateFrom'],
        });
      }
    }),
});

export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;
export type AdminRevenueQuery = z.infer<typeof adminRevenueQuerySchema>['query'];
