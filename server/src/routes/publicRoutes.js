import express from 'express';
import {
  getPublicQueueInfo,
  joinQueue,
  getPublicTicketStatus,
} from '../controllers/publicQueueController.js';

const router = express.Router();

router.get('/queues/:queueCode', getPublicQueueInfo);
router.post('/queues/:queueCode/join', joinQueue);
router.get('/tickets/:ticketId', getPublicTicketStatus);

export default router;
