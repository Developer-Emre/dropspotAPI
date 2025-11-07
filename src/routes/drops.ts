import { Router } from 'express';
import { DropController } from '../controllers/dropController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { 
  createDropValidation, 
  updateDropValidation, 
  dropIdValidation 
} from '../validators/dropValidators';

const router = Router();

/**
 * Public Drop Routes
 */

// GET /drops - List active drops (public endpoint)
router.get('/', DropController.getActiveDrops);

/**
 * Admin Drop Routes (Protected)
 */

// GET /admin/drops - List all drops for admin management
router.get('/admin', authenticate, requireAdmin, DropController.getAllDrops);

// GET /admin/drops/:id - Get specific drop details for admin
router.get('/admin/:id', 
  authenticate, 
  requireAdmin, 
  dropIdValidation, 
  DropController.getDropById
);

// POST /admin/drops - Create new drop
router.post('/admin', 
  authenticate, 
  requireAdmin, 
  createDropValidation, 
  DropController.createDrop
);

// PUT /admin/drops/:id - Update existing drop
router.put('/admin/:id', 
  authenticate, 
  requireAdmin, 
  updateDropValidation, 
  DropController.updateDrop
);

// DELETE /admin/drops/:id - Delete drop
router.delete('/admin/:id', 
  authenticate, 
  requireAdmin, 
  dropIdValidation, 
  DropController.deleteDrop
);

export default router;