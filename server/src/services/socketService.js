import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';
import Queue from '../models/Queue.js';
import Ticket from '../models/Ticket.js';

let ioInstance = null;

/**
 * Initialize Socket.IO server with room management, authentication, and event listeners
 */
export const initSocketServer = (io) => {
  ioInstance = io;

  // Handshake authentication middleware for authenticated sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = verifyToken(token);
          const user = await User.findById(decoded.id).populate('business');
          if (user && user.business) {
            socket.user = user;
            socket.business = user.business;
            socket.isAdmin = user.role === 'admin' || user.role === 'staff';
          }
        } catch (err) {
          // Token is invalid/expired; continue as unauthenticated guest socket
          socket.authError = err.message;
        }
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    // -------------------------------------------------------------
    // Customer / Public Room: queue:join
    // -------------------------------------------------------------
    socket.on('queue:join', async (data = {}, callback) => {
      try {
        const { queueCode, ticketId } = data;

        if (!queueCode || typeof queueCode !== 'string' || !queueCode.trim()) {
          const errorMsg = 'Valid queue code is required to subscribe to queue updates.';
          socket.emit('queue:error', { message: errorMsg });
          if (typeof callback === 'function') callback({ status: 'error', message: errorMsg });
          return;
        }

        const cleanCode = queueCode.trim().toUpperCase();
        const queue = await Queue.findOne({ queueCode: cleanCode }).populate('business', 'name businessId industry');

        if (!queue) {
          const errorMsg = `Queue with code '${cleanCode}' was not found.`;
          socket.emit('queue:error', { message: errorMsg });
          if (typeof callback === 'function') callback({ status: 'error', message: errorMsg });
          return;
        }

        // Leave any previously joined public queue rooms on this socket to prevent room leaks
        for (const room of socket.rooms) {
          if (room.startsWith('queue:') && room !== `queue:${cleanCode}`) {
            socket.leave(room);
          }
        }

        // Join the public queue room
        const publicRoom = `queue:${cleanCode}`;
        socket.join(publicRoom);

        // If ticketId is provided, validate and join the specific ticket room
        let ticketState = null;
        let peopleAhead = 0;
        let position = 0;
        let estimatedWaitMinutes = 0;

        if (ticketId) {
          const ticket = await Ticket.findOne({
            _id: ticketId,
            queue: queue._id,
          });

          if (ticket) {
            const ticketRoom = `ticket:${ticket._id}`;
            socket.join(ticketRoom);

            if (ticket.status === 'waiting') {
              peopleAhead = await Ticket.countDocuments({
                queue: queue._id,
                status: 'waiting',
                tokenNumber: { $lt: ticket.tokenNumber },
              });
              position = peopleAhead + 1;
              estimatedWaitMinutes = peopleAhead * (queue.averageServiceTime || 5);
            }

            ticketState = {
              id: ticket._id,
              tokenNumber: ticket.tokenNumber,
              customerName: ticket.customerName,
              status: ticket.status,
              joinedAt: ticket.joinedAt,
              calledAt: ticket.calledAt,
              completedAt: ticket.completedAt,
              position,
              peopleAhead,
              estimatedWaitTimeMinutes: estimatedWaitMinutes,
            };
          }
        }

        // Calculate queue public stats
        const waitingCount = await Ticket.countDocuments({
          queue: queue._id,
          status: 'waiting',
        });

        const initialWaitEst = waitingCount * (queue.averageServiceTime || 5);

        const statePayload = {
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
            },
          },
          stats: {
            waitingCount,
            currentlyServing: queue.currentlyServing || 0,
            estimatedWaitMinutes: initialWaitEst,
          },
          ticket: ticketState,
        };

        // Emit initial state back to the subscriber
        socket.emit('queue:state', statePayload);
        if (typeof callback === 'function') {
          callback({ status: 'success', data: statePayload });
        }
      } catch (err) {
        console.error('[Socket Error] queue:join failed:', err.message);
        socket.emit('queue:error', { message: 'Internal server error while joining queue.' });
        if (typeof callback === 'function') {
          callback({ status: 'error', message: 'Internal server error' });
        }
      }
    });

    // -------------------------------------------------------------
    // Admin Room: admin:join
    // -------------------------------------------------------------
    socket.on('admin:join', async (data = {}, callback) => {
      try {
        let authUser = socket.user;
        let authBusiness = socket.business;

        // Support joining with token in event payload if not in handshake
        if (!authUser && data.token) {
          try {
            const decoded = verifyToken(data.token);
            const user = await User.findById(decoded.id).populate('business');
            if (user && user.business) {
              authUser = user;
              authBusiness = user.business;
              socket.user = user;
              socket.business = user.business;
              socket.isAdmin = true;
            }
          } catch (tokenErr) {
            const errorMsg = 'Invalid authentication token for admin room.';
            socket.emit('queue:error', { message: errorMsg });
            if (typeof callback === 'function') callback({ status: 'error', message: errorMsg });
            return;
          }
        }

        if (!authUser || !authBusiness) {
          const errorMsg = 'Unauthorized: Administrator authentication required.';
          socket.emit('queue:error', { message: errorMsg });
          if (typeof callback === 'function') callback({ status: 'error', message: errorMsg });
          return;
        }

        // If target businessId specified in data, enforce strict ownership
        const targetBusinessId = data.businessId;
        if (targetBusinessId && targetBusinessId !== authBusiness._id.toString() && targetBusinessId !== authBusiness.businessId) {
          const errorMsg = 'Forbidden: Cross-business administration access is rejected.';
          socket.emit('queue:error', { message: errorMsg });
          if (typeof callback === 'function') callback({ status: 'error', message: errorMsg });
          return;
        }

        // Join private business admin channel
        const adminRoom = `admin:business:${authBusiness._id.toString()}`;
        socket.join(adminRoom);

        // Optionally join specific queue admin room if requested
        if (data.queueId) {
          const queue = await Queue.findOne({
            _id: data.queueId,
            business: authBusiness._id,
          });
          if (queue) {
            socket.join(`admin:queue:${queue._id.toString()}`);
            socket.join(`queue:${queue.queueCode}`); // Also receive public updates
          }
        }

        if (typeof callback === 'function') {
          callback({
            status: 'success',
            message: `Admin subscribed to business ${authBusiness.businessId}`,
            businessId: authBusiness._id,
          });
        }
      } catch (err) {
        console.error('[Socket Error] admin:join failed:', err.message);
        socket.emit('queue:error', { message: 'Internal error in admin subscription.' });
        if (typeof callback === 'function') {
          callback({ status: 'error', message: 'Internal server error' });
        }
      }
    });

    socket.on('disconnect', () => {
      // Socket.IO automatically leaves rooms on disconnect
    });
  });

  return io;
};

