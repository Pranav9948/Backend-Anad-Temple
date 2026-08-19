import type { CookieOptions, Response } from 'express';
import { config } from '@/core/config.js';

export const ADMIN_TOKEN_COOKIE = 'admin_token' as const;

/** Cookie max-age aligned with a typical 8h admin session (overridden via env if needed). */
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function parseExpiresToMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!match) {
    return EIGHT_HOURS_MS;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return EIGHT_HOURS_MS;
  }
}

export function getAdminCookieOptions(): CookieOptions {
  const isProduction = config.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: parseExpiresToMs(config.ADMIN_JWT_EXPIRES_IN),
  };
}

export function setAdminAuthCookie(res: Response, token: string): void {
  res.cookie(ADMIN_TOKEN_COOKIE, token, getAdminCookieOptions());
}

export function clearAdminAuthCookie(res: Response): void {
  const options = getAdminCookieOptions();
  res.clearCookie(ADMIN_TOKEN_COOKIE, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}
