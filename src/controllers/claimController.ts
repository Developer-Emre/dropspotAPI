import { Request, Response, NextFunction } from 'express';
import { ClaimService } from '../services/claimService';
import { AuthRequest } from '../types';
import { AppErrorClass } from '../middleware/errorHandler';

export class ClaimController {
  /**
   * Claim a drop (POST /drops/:id/claim)
   * Errors are automatically handled by global error handler
   */
  public static async claimDrop(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const { id: dropId } = req.params;
    const userId = req.user!.userId;

    const result = await ClaimService.claimDrop(userId, dropId);

    // Check if this was an existing claim (idempotent response)
    const statusCode = result.claim.claimedAt.getTime() > Date.now() - 5000 ? 201 : 200;

    res.status(statusCode).json({
      success: true,
      message: statusCode === 201 ? 'Successfully claimed drop' : 'Drop already claimed',
      data: result
    });
  }

  /**
   * Get claim status (GET /drops/:id/claim/status)
   */
  public static async getClaimStatus(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id: dropId } = req.params;
      const userId = req.user!.userId;

      const result = await ClaimService.getClaimStatus(userId, dropId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Get claim status error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get claim status'
        }
      });
    }
  }

  /**
   * Complete a claim (PUT /drops/:id/claim/complete)
   * This would typically be called after payment processing
   */
  public static async completeClaim(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id: dropId } = req.params;
      const userId = req.user!.userId;

      const result = await ClaimService.completeClaim(userId, dropId);

      return res.status(200).json({
        success: true,
        message: 'Claim completed successfully',
        data: {
          claim: {
            id: result.id,
            claimCode: result.claimCode,
            status: result.status,
            claimedAt: result.claimedAt,
            expiresAt: result.expiresAt
          }
        }
      });

    } catch (error: any) {
      console.error('Complete claim error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: error.message
          }
        });
      }

      if (error.message.includes('expired')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CLAIM_EXPIRED',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete claim'
        }
      });
    }
  }

  /**
   * Get all user's claims (GET /my-claims)
   */
  public static async getMyClaims(req: AuthRequest, res: Response): Promise<any> {
    try {
      const userId = req.user!.userId;

      const claims = await ClaimService.getUserClaims(userId);

      res.status(200).json({
        success: true,
        data: {
          claims,
          total: claims.length
        }
      });

    } catch (error: any) {
      console.error('Get my claims error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get claims'
        }
      });
    }
  }
}