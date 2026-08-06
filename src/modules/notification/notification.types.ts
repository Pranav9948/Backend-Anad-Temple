import type { Language, PaymentMethod, PaymentStatus } from '@/generated/prisma/client.js';

export type BookingCreatedNotificationPayload = {
  bookingNumber: string;
  devoteeName: string;
  mobileNumber: string;
  language: Language;
  memberCount: number;
  paymentStatus: PaymentStatus;
  bookingTime: Date;
};

export type PaymentSuccessNotificationPayload = {
  bookingNumber: string;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  paymentId: string;
  transactionTime: Date;
};

export type PaymentFailedNotificationPayload = {
  bookingNumber: string;
  devoteeName: string;
  mobileNumber: string;
  failureStatus: string;
};

export interface INotificationService {
  notifyBookingCreated(payload: BookingCreatedNotificationPayload): Promise<void>;
  notifyPaymentSuccess(payload: PaymentSuccessNotificationPayload): Promise<void>;
  notifyPaymentFailed(payload: PaymentFailedNotificationPayload): Promise<void>;
  notifyAdminOtp(otp: string, expiryMinutes: number): Promise<void>;
}

export interface IWhatsAppProvider {
  sendTextMessage(to: string, body: string): Promise<void>;
}
