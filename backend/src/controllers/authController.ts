import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, deviceInfo } = req.body;
      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, password, and name are required',
        });
        return;
      }

      const result = await authService.register({
        email,
        password,
        name,
        deviceInfo,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({
        success: true,
        data: serializeBigInt(result),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, deviceInfo } = req.body;
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const result = await authService.login({
        email,
        password,
        deviceInfo,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({
        success: true,
        data: serializeBigInt(result),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: 'Unauthorized' });
        return;
      }

      const user = await authService.getMe(req.user.userId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(user),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.userId) {
        await authService.logout(req.user.userId, req.body?.deviceInfo);
      }
    } catch (err) {
      console.warn('[AuthController] Logout tracking error:', err);
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async heartbeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized', error: 'Unauthorized' });
        return;
      }

      const userState = await authService.updateHeartbeat(req.user.userId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(userState),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }
}

export const authController = new AuthController();
