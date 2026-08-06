import { config } from '@/core/config.js';
import { logger } from '@/core/logger.js';
import {
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
  EmailMessage,
  IEmailProvider,
  INotificationService,
  PaymentFailedNotificationPayload,
  PaymentSuccessNotificationPayload,
} from '@/modules/notification/notification.types.js';
import { SmtpEmailProvider } from '@/modules/notification/email.provider.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly emailProvider: IEmailProvider = new SmtpEmailProvider(),
    private readonly adminEmail: string = config.TEMPLE_ADMIN_EMAIL,
    private readonly retryMaxAttempts: number = config.EMAIL_RETRY_MAX_ATTEMPTS,
    private readonly retryDelayMs: number = config.EMAIL_RETRY_DELAY_MS,
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
    message: EmailMessage,
    context: Record<string, string>,
  ): Promise<void> {
    logger.info(
      { type, to: this.adminEmail, ...context },
      'Email notification requested',
    );

    try {
      await this.sendWithRetry(type, message, context);
      logger.info(
        { type, to: this.adminEmail, ...context },
        'Email notification sent',
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          type,
          to: this.adminEmail,
          ...context,
          attempts: this.retryMaxAttempts,
        },
        'Email notification failed after retries',
      );
    }
  }

  private async sendWithRetry(
    type: NotificationType,
    message: EmailMessage,
    context: Record<string, string>,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryMaxAttempts; attempt++) {
      try {
        await this.emailProvider.sendEmail(this.adminEmail, message);
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
          'Email notification attempt failed — retrying',
        );

        await sleep(this.retryDelayMs);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Email notification failed');
  }
}

export const notificationService = new NotificationService();

export type {
  INotificationService,
  BookingCreatedNotificationPayload,
  PaymentSuccessNotificationPayload,
  PaymentFailedNotificationPayload,
} from '@/modules/notification/notification.types.js';
