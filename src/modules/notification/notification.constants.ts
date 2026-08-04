export const WHATSAPP_PROVIDERS = ['META'] as const;

export type WhatsAppProviderName = (typeof WHATSAPP_PROVIDERS)[number];

export const DEFAULT_WHATSAPP_PROVIDER: WhatsAppProviderName = 'META';

export const DEFAULT_WHATSAPP_RETRY_MAX_ATTEMPTS = 3;
export const DEFAULT_WHATSAPP_RETRY_DELAY_MS = 1_000;

export const META_WHATSAPP_API_VERSION = 'v21.0';

export const NOTIFICATION_TYPES = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ADMIN_OTP: 'ADMIN_OTP',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
