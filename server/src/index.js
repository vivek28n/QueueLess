import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSocketServer } from './services/socketService.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.IO configuration
export const io = new SocketIOServer(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Real-time Socket.IO Server Engine
initSocketServer(io);

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Primary API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/public', publicRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'QueueLess API Server',
    description: 'Smart Live Queue Management System Backend',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      queues: {
        create: 'POST /api/queues',
        list: 'GET /api/queues',
        get: 'GET /api/queues/:id',
        update: 'PATCH /api/queues/:id',
        callNext: 'POST /api/queues/:id/next',
      },
      tickets: {
        skip: 'PATCH /api/tickets/:id/skip',
        complete: 'PATCH /api/tickets/:id/complete',
      },
      public: {
        getQueue: 'GET /api/public/queues/:queueCode',
        joinQueue: 'POST /api/public/queues/:queueCode/join',
        getTicket: 'GET /api/public/tickets/:ticketId',
      },
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection & Server initialization
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 QueueLess Server is active`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth APIs: http://localhost:${PORT}/api/auth`);
      console.log(`📋 Queue APIs: http://localhost:${PORT}/api/queues`);
      console.log(`🎟️ Ticket APIs: http://localhost:${PORT}/api/tickets`);
      console.log(`🌐 Public APIs: http://localhost:${PORT}/api/public`);
      console.log(`🌐 Allowed Client: ${CLIENT_URL}`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error(`[Fatal Startup Error] ${err.message}`);
    process.exit(1);
  }
};

startServer();
