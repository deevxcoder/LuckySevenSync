import { io } from 'socket.io-client';

// Connect to the same host and port as the web server  
// Let socket.io auto-detect the connection URL in development
const URL = undefined; // Auto-detect connection

console.log('🔌 Initializing socket with URL:', URL);

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['polling', 'websocket'],  // Try polling first, then websocket
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

socket.on('connect_error', (error) => {
  console.error('🔌 Connection error:', error);
});

// Log initial connection state
console.log('🔌 Socket connected state:', socket.connected);
