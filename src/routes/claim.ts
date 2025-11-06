import { Router } from 'express';
import { ClaimController } from '../controllers/claimController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { claimValidators } from '../validators/claimValidators';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Claim a drop
 * POST /drops/:id/claim
 */
router.post(
  '/:id/claim',
  authenticate,
  claimValidators.claimDrop,
  validate,
  asyncHandler(ClaimController.claimDrop)
);

/**
 * Get claim status for a drop
 * GET /drops/:id/claim/status
 */
router.get(
  '/:id/claim/status',
  authenticate,
  claimValidators.getClaimStatus,
  validate,
  asyncHandler(ClaimController.getClaimStatus)
);

/**
 * Complete a claim (mark as COMPLETED after payment)
 * PUT /drops/:id/claim/complete
 */
router.put(
  '/:id/claim/complete',
  authenticate,
  claimValidators.completeClaim,
  validate,
  asyncHandler(ClaimController.completeClaim)
);

/**
 * Get all user's claims
 * GET /my-claims
 */
router.get(
  '/my-claims',
  authenticate,
  asyncHandler(ClaimController.getMyClaims)
);

export default router;