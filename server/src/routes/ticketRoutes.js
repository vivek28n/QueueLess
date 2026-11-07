import express from 'express';
import { skipTicket, completeTicket } from '../controllers/ticketController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All ticket admin routes require authentication
router.use(authenticate);

router.patch('/:id/skip', skipTicket);
router.patch('/:id/complete', completeTicket);

export default router;
