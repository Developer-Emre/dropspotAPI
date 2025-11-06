import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController';
import { authenticate } from '../middleware/auth';
import { paginationValidation } from '../validators/waitlistValidators';

const router = Router();

/**
 * User Routes
 * Personal user endpoints requiring authentication
 */

// GET /my-waitlists - Get user's all waitlist entries
router.get('/my-waitlists',
  authenticate,
  paginationValidation,
  WaitlistController.getMyWaitlists
);

export default router;