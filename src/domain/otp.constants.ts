/** OTP business configuration — DB-backed, delivered via SMS (+ email backup). */
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
} as const;

export type OtpConfig = typeof OTP_CONFIG;
