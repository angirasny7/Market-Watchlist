import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUserPayload;
}

/**
 * Strict JWT Authentication Middleware
 * Enforces valid Bearer JWT on protected endpoints.
 * Returns 401 Unauthorized for missing, invalid, or expired tokens.
 */
export const authenticateJwt = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Access token is required. Format: Bearer <token>',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid, expired, or corrupted token',
    });
  }
};

/**
 * Optional authentication middleware for public endpoints with optional user context.
 */
export const optionalAuthenticateJwt = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
      req.user = decoded;
    } catch {
      // Ignore token decode failure in optional auth mode
    }
  }
  next();
};

/**
 * Admin Authentication Middleware
 * Enforces admin authorization via:
 * 1. Valid secret header `x-admin-secret` matching process.env.ADMIN_SECRET or `x-cron-secret` matching CRON_SECRET, OR
 * 2. Valid Bearer JWT token with user role === 'ADMIN'.
 * 
 * Returns 401 Unauthorized if no credentials provided.
 * Returns 403 Forbidden if user is authenticated but not an ADMIN.
 */
export const requireAdminAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // 1. Check admin secret header
  const adminSecret = process.env.ADMIN_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-admin-secret'] || req.headers['x-cron-secret'];

  if (
    providedSecret &&
    ((adminSecret && providedSecret === adminSecret) || (cronSecret && providedSecret === cronSecret))
  ) {
    return next();
  }

  // 2. Check JWT Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Admin authentication required',
      error: 'Missing Bearer token or x-admin-secret header',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
    req.user = decoded;

    if (decoded.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Admin privilege required',
        error: 'Current user does not have administrative access',
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token',
      error: 'Invalid or expired administrative token',
    });
  }
};
