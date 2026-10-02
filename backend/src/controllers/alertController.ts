import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { alertService } from '../services/alertService.js';
import { serializeBigInt } from '../utils/json.js';

export class AlertController {
  async getAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const alerts = await alertService.listAlerts(userId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(alerts),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async createAlert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { stockSymbol, alertType, targetValue } = req.body;
      if (!stockSymbol || !alertType || targetValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'stockSymbol, alertType, and targetValue are required',
        });
        return;
      }

      const alert = await alertService.createAlert(userId, {
        stockSymbol,
        alertType,
        targetValue,
      });

      res.status(201).json({
        success: true,
        data: serializeBigInt(alert),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async updateAlert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = String(req.params.id);
      const { isActive, targetValue } = req.body;

      const alert = await alertService.updateAlert(userId, id, {
        isActive,
        targetValue,
      });

      res.status(200).json({
        success: true,
        data: serializeBigInt(alert),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async deleteAlert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = String(req.params.id);
      const result = await alertService.deleteAlert(userId, id);

      res.status(200).json({
        success: true,
        data: result,
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

export const alertController = new AlertController();
