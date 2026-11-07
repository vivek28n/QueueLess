import mongoose from 'mongoose';
import Queue from '../models/Queue.js';
import Ticket from '../models/Ticket.js';
import { emitTicketJoined } from '../services/socketService.js';

/**
 * @desc    Get public queue info by unique queue code
 * @route   GET /api/public/queues/:queueCode
 * @access  Public (Guest / Customer)
 */
export const getPublicQueueInfo = async (req, res, next) => {
  try {
    const { queueCode } = req.params;

    if (!queueCode || !queueCode.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Queue code is required.',
      });
    }

    const cleanCode = queueCode.trim().toUpperCase();
    const queue = await Queue.findOne({ queueCode: cleanCode }).populate('business', 'name businessId industry');

    if (!queue) {
      return res.status(404).json({
        status: 'error',
        message: `Queue with code '${cleanCode}' was not found. Please verify the code.`,
      });
    }

    const waitingCount = await Ticket.countDocuments({
      queue: queue._id,
      status: 'waiting',
    });

    const estimatedWaitMinutes = waitingCount * (queue.averageServiceTime || 5);

    return res.status(200).json({
      status: 'success',
      data: {
        queue: {
          id: queue._id,
          name: queue.name,
          description: queue.description,
          queueCode: queue.queueCode,
          status: queue.status,
          currentlyServing: queue.currentlyServing || 0,
          averageServiceTime: queue.averageServiceTime || 5,
          business: {
            name: queue.business?.name,
            businessId: queue.business?.businessId,
            industry: queue.business?.industry,
          },
        },
        stats: {
          waitingCount,
          currentlyServing: queue.currentlyServing || 0,
          estimatedWaitMinutes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join an active queue and receive a concurrency-safe unique token
 * @route   POST /api/public/queues/:queueCode/join
 * @access  Public (Guest / Customer)
 */
export const joinQueue = async (req, res, next) => {
  try {
    const { queueCode } = req.params;
    const { customerName, customerContact } = req.body;

    if (!queueCode || !queueCode.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Queue code is required.',
      });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter your name to join the queue.',
      });
    }

    const cleanCode = queueCode.trim().toUpperCase();
    const existingQueue = await Queue.findOne({ queueCode: cleanCode });

    if (!existingQueue) {
      return res.status(404).json({
        status: 'error',
        message: `Queue with code '${cleanCode}' was not found.`,
      });
    }

    // Business rule: Customers can only join active queues
    if (existingQueue.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot join queue: This queue is currently ${existingQueue.status}. Please check back later.`,
      });
    }

    // Concurrency-safe atomic token increment
    // Only succeeds if queue is still 'active'
    const updatedQueue = await Queue.findOneAndUpdate(
      { _id: existingQueue._id, status: 'active' },
      { $inc: { currentTokenNumber: 1 } },
      { new: true }
    );

    if (!updatedQueue) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot join queue: The queue is no longer active.',
      });
    }

    const issuedTokenNumber = updatedQueue.currentTokenNumber;

    // Create the Ticket with atomic tokenNumber
    const ticket = await Ticket.create({
      queue: updatedQueue._id,
      business: updatedQueue.business,
      tokenNumber: issuedTokenNumber,
      customerName: customerName.trim(),
      customerContact: customerContact ? customerContact.trim() : '',
      status: 'waiting',
      joinedAt: new Date(),
    });

    // Calculate position and wait time
    const peopleAhead = await Ticket.countDocuments({
      queue: updatedQueue._id,
      status: 'waiting',
      tokenNumber: { $lt: issuedTokenNumber },
    });

    const position = peopleAhead + 1;
    const estimatedWaitTimeMinutes = peopleAhead * (updatedQueue.averageServiceTime || 5);

    // Emit real-time socket events after successful database operations
    try {
      const waitingCount = await Ticket.countDocuments({
        queue: updatedQueue._id,
        status: 'waiting',
      });
      const queueStats = {
        waitingCount,
        currentlyServing: updatedQueue.currentlyServing || 0,
        estimatedWaitMinutes: waitingCount * (updatedQueue.averageServiceTime || 5),
      };
      const ticketPayload = {
        ...ticket.toJSON(),
        position,
        peopleAhead,
        estimatedWaitTimeMinutes,
      };
      emitTicketJoined(updatedQueue.business, updatedQueue.queueCode, ticketPayload, queueStats);
    } catch (socketErr) {
      console.warn('[Socket Notification Warning] emitTicketJoined failed:', socketErr.message);
    }

    return res.status(201).json({
      status: 'success',
      message: `Successfully joined! Your token number is #${ticket.tokenNumber}.`,
      data: {
        ticket: {
          id: ticket._id,
          tokenNumber: ticket.tokenNumber,
          customerName: ticket.customerName,
          status: ticket.status,
          joinedAt: ticket.joinedAt,
        },
        queue: {
          id: updatedQueue._id,
          name: updatedQueue.name,
          queueCode: updatedQueue.queueCode,
          status: updatedQueue.status,
          currentlyServing: updatedQueue.currentlyServing || 0,
        },
        position,
        peopleAhead,
        estimatedWaitTimeMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live token status, current position, and estimated wait time
 * @route   GET /api/public/tickets/:ticketId
 * @access  Public (Guest / Customer)
 */
export const getPublicTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ticket reference identifier.',
      });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate('queue', 'name queueCode status currentlyServing averageServiceTime')
      .populate('business', 'name businessId');

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found. It may have expired or been removed.',
      });
    }

    const queue = ticket.queue;
    let peopleAhead = 0;
    let position = 0;
    let estimatedWaitTimeMinutes = 0;

    if (ticket.status === 'waiting') {
      peopleAhead = await Ticket.countDocuments({
        queue: queue._id,
        status: 'waiting',
        tokenNumber: { $lt: ticket.tokenNumber },
      });
      position = peopleAhead + 1;
      estimatedWaitTimeMinutes = peopleAhead * (queue.averageServiceTime || 5);
    } else if (ticket.status === 'called' || ticket.status === 'serving') {
      peopleAhead = 0;
      position = 0;
      estimatedWaitTimeMinutes = 0;
    } else {
      // completed, skipped, cancelled
      peopleAhead = 0;
      position = 0;
      estimatedWaitTimeMinutes = 0;
    }

    return res.status(200).json({
      status: 'success',
      data: {
        ticket: {
          id: ticket._id,
          tokenNumber: ticket.tokenNumber,
          customerName: ticket.customerName,
          status: ticket.status,
          joinedAt: ticket.joinedAt,
          calledAt: ticket.calledAt,
          completedAt: ticket.completedAt,
        },
        queue: {
          id: queue._id,
          name: queue.name,
          queueCode: queue.queueCode,
          status: queue.status,
          currentlyServing: queue.currentlyServing || 0,
          averageServiceTime: queue.averageServiceTime || 5,
          business: {
            name: ticket.business?.name,
            businessId: ticket.business?.businessId,
          },
        },
        position,
        peopleAhead,
        estimatedWaitTimeMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};
