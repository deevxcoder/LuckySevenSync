import { io } from 'socket.io-client';

// Connect to the same host and port as the web server
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5,
});

// Log connection events for debugging
socket.on('connect', () => {
  console.log('🔌 Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected from server:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔌 Reconnected to server after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('🔌 Reconnection error:', error);
});
