import { logger } from '@/core/logger.js';
import { config } from '@/core/config.js';

export type SmsSendResult = {
  provider: string;
  delivered: boolean;
  detail?: string;
};

export interface ISmsProvider {
  sendOtp(mobile: string, otp: string, expiryMinutes: number): Promise<SmsSendResult>;
}

/**
 * Dev / fallback provider — logs OTP (never use alone in production).
 */
export class ConsoleSmsProvider implements ISmsProvider {
  async sendOtp(
    mobile: string,
    otp: string,
    expiryMinutes: number,
  ): Promise<SmsSendResult> {
    logger.info(
      { mobile, expiryMinutes, channel: 'console-sms' },
      `[SMS:console] Admin OTP for ${mobile}: ${otp} (expires in ${expiryMinutes}m)`,
    );
    return { provider: 'console', delivered: true, detail: 'logged' };
  }
}

/**
 * Fast2SMS — free / low-cost India SMS API.
 * https://www.fast2sms.com/
 *
 * Env:
 *   SMS_PROVIDER=fast2sms
 *   FAST2SMS_API_KEY=...
 */
export class Fast2SmsProvider implements ISmsProvider {
  constructor(private readonly apiKey: string) {}

  async sendOtp(
    mobile: string,
    otp: string,
    expiryMinutes: number,
  ): Promise<SmsSendResult> {
    const message = `Your Anad Chamundi Temple admin login OTP is ${otp}. Valid for ${expiryMinutes} minutes. Do not share.`;

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: mobile,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      return?: boolean;
      message?: string | string[];
    } | null;

    if (!response.ok || payload?.return !== true) {
      const detail = Array.isArray(payload?.message)
        ? payload.message.join(', ')
        : payload?.message || `HTTP ${response.status}`;
      logger.error({ mobile, detail }, 'Fast2SMS OTP send failed');
      throw new Error(`Fast2SMS failed: ${detail}`);
    }

    logger.info({ mobile, provider: 'fast2sms' }, 'Admin OTP SMS sent');
    return { provider: 'fast2sms', delivered: true };
  }
}

export function createSmsProvider(): ISmsProvider {
  const provider = (process.env.SMS_PROVIDER ?? 'console').trim().toLowerCase();

  if (provider === 'fast2sms') {
    const apiKey = process.env.FAST2SMS_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'SMS_PROVIDER=fast2sms requires FAST2SMS_API_KEY. ' +
          'Get a free key at https://www.fast2sms.com/ or set SMS_PROVIDER=console for local/dev.',
      );
    }
    return new Fast2SmsProvider(apiKey);
  }

  if (provider === 'none') {
    return {
      async sendOtp() {
        return { provider: 'none', delivered: false, detail: 'disabled' };
      },
    };
  }

  // Default: console (safe for local). Production should set fast2sms.
  if (config.NODE_ENV === 'production' && provider === 'console') {
    logger.warn(
      'SMS_PROVIDER=console in production — OTP SMS is only logged, not delivered. ' +
        'Set SMS_PROVIDER=fast2sms and FAST2SMS_API_KEY for real SMS.',
    );
  }

  return new ConsoleSmsProvider();
}

export const smsProvider = createSmsProvider();
