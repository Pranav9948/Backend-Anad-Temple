/** OTP business configuration (Stage 5 — no SMS integration). */
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
} as const;

export type OtpConfig = typeof OTP_CONFIG;
