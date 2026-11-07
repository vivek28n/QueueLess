import mongoose from 'mongoose';
import Queue from '../models/Queue.js';
import Ticket from '../models/Ticket.js';

/**
 * @desc    Create a new Queue for the authenticated business
 * @route   POST /api/queues
 * @access  Private (Admin / Staff)
 */
export const createQueue = async (req, res, next) => {
  try {
    const { name, description, averageServiceTime, queueCode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Queue name is required.',
      });
    }

    let finalQueueCode = '';

    if (queueCode && queueCode.trim()) {
      const sanitizedCode = queueCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (sanitizedCode.length < 3) {
        return res.status(400).json({
          status: 'error',
          message: 'Custom queue code must be at least 3 alphanumeric characters.',
        });
      }

      // Check uniqueness
      const existing = await Queue.findOne({ queueCode: sanitizedCode });
      if (existing) {
        return res.status(400).json({
          status: 'error',
          message: `Queue code '${sanitizedCode}' is already in use. Please choose another code.`,
        });
      }
      finalQueueCode = sanitizedCode;
    } else {
      finalQueueCode = await Queue.generateQueueCode(name);
    }

    const parsedServiceTime =
      averageServiceTime !== undefined && averageServiceTime !== null
        ? Number(averageServiceTime)
        : 5;
    if (isNaN(parsedServiceTime) || parsedServiceTime < 1 || parsedServiceTime > 240) {
      return res.status(400).json({
        status: 'error',
        message: 'Average service time must be a number between 1 and 240 minutes.',
      });
    }

    const queue = await Queue.create({
      business: req.user.business._id,
      name: name.trim(),
      description: description ? description.trim() : '',
      queueCode: finalQueueCode,
      averageServiceTime: parsedServiceTime,
      status: 'active',
      currentTokenNumber: 0,
      currentlyServing: 0,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Queue created successfully.',
      data: { queue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all queues belonging to the authenticated business with live stats
 * @route   GET /api/queues
 * @access  Private (Admin / Staff)
 */
export const getMyQueues = async (req, res, next) => {
  try {
    const businessId = req.user.business._id;
    const queues = await Queue.find({ business: businessId }).sort({ createdAt: -1 });

    // Compute live stats for each queue
    const queuesWithStats = await Promise.all(
      queues.map(async (queue) => {
        const [waitingCount, servingCount, completedCount, totalTickets] = await Promise.all([
          Ticket.countDocuments({ queue: queue._id, status: 'waiting' }),
          Ticket.countDocuments({ queue: queue._id, status: { $in: ['called', 'serving'] } }),
          Ticket.countDocuments({ queue: queue._id, status: 'completed' }),
          Ticket.countDocuments({ queue: queue._id }),
        ]);

        const queueObj = queue.toJSON();
        queueObj.stats = {
          waitingCount,
          servingCount,
          completedCount,
          totalTickets,
          currentlyServing: queue.currentlyServing || 0,
          estimatedWaitMinutes: waitingCount * (queue.averageServiceTime || 5),
        };

        return queueObj;
      })
    );

    return res.status(200).json({
      status: 'success',
      data: {
        queues: queuesWithStats,
        count: queuesWithStats.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get queue details and comprehensive statistics
 * @route   GET /api/queues/:id
 * @access  Private (Admin / Staff)
 */
export const getQueueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid queue identifier format.',
      });
    }

    const queue = await Queue.findOne({
      _id: id,
      business: req.user.business._id,
    });

    if (!queue) {
      return res.status(404).json({
        status: 'error',
        message: 'Queue not found or access denied.',
      });
    }

    // Retrieve stats, active ticket, waiting tickets, and recent activity
    const [
      waitingCount,
      servingCount,
      completedCount,
      skippedCount,
      cancelledCount,
      totalTickets,
      activeTicket,
      waitingTickets,
      recentTickets,
    ] = await Promise.all([
      Ticket.countDocuments({ queue: queue._id, status: 'waiting' }),
      Ticket.countDocuments({ queue: queue._id, status: { $in: ['called', 'serving'] } }),
      Ticket.countDocuments({ queue: queue._id, status: 'completed' }),
      Ticket.countDocuments({ queue: queue._id, status: 'skipped' }),
      Ticket.countDocuments({ queue: queue._id, status: 'cancelled' }),
      Ticket.countDocuments({ queue: queue._id }),
      Ticket.findOne({ queue: queue._id, status: { $in: ['called', 'serving'] } }),
      Ticket.find({ queue: queue._id, status: 'waiting' })
        .sort({ tokenNumber: 1 })
        .limit(100),
      Ticket.find({ queue: queue._id, status: { $ne: 'waiting' } })
        .sort({ updatedAt: -1 })
        .limit(20),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        queue,
        stats: {
          waitingCount,
          servingCount,
          completedCount,
          skippedCount,
          cancelledCount,
          totalTickets,
          currentlyServing: queue.currentlyServing || 0,
          estimatedWaitMinutes: waitingCount * (queue.averageServiceTime || 5),
        },
        activeTicket,
        waitingTickets,
        recentTickets,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update queue details and operational status
 * @route   PATCH /api/queues/:id
 * @access  Private (Admin / Staff)
 */
export const updateQueue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, averageServiceTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid queue identifier format.',
      });
    }

    const queue = await Queue.findOne({
      _id: id,
      business: req.user.business._id,
    });

    if (!queue) {
      return res.status(404).json({
        status: 'error',
        message: 'Queue not found or access denied.',
      });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Queue name cannot be empty.',
        });
      }
      queue.name = name.trim();
    }

    if (description !== undefined) {
      queue.description = description ? description.trim() : '';
    }

    if (status !== undefined) {
      const allowedStatuses = ['active', 'paused', 'closed'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}.`,
        });
      }
      queue.status = status;
    }

    if (averageServiceTime !== undefined) {
      const parsedTime = Number(averageServiceTime);
      if (isNaN(parsedTime) || parsedTime < 1 || parsedTime > 240) {
        return res.status(400).json({
          status: 'error',
          message: 'Average service time must be between 1 and 240 minutes.',
        });
      }
      queue.averageServiceTime = parsedTime;
    }

    await queue.save();

    return res.status(200).json({
      status: 'success',
      message: 'Queue updated successfully.',
      data: { queue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Call next waiting customer to counter
 * @route   POST /api/queues/:id/next
 * @access  Private (Admin / Staff)
 */
export const callNextCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid queue identifier format.',
      });
    }

    const queue = await Queue.findOne({
      _id: id,
      business: req.user.business._id,
    });

    if (!queue) {
      return res.status(404).json({
        status: 'error',
        message: 'Queue not found or access denied.',
      });
    }

    // Find the next waiting ticket ordered by tokenNumber
    const nextTicket = await Ticket.findOne({
      queue: queue._id,
      status: 'waiting',
    }).sort({ tokenNumber: 1 });

    if (!nextTicket) {
      return res.status(400).json({
        status: 'error',
        message: 'No waiting customers in the queue.',
      });
    }

    // Auto-complete any ticket currently in 'called' or 'serving' status
    await Ticket.updateMany(
      {
        queue: queue._id,
        status: { $in: ['called', 'serving'] },
      },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
        },
      }
    );

    // Call the next ticket
    nextTicket.status = 'called';
    nextTicket.calledAt = new Date();
    await nextTicket.save();

    // Update queue currentlyServing
    queue.currentlyServing = nextTicket.tokenNumber;
    await queue.save();

    return res.status(200).json({
      status: 'success',
      message: `Token #${nextTicket.tokenNumber} (${nextTicket.customerName}) has been called to the counter.`,
      data: {
        ticket: nextTicket,
        queue,
      },
    });
  } catch (error) {
    next(error);
  }
};
