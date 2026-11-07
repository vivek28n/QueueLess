import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
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

// Real-time connection handler skeleton
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

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
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection & Server initialization
const startServer = async () => {
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 QueueLess Server is active`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth APIs: http://localhost:${PORT}/api/auth`);
    console.log(`🌐 Allowed Client: ${CLIENT_URL}`);
    console.log(`=========================================`);
  });

  // Connect to DB asynchronously so server is immediately available
  connectDB().catch((err) => {
    console.error(`[Database Error] ${err.message}`);
  });
};

startServer();
