import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from './config.js';
import { UnauthorizedException } from '@/exceptions/exceptions.js';

export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export interface AdminTokenPayload {
  userId: string;
  role: string;
  isAdmin: boolean;
  email: string;
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const Security = {
  hashPassword: (password: string) => bcrypt.hash(password, 12),

  comparePassword: (password: string, hash: string) =>
    bcrypt.compare(password, hash),

  generateAccessToken: (payload: AccessTokenPayload) => {
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  },

  generateRefreshToken: (payload: RefreshTokenPayload) => {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  },

  generateAdminToken: (payload: AdminTokenPayload) => {
    const options: SignOptions = {
      expiresIn: config.ADMIN_JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.ADMIN_JWT_SECRET, options);
  },

  verifyAccessToken: (token: string) => {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Access token expired');
      }
      throw new UnauthorizedException('Invalid access token');
    }
  },

  verifyRefreshToken: (token: string) => {
    try {
      return jwt.verify(
        token,
        config.JWT_REFRESH_SECRET,
      ) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  },

  verifyAdminToken: (token: string): AdminTokenPayload => {
    try {
      const decoded = jwt.verify(
        token,
        config.ADMIN_JWT_SECRET,
      ) as AdminTokenPayload;

      if (!decoded?.userId || !decoded.role) {
        throw new UnauthorizedException('Invalid admin token payload');
      }

      return decoded;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Admin session expired');
      }
      throw new UnauthorizedException('Invalid admin token');
    }
  },
};
