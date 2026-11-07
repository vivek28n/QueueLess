import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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
 * Join public customer queue room
 */
export const joinQueueRoom = (queueCode, ticketId = null) => {
  if (!queueCode) return;
  connectSocket();
  socket.emit('queue:join', { queueCode, ticketId });
};

/**
 * Join admin private business room
 */
export const joinAdminRoom = (businessId, queueId = null, token = null) => {
  const authToken = token || getAuthToken();
  connectSocket(authToken);
  socket.emit('admin:join', { businessId, queueId, token: authToken });
};

export default socket;
