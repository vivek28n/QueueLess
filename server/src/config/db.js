import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const configuredUri = process.env.MONGODB_URI;

  // 1. If explicit URI is provided (e.g. MongoDB Atlas or custom URI), attempt connection
  if (configuredUri && !configuredUri.includes('localhost') && !configuredUri.includes('127.0.0.1')) {
    try {
      const conn = await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] Connected to external MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`[Database Error] External MongoDB connection failed: ${error.message}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  // 2. Try local MongoDB first if specified
  const localUri = configuredUri || 'mongodb://127.0.0.1:27017/queueless';
  try {
    const conn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected to local MongoDB daemon: ${conn.connection.host}`);
    return conn;
  } catch (localError) {
    console.warn(`[Database] Local MongoDB daemon on 27017 not available (${localError.message}).`);
    console.log('[Database] Initializing embedded in-memory MongoDB engine for seamless development...');
    
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to embedded in-memory MongoDB: ${memoryUri}`);
      return conn;
    } catch (memError) {
      console.error(`[Database Fatal] Failed to initialize embedded MongoDB: ${memError.message}`);
      throw memError;
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
