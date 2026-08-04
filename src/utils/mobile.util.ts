const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes Indian mobile input to a 10-digit local number.
 * Accepts: 9020602727, +919020602727, 919020602727
 */
export function normalizeIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 10 && INDIAN_MOBILE_REGEX.test(digits)) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    if (INDIAN_MOBILE_REGEX.test(local)) {
      return local;
    }
  }

  return digits;
}

export function toWhatsAppRecipient(mobile: string): string {
  const normalized = normalizeIndianMobile(mobile);
  return `91${normalized}`;
}

export function isValidIndianMobile(mobile: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(mobile));
}
