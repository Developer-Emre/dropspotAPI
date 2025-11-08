import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { dropIdValidation, paginationValidation } from '../validators/waitlistValidators';

const router = Router();

/**
 * Waitlist Routes
 * All routes require authentication
 */

// POST /drops/:id/join - Join waitlist (authenticated users)
router.post('/:id/join', 
  authenticate,
  dropIdValidation,
  WaitlistController.joinWaitlist
);

// POST /drops/:id/leave - Leave waitlist (authenticated users)
router.post('/:id/leave',
  authenticate,
  dropIdValidation,
  WaitlistController.leaveWaitlist
);

// GET /drops/:id/my-waitlist-status - Check user's waitlist status (authenticated users)
router.get('/:id/my-waitlist-status',
  authenticate,
  dropIdValidation,
  WaitlistController.getMyWaitlistStatus
);

// GET /drops/:id/waitlist - Get waitlist for drop (admin only)
router.get('/:id/waitlist',
  authenticate,
  requireAdmin,
  dropIdValidation,
  paginationValidation,
  WaitlistController.getWaitlist
);

export default router;