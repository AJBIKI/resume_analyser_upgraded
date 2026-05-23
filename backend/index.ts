import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from Next.js .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import the BullMQ worker
import './worker';
import { initializeQdrant } from './lib/qdrant';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Next.js will be running on 3000
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const httpServer = createServer(app);

// Setup Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Clients join a room based on the jobId they want to track
  socket.on('joinJobRoom', (jobId: string) => {
    socket.join(jobId);
    console.log(`[Socket.io] Socket ${socket.id} joined room: ${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, async () => {
  console.log(`[Express] Server running on port ${port}`);
  console.log(`[Socket.io] WebSocket server listening on port ${port}`);
  await initializeQdrant();
});
