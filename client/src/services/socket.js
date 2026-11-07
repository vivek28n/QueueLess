import { io } from 'socket.io-client';

/**
 * Dynamically resolves the Socket.IO server URL:
 * 1. Checks VITE_SOCKET_URL if explicitly specified.
 * 2. If VITE_API_URL is provided, extracts its root (stripping /api).
 * 3. In non-localhost browser environments (production deployment without env vars), uses window.location.origin.
 * 4. In local development fallback, connects to http://localhost:5000.
 */
const resolveSocketServerUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return window.location.origin;
  }

  return 'http://localhost:5000';
};

const SOCKET_SERVER_URL = resolveSocketServerUrl();

const getAuthToken = () => {
  try {
    return localStorage.getItem('queueless_token');
  } catch {
    return null;
  }
};

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  auth: (cb) => {
    const token = getAuthToken();
    cb(token ? { token } : {});
  },
});

export const connectSocket = (token = null) => {
  if (token) {
    socket.auth = { token };
  } else {
    const savedToken = getAuthToken();
    if (savedToken) {
      socket.auth = { token: savedToken };
    }
  }

  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

/**
 * Join a customer public queue room
 */
export const joinQueueRoom = (queueCode, callback) => {
  if (!queueCode) return;
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('queue:join', { queueCode }, (response) => {
    if (callback) callback(response);
  });
};

/**
 * Join an authenticated admin business room
 */
export const joinAdminRoom = (callback) => {
  const token = getAuthToken();
  if (!token) {
    if (callback) callback({ status: 'error', message: 'Authentication required' });
    return;
  }
  if (!socket.connected) {
    connectSocket(token);
  }
  socket.emit('admin:subscribe', { token }, (response) => {
    if (callback) callback(response);
  });
};

export default socket;
