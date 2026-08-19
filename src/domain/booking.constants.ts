/** ₹50 per member for 1–2 people, and for each member beyond 5 (paise). */
export const HOMAM_PRICE_PER_MEMBER_PAISE = 5000;

/**
 * Family package: 3–5 members = ₹150 total.
 * Beyond 5: package + ₹50 per extra member.
 */
export const HOMAM_FAMILY_PACKAGE_PAISE = 15_000;
export const HOMAM_FAMILY_PACKAGE_MAX_MEMBERS = 5;

/** @deprecated Use HOMAM_PRICE_PER_MEMBER_PAISE + calculateHomamTotalPaise */
export const BOOKING_PLACEHOLDER_AMOUNT_PAISE = HOMAM_PRICE_PER_MEMBER_PAISE;

/**
 * Pricing rules (must match frontend):
 * - 1 or 2 members → ₹50 each
 * - 3, 4, or 5 members → ₹150 total
 * - 6+ members → ₹150 + ₹50 for each member beyond 5
 */
export function calculateHomamTotalPaise(memberCount: number): number {
  const n = Math.max(0, Math.floor(memberCount));
  if (n === 0) return 0;
  if (n <= 2) return n * HOMAM_PRICE_PER_MEMBER_PAISE;
  if (n <= HOMAM_FAMILY_PACKAGE_MAX_MEMBERS) return HOMAM_FAMILY_PACKAGE_PAISE;
  return (
    HOMAM_FAMILY_PACKAGE_PAISE +
    (n - HOMAM_FAMILY_PACKAGE_MAX_MEMBERS) * HOMAM_PRICE_PER_MEMBER_PAISE
  );
}
