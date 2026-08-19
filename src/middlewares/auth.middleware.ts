import { Security } from '@/core/security.js';
import { ADMIN_TOKEN_COOKIE } from '@/core/admin-cookie.js';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@/exceptions/exceptions.js';
import { adminService } from '@/modules/admin/admin.service.js';
import { DomainError } from '@/domain/errors.js';
import type { Request, Response, NextFunction } from 'express';

function extractAdminToken(req: Request): string | null {
  const cookieToken = req.cookies?.[ADMIN_TOKEN_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice('Bearer '.length).trim();
    return bearer || null;
  }

  return null;
}

/**
 * Verifies `admin_token` cookie or `Authorization: Bearer` JWT.
 * Ensures payload role is ADMIN and isAdmin is true, then loads the admin row.
 */
export const protectAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractAdminToken(req);
    if (!token) {
      throw new UnauthorizedException('No admin token provided');
    }

    const decoded = Security.verifyAdminToken(token);

    if (decoded.role !== 'ADMIN' || decoded.isAdmin !== true) {
      throw new ForbiddenException('Admin access required');
    }

    const admin = await adminService.getAdmin(decoded.userId);

    if (admin.role !== 'ADMIN' || !admin.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    req.user = {
      userId: admin.id,
      role: admin.role,
      isAdmin: admin.isAdmin,
      email: admin.email,
    };

    next();
  } catch (error) {
    if (error instanceof DomainError && error.code === 'ADMIN_NOT_FOUND') {
      next(new ForbiddenException('Admin not found or inactive'));
      return;
    }

    next(error);
  }
};

/**
 * @deprecated Prefer `protectAdmin` for admin routes (cookie + Bearer).
 * Kept for any remaining Bearer-only call sites during migration.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = Security.verifyAdminToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
      email: decoded.email,
    };
    next();
  } catch {
    next(new UnauthorizedException('Invalid or expired access token'));
  }
};

/** @deprecated Prefer `protectAdmin` which combines auth + admin checks. */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (req.user.role !== 'ADMIN' || req.user.isAdmin === false) {
      throw new ForbiddenException('Admin access required');
    }

    await adminService.getAdmin(req.user.userId);
    next();
  } catch (error) {
    if (error instanceof DomainError && error.code === 'ADMIN_NOT_FOUND') {
      next(new ForbiddenException('Admin not found or inactive'));
      return;
    }

    next(error);
  }
};
