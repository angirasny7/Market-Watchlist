import { Response, NextFunction } from 'express';
import { MarketMood } from '@prisma/client';
import { digestService } from '../services/digestService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class DigestController {
  async getDigests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { mood, search } = req.query;
      const digests = await digestService.getDigests({
        mood: mood as MarketMood | undefined,
        search: search as string | undefined,
        userId,
      });

      res.status(200).json({
        success: true,
        count: digests.length,
        data: serializeBigInt(digests),
      });
    } catch (err) {
      next(err);
    }
  }

  async getDigestById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const digest = await digestService.getDigestById(id, userId);

      if (!digest) {
        res.status(404).json({ success: false, error: 'Digest not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: serializeBigInt(digest),
      });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      await digestService.markDigestRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Digest marked as read',
      });
    } catch (err) {
      next(err);
    }
  }

  async viewDigest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      await digestService.viewDigest(id, userId);

      res.status(200).json({
        success: true,
        message: 'Digest marked as viewed and recorded in user cursor',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const digestController = new DigestController();
