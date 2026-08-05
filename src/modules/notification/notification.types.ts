import type {
  Language,
  Nakshatra,
  PaymentMethod,
  PaymentStatus,
} from '@/generated/prisma/client.js';

export type BookingCreatedMemberPayload = {
  name: string;
  nakshatra: Nakshatra;
};

export type BookingCreatedNotificationPayload = {
  bookingNumber: string;
  devoteeName: string;
  mobileNumber: string;
  language: Language;
  memberCount: number;
  members: BookingCreatedMemberPayload[];
  paymentStatus: PaymentStatus;
  bookingTime: Date;
  totalAmountPaise?: number;
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

export type EmailMessage = {
  subject: string;
  text: string;
  html: string;
};

export interface INotificationService {
  notifyBookingCreated(payload: BookingCreatedNotificationPayload): Promise<void>;
  notifyPaymentSuccess(payload: PaymentSuccessNotificationPayload): Promise<void>;
  notifyPaymentFailed(payload: PaymentFailedNotificationPayload): Promise<void>;
  notifyAdminOtp(otp: string, expiryMinutes: number): Promise<void>;
}

export interface IEmailProvider {
  sendEmail(to: string, message: EmailMessage): Promise<void>;
}
