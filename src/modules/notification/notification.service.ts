import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import {
  DEFAULT_WHATSAPP_RETRY_DELAY_MS,
  DEFAULT_WHATSAPP_RETRY_MAX_ATTEMPTS,
  NOTIFICATION_TYPES,
  type NotificationType,
} from '@/modules/notification/notification.constants.js';
import {
  buildBookingCreatedMessage,
  buildPaymentFailedMessage,
  buildPaymentSuccessMessage,
  buildAdminOtpMessage,
} from '@/modules/notification/notification.templates.js';
import type {
  BookingCreatedNotificationPayload,
  INotificationService,
  IWhatsAppProvider,
  PaymentFailedNotificationPayload,
  PaymentSuccessNotificationPayload,
} from '@/modules/notification/notification.types.js';
import { MetaWhatsAppProvider } from '@/modules/notification/meta.provider.js';

function createWhatsAppProvider(): IWhatsAppProvider {
  switch (config.WHATSAPP_PROVIDER) {
    case 'META':
    default:
      return new MetaWhatsAppProvider();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly whatsappProvider: IWhatsAppProvider = createWhatsAppProvider(),
    private readonly adminNumber: string = config.TEMPLE_ADMIN_WHATSAPP_NUMBER,
    private readonly retryMaxAttempts: number = config.WHATSAPP_RETRY_MAX_ATTEMPTS,
    private readonly retryDelayMs: number = config.WHATSAPP_RETRY_DELAY_MS,
  ) {}

  async notifyBookingCreated(
    payload: BookingCreatedNotificationPayload,
  ): Promise<void> {
    await this.sendBestEffort(
      NOTIFICATION_TYPES.BOOKING_CREATED,
      buildBookingCreatedMessage(payload),
      { bookingNumber: payload.bookingNumber },
    );
  }

  async notifyPaymentSuccess(
    payload: PaymentSuccessNotificationPayload,
  ): Promise<void> {
    await this.sendBestEffort(
      NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      buildPaymentSuccessMessage(payload),
      { bookingNumber: payload.bookingNumber, paymentId: payload.paymentId },
    );
  }

  async notifyPaymentFailed(
    payload: PaymentFailedNotificationPayload,
  ): Promise<void> {
    await this.sendBestEffort(
      NOTIFICATION_TYPES.PAYMENT_FAILED,
      buildPaymentFailedMessage(payload),
      { bookingNumber: payload.bookingNumber },
    );
  }

  async notifyAdminOtp(otp: string, expiryMinutes: number): Promise<void> {
    await this.sendBestEffort(
      NOTIFICATION_TYPES.ADMIN_OTP,
      buildAdminOtpMessage(otp, expiryMinutes),
      { purpose: 'admin_login' },
    );
  }

  private async sendBestEffort(
    type: NotificationType,
    message: string,
    context: Record<string, string>,
  ): Promise<void> {
    logger.info({ type, ...context }, 'WhatsApp notification requested');

    try {
      await this.sendWithRetry(type, message, context);
      logger.info({ type, ...context }, 'WhatsApp notification sent');
    } catch (error) {
      logger.error(
        {
          err: error,
          type,
          ...context,
          attempts: this.retryMaxAttempts,
        },
        'WhatsApp notification failed after retries',
      );
    }
  }

  private async sendWithRetry(
    type: NotificationType,
    message: string,
    context: Record<string, string>,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryMaxAttempts; attempt++) {
      try {
        await this.whatsappProvider.sendTextMessage(this.adminNumber, message);
        return;
      } catch (error) {
        lastError = error;

        if (attempt >= this.retryMaxAttempts) {
          break;
        }

        logger.warn(
          {
            type,
            ...context,
            attempt,
            maxAttempts: this.retryMaxAttempts,
            nextRetryInMs: this.retryDelayMs,
          },
          'WhatsApp notification attempt failed — retrying',
        );

        await sleep(this.retryDelayMs);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('WhatsApp notification failed');
  }
}

export const notificationService = new NotificationService();

export type {
  INotificationService,
  BookingCreatedNotificationPayload,
  PaymentSuccessNotificationPayload,
  PaymentFailedNotificationPayload,
} from '@/modules/notification/notification.types.js';
