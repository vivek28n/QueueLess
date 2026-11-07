import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketServer } from './services/socketService.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/securityHeaders.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable trust proxy for Render / Cloud load balancers
app.set('trust proxy', 1);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Resolve allowed CORS origins
const getAllowedOrigins = () => {
  const origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const configured = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS;
  if (configured) {
    const split = configured.split(',').map((o) => o.trim()).filter(Boolean);
    origins.push(...split);
  }
  return Array.from(new Set(origins));
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, cURL, automated tests)
    if (!origin) return callback(null, true);

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }

    // Permit Vercel preview branch deployments (*.vercel.app)
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch {}

    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Socket.IO configuration with CORS and WebSocket support
export const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Real-time Socket.IO Server Engine
initSocketServer(io);

// Security & utility middleware
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(corsOptions));
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
    status: 'running',
    health: '/api/health',
    documentation: {
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
    server.listen(PORT, HOST, () => {
      console.log(`=========================================`);
      console.log(`🚀 QueueLess Server is active`);
      console.log(`📡 Host: ${HOST} | Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🩺 Health check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
      console.log(`🌐 Allowed Client Origins: ${getAllowedOrigins().join(', ')}`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error(`[Fatal Startup Error] ${err.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP and WebSocket connections closed.');
    await disconnectDB();
    console.log('[Server] Graceful shutdown completed cleanly.');
    process.exit(0);
  });

  // Force termination if connections do not close in 10s
  setTimeout(() => {
    console.error('[Server] Could not close active connections in time, forcefully terminating.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
