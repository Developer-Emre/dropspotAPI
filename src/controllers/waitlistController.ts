import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { WaitlistService } from '../services/waitlistService';

/**
 * Waitlist Controller
 * Handles waitlist join/leave operations with idempotency
 */
export class WaitlistController {

  /**
   * POST /drops/:id/join - Join waitlist
   * Idempotent: Returns success even if already joined
   */
  public static async joinWaitlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id: dropId } = req.params;
      const userId = req.user!.userId;

      // Join waitlist with idempotency
      const result = await WaitlistService.joinWaitlist(userId, dropId);

      const statusCode = result.isNew ? 201 : 200;

      res.status(statusCode).json({
        success: true,
        message: result.message,
        data: {
          waitlistEntry: result.entry,
          isNew: result.isNew
        }
      });

    } catch (error: any) {
      console.error('Error joining waitlist:', error);

      // Handle specific business logic errors
      if (error.message === 'Drop not found') {
        res.status(404).json({
          success: false,
          message: 'Drop not found'
        });
        return;
      }

      if (error.message === 'Drop is not active') {
        res.status(400).json({
          success: false,
          message: 'Drop is not active'
        });
        return;
      }

      if (error.message === 'Drop has not started yet') {
        res.status(400).json({
          success: false,
          message: 'Drop has not started yet'
        });
        return;
      }

      if (error.message === 'Waitlist phase has ended, claim window is active') {
        res.status(400).json({
          success: false,
          message: 'Waitlist phase has ended, claim window is active'
        });
        return;
      }

      if (error.message === 'Drop has ended') {
        res.status(400).json({
          success: false,
          message: 'Drop has ended'
        });
        return;
      }

      if (error.message === 'Drop is sold out') {
        res.status(409).json({
          success: false,
          message: 'Drop is sold out'
        });
        return;
      }

      // Generic server error
      res.status(500).json({
        success: false,
        message: 'Internal server error while joining waitlist'
      });
    }
  }

  /**
   * POST /drops/:id/leave - Leave waitlist
   * Idempotent: Returns success even if not in waitlist
   */
  public static async leaveWaitlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id: dropId } = req.params;
      const userId = req.user!.userId;

      // Leave waitlist with idempotency
      const result = await WaitlistService.leaveWaitlist(userId, dropId);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error: any) {
      console.error('Error leaving waitlist:', error);

      // Handle specific business logic errors
      if (error.message === 'Drop not found') {
        res.status(404).json({
          success: false,
          message: 'Drop not found'
        });
        return;
      }

      if (error.message === 'Cannot leave waitlist after claim window has started') {
        res.status(400).json({
          success: false,
          message: 'Cannot leave waitlist after claim window has started'
        });
        return;
      }

      // Generic server error
      res.status(500).json({
        success: false,
        message: 'Internal server error while leaving waitlist'
      });
    }
  }

  /**
   * GET /drops/:id/waitlist - Get waitlist (Admin only)
   */
  public static async getWaitlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: dropId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

      const result = await WaitlistService.getWaitlist(dropId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          waitlist: result.entries,
          pagination: result.pagination
        }
      });

    } catch (error: any) {
      console.error('Error fetching waitlist:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching waitlist'
      });
    }
  }

  /**
   * GET /drops/:id/my-waitlist-status - Check user's waitlist status
   */
  public static async getMyWaitlistStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: dropId } = req.params;
      const userId = req.user!.userId;

      // Find user's waitlist entry
      const entry = await WaitlistService.findWaitlistEntry(userId, dropId);

      if (!entry) {
        res.status(200).json({
          success: true,
          data: {
            inWaitlist: false,
            message: 'Not in waitlist'
          }
        });
        return;
      }

      // Get user's position in waitlist
      const position = await WaitlistService.getWaitlistPosition(userId, dropId);

      res.status(200).json({
        success: true,
        data: {
          inWaitlist: true,
          entry,
          position,
          message: 'In waitlist'
        }
      });

    } catch (error: any) {
      console.error('Error checking waitlist status:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error while checking waitlist status'
      });
    }
  }
}