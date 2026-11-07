import express from 'express';
import {
  getPublicQueueInfo,
  joinQueue,
  getPublicTicketStatus,
} from '../controllers/publicQueueController.js';
import { publicJoinLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/queues/:queueCode', getPublicQueueInfo);
router.post('/queues/:queueCode/join', publicJoinLimiter, joinQueue);
router.get('/tickets/:ticketId', getPublicTicketStatus);

export default router;
