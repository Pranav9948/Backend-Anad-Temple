import { Security } from '@/core/security.js';
import { UnauthorizedException } from '@/exceptions/exceptions.js';
import { adminService } from '@/modules/admin/admin.service.js';
import { DomainError } from '@/domain/errors.js';
import { Request, Response, NextFunction } from 'express';

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
    const decoded = Security.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(new UnauthorizedException('Invalid or expired access token'));
  }
};

export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    await adminService.getAdmin(req.user.userId);
    next();
  } catch (error) {
    if (error instanceof DomainError && error.code === 'ADMIN_NOT_FOUND') {
      next(new UnauthorizedException('Admin not found or inactive'));
      return;
    }

    next(error);
  }
};
