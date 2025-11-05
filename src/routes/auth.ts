import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { signupValidation, loginValidation } from '../validators/authValidators';

const router = Router();

// POST /auth/signup - User registration
router.post('/signup', signupValidation, AuthController.signup);

// POST /auth/login - User authentication
router.post('/login', loginValidation, AuthController.login);

export default router;