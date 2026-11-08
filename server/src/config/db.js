import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let spawnedMongodProcess = null;
let isPersistentStorage = false;
let persistentStoragePath = null;

// Helper to check if a TCP port is open
const isPortOpen = (port = 27017, host = '127.0.0.1') => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
};

// Locate a mongod binary for local development fallback
const findMongodBinary = () => {
  if (process.env.MONGOD_PATH && fs.existsSync(process.env.MONGOD_PATH)) {
    return process.env.MONGOD_PATH;
  }

  // Look in node_modules/.cache/mongodb-memory-server
  const cacheDir = path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server');
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    const exe = files.find((f) => f.startsWith('mongod') && (f.endsWith('.exe') || !f.includes('.')));
    if (exe) {
      return path.join(cacheDir, exe);
    }
  }

  return null;
};

/**
 * Cleanly sanitize and validate MongoDB URI string format
 * Strips whitespace and accidentally copied quotation marks
 */
const sanitizeMongoUri = (rawUri) => {
  if (!rawUri || typeof rawUri !== 'string') return '';
  let cleaned = rawUri.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

export const connectDB = async () => {
  const configuredUri = sanitizeMongoUri(process.env.MONGODB_URI);

  // 1. Strict Production Mode: Require MongoDB Atlas or remote cluster
  if (process.env.NODE_ENV === 'production') {
    if (!configuredUri) {
      console.error(
        '[Database Fatal] MONGODB_URI environment variable is required in production mode. ' +
        'Please configure a MongoDB Atlas connection string in your Render environment variables. ' +
        'Local database fallback is strictly prohibited in production.'
      );
      process.exit(1);
    }

    // Diagnostic validation check without printing secrets
    if (/:[^@/]*<[^>@/]+>[^@/]*@/.test(configuredUri)) {
      console.warn(
        '[Database Warning] MONGODB_URI appears to contain placeholder angle brackets "<...>" in the password field. ' +
        'Ensure you remove the "<" and ">" characters around your actual password in Render environment variables.'
      );
    }

    const atCount = (configuredUri.match(/@/g) || []).length;
    if (atCount > 1) {
      console.warn(
        '[Database Warning] MONGODB_URI contains multiple "@" characters. ' +
        'If your MongoDB password contains an "@" or other reserved characters (: / ? # [ ] @ % & + $ =), ' +
        'it must be URL-encoded (e.g. "@" becomes "%40", ":" becomes "%3A") per RFC 3986.'
      );
    }

    // Configure production connection options
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000,
    };

    // If URI path has no database specified (e.g. mongodb+srv://host/?options), set explicit dbName
    const pathMatch = configuredUri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?#]+)/);
    const pathDb = pathMatch && pathMatch[1].trim().length > 0 ? pathMatch[1].trim() : null;
    if (!pathDb) {
      connectionOptions.dbName = process.env.MONGODB_DB_NAME || 'queueless';
    }

    // Explicitly set authSource to admin if not specified in URI query string
    if (!configuredUri.includes('authSource=')) {
      connectionOptions.authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
    }

    try {
      console.log('[Database] Connecting to production MongoDB cluster...');
      const conn = await mongoose.connect(configuredUri, connectionOptions);
      console.log(`[Database] Successfully connected to production MongoDB: ${conn.connection.host}`);
      isPersistentStorage = true;
      persistentStoragePath = 'MongoDB Atlas / External Cluster';
      return conn;
    } catch (error) {
      console.error(`[Database Fatal] Production MongoDB connection failed: ${error.message}`);

      // Provide actionable troubleshooting checklist on authentication failure without exposing credentials
      if (
        error.message.includes('bad auth') ||
        error.message.includes('authentication failed') ||
        error.message.includes('Authentication failed')
      ) {
        console.error('================================================================');
        console.error('🔐 MongoDB Atlas Authentication Troubleshooting Checklist:');
        console.error(' 1. Verify you are using a Database User created under Atlas "Database Access"');
        console.error('    (NOT your personal MongoDB Atlas web login email/password).');
        console.error(' 2. Verify the username and password in Render MONGODB_URI are exact.');
        console.error(' 3. If the password contains special characters (: / ? # [ ] @ % & + $ =),');
        console.error('    they MUST be URL-encoded (e.g., "@" -> "%40", "#" -> "%23").');
        console.error(' 4. Ensure placeholder brackets "<" and ">" were removed around password.');
        console.error(' 5. In Atlas "Network Access", ensure IP access list allows 0.0.0.0/0');
        console.error('    (required for Render cloud dynamic outbound IPs).');
        console.error(' 6. Ensure the Atlas user has "readWrite" privileges on the target database.');
        console.error('================================================================');
      }

      process.exit(1);
    }
  }

  // 2. Non-Production: External MongoDB URI (Atlas or remote cluster)
  if (configuredUri && !configuredUri.includes('localhost') && !configuredUri.includes('127.0.0.1')) {
    try {
      const conn = await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] Connected to external MongoDB: ${conn.connection.host}`);
      isPersistentStorage = true;
      persistentStoragePath = 'external-cluster';
      return conn;
    } catch (error) {
      console.error(`[Database Error] External MongoDB connection failed: ${error.message}`);
    }
  }

  // 3. Non-Production: Check if a local MongoDB daemon is already running on port 27017
  const portOpen = await isPortOpen(27017, '127.0.0.1');
  const localUri = configuredUri || 'mongodb://127.0.0.1:27017/queueless';

  if (portOpen) {
    try {
      const conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[Database] Connected to active local MongoDB daemon: ${conn.connection.host}:${conn.connection.port}`);
      isPersistentStorage = true;
      persistentStoragePath = 'local-daemon:27017';
      return conn;
    } catch (err) {
      console.warn(`[Database] Port 27017 open but connection failed: ${err.message}`);
    }
  }

  // 4. Non-Production Local fallback: start local persistent mongod instance in .data/db
  const mongodBin = findMongodBinary();
  const dataDir = process.env.MONGODB_DATA_DIR || path.resolve(__dirname, '../../.data/db');

  if (!mongodBin) {
    throw new Error(
      '[Database Fatal] No local MongoDB daemon found on port 27017, and no local mongod binary was found to launch persistent storage. Please start MongoDB or specify MONGODB_URI.'
    );
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`[Database] Launching persistent local MongoDB engine (dbpath: ${dataDir})...`);
  spawnedMongodProcess = spawn(
    mongodBin,
    ['--dbpath', dataDir, '--port', '27017', '--bind_ip', '127.0.0.1'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  spawnedMongodProcess.on('error', (err) => {
    console.error(`[Database Engine Error] ${err.message}`);
  });

  // Wait for MongoDB to start accepting connections (up to 10 seconds)
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortOpen(27017, '127.0.0.1')) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    throw new Error('[Database Fatal] Timed out waiting for persistent local MongoDB engine to initialize on port 27017.');
  }

  const conn = await mongoose.connect(localUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`[Database] Successfully connected to persistent MongoDB storage: ${localUri}`);
  isPersistentStorage = true;
  persistentStoragePath = dataDir;

  return conn;
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      if (spawnedMongodProcess) {
        try {
          await mongoose.connection.db?.admin().command({ shutdown: 1 });
        } catch {
          // Socket closes on shutdown
        }
      }
      await mongoose.disconnect();
      console.log('[Database] Disconnected from MongoDB cleanly.');
    }
  } catch (err) {
    console.warn(`[Database Disconnect Warning] ${err.message}`);
  }

  if (spawnedMongodProcess) {
    try {
      spawnedMongodProcess.kill();
    } catch {}
    spawnedMongodProcess = null;
  }
};

export const getDbPersistenceInfo = () => ({
  isPersistent: isPersistentStorage,
  storagePath: persistentStoragePath,
});
