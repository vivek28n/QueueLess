import mongoose from 'mongoose';
import Ticket, { isValidTransition } from '../models/Ticket.js';
import Queue from '../models/Queue.js';

/**
 * @desc    Skip a ticket
 * @route   PATCH /api/tickets/:id/skip
 * @access  Private (Admin / Staff)
 */
export const skipTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ticket identifier format.',
      });
    }

    const ticket = await Ticket.findOne({
      _id: id,
      business: req.user.business._id,
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found or access denied.',
      });
    }

    // Validate transition
    if (!isValidTransition(ticket.status, 'skipped')) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot skip ticket. Tickets with status '${ticket.status}' cannot transition to 'skipped'.`,
      });
    }

    ticket.status = 'skipped';
    await ticket.save();

    // Check if this was currentlyServing in the queue
    const queue = await Queue.findById(ticket.queue);
    if (queue && queue.currentlyServing === ticket.tokenNumber) {
      // Check if another ticket is called/serving
      const activeTicket = await Ticket.findOne({
        queue: queue._id,
        status: { $in: ['called', 'serving'] },
      });
      queue.currentlyServing = activeTicket ? activeTicket.tokenNumber : 0;
      await queue.save();
    }

    return res.status(200).json({
      status: 'success',
      message: `Token #${ticket.tokenNumber} (${ticket.customerName}) marked as skipped.`,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete a ticket
 * @route   PATCH /api/tickets/:id/complete
 * @access  Private (Admin / Staff)
 */
export const completeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ticket identifier format.',
      });
    }

    const ticket = await Ticket.findOne({
      _id: id,
      business: req.user.business._id,
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found or access denied.',
      });
    }

    // Validate transition
    if (!isValidTransition(ticket.status, 'completed')) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot complete ticket. Tickets with status '${ticket.status}' cannot transition to 'completed'.`,
      });
    }

    ticket.status = 'completed';
    ticket.completedAt = new Date();
    await ticket.save();

    // Check if this was currentlyServing in the queue
    const queue = await Queue.findById(ticket.queue);
    if (queue && queue.currentlyServing === ticket.tokenNumber) {
      const activeTicket = await Ticket.findOne({
        queue: queue._id,
        status: { $in: ['called', 'serving'] },
      });
      queue.currentlyServing = activeTicket ? activeTicket.tokenNumber : 0;
      await queue.save();
    }

    return res.status(200).json({
      status: 'success',
      message: `Token #${ticket.tokenNumber} (${ticket.customerName}) marked as completed.`,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};
