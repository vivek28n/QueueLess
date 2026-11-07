import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', loginLimiter, login);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
