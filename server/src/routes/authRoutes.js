import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with brute-force / spam protection
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
