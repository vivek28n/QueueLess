import express from 'express';
import {
  createQueue,
  getMyQueues,
  getQueueById,
  updateQueue,
  callNextCustomer,
} from '../controllers/queueController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All queue admin routes require authentication
router.use(authenticate);

router.route('/').post(createQueue).get(getMyQueues);
router.route('/:id').get(getQueueById).patch(updateQueue);
router.post('/:id/next', callNextCustomer);

export default router;