/**
 * Emit event when a new ticket is joined
 * - To admin rooms: contains full details including customerContact
 * - To public queue room: contains sanitized update without contact details
 */
export const emitTicketJoined = (businessId, queueCode, ticketData, queueStats) => {
  if (!ioInstance) return;

  const bId = businessId.toString();

  // 1. Admin Event: includes private contact info
  ioInstance.to(`admin:business:${bId}`).emit('ticket:joined', {
    queueCode,
    ticket: ticketData,
    stats: queueStats,
  });

  // 2. Public Event: strictly omits customer contact info
  const sanitizedTicket = {
    id: ticketData.id || ticketData._id,
    tokenNumber: ticketData.tokenNumber,
    customerName: ticketData.customerName,
    status: ticketData.status,
    joinedAt: ticketData.joinedAt,
  };

  ioInstance.to(`queue:${queueCode}`).emit('queue:updated', {
    queueCode,
    type: 'customer_joined',
    latestTokenNumber: ticketData.tokenNumber,
    stats: queueStats,
    lastTicket: sanitizedTicket,
  });
};

/**
 * Emit event when a ticket status changes (called, serving, completed, skipped, cancelled)
 */
export const emitTicketUpdated = (businessId, queueCode, ticketData, queueStats) => {
  if (!ioInstance) return;

  const bId = businessId.toString();
  const ticketId = (ticketData.id || ticketData._id).toString();

  // 1. Emit to admin room (includes contact if available)
  ioInstance.to(`admin:business:${bId}`).emit('ticket:updated', {
    queueCode,
    ticket: ticketData,
    stats: queueStats,
  });

  // 2. Emit to specific ticket room for this customer (omits private contact)
  const sanitizedTicket = {
    id: ticketData.id || ticketData._id,
    tokenNumber: ticketData.tokenNumber,
    customerName: ticketData.customerName,
    status: ticketData.status,
    joinedAt: ticketData.joinedAt,
    calledAt: ticketData.calledAt,
    completedAt: ticketData.completedAt,
    position: ticketData.position,
    peopleAhead: ticketData.peopleAhead,
    estimatedWaitTimeMinutes: ticketData.estimatedWaitTimeMinutes,
    currentlyServing: queueStats.currentlyServing,
  };

  ioInstance.to(`ticket:${ticketId}`).emit('ticket:updated', {
    ticket: sanitizedTicket,
    queueCode,
    stats: queueStats,
  });

  // 3. Emit queue:updated to public queue room
  ioInstance.to(`queue:${queueCode}`).emit('queue:updated', {
    queueCode,
    type: 'ticket_status_change',
    stats: queueStats,
    ticket: sanitizedTicket,
  });
};

/**
 * Emit event when queue details or operational status change (active, paused, closed)
 */
export const emitQueueUpdated = (businessId, queueCode, queueData, queueStats) => {
  if (!ioInstance) return;

  const bId = businessId.toString();

  const payload = {
    queueCode,
    queue: {
      id: queueData.id || queueData._id,
      name: queueData.name,
      description: queueData.description,
      queueCode: queueData.queueCode,
      status: queueData.status,
      currentlyServing: queueData.currentlyServing || 0,
      averageServiceTime: queueData.averageServiceTime || 5,
    },
    stats: queueStats,
  };

  // Broadcast to both admin and public queue rooms
  ioInstance.to(`admin:business:${bId}`).emit('queue:updated', payload);
  ioInstance.to(`queue:${queueCode}`).emit('queue:updated', payload);
};

export const getIO = () => ioInstance;
