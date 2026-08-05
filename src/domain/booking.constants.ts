/** Ganapathi Homam: ₹50 per Archana member, stored in paise. */
export const HOMAM_PRICE_PER_MEMBER_PAISE = 5000;

/** @deprecated Use HOMAM_PRICE_PER_MEMBER_PAISE + calculateHomamTotalPaise */
export const BOOKING_PLACEHOLDER_AMOUNT_PAISE = HOMAM_PRICE_PER_MEMBER_PAISE;

export function calculateHomamTotalPaise(memberCount: number): number {
  return Math.max(0, memberCount) * HOMAM_PRICE_PER_MEMBER_PAISE;
}
