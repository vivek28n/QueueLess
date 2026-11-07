import mongoose from 'mongoose';
import { getDbPersistenceInfo } from '../config/db.js';

export const getHealthStatus = (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const persistence = getDbPersistenceInfo();
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(200).json({
    status: 'ok',
    service: 'QueueLess API',
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      readyState: dbState,
      isPersistent: persistence.isPersistent,
      // Protect sensitive cluster URI credentials in production
      storagePath: isProduction ? 'Atlas/External Cluster' : persistence.storagePath,
    },
    system: {
      memoryUsage: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      nodeVersion: process.version,
    },
  });
};
