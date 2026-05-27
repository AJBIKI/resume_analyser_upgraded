import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from Next.js .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { initializeQdrant } from './lib/qdrant';
import { verifyToken } from '@clerk/backend';
import { Job } from 'bullmq';
import { analyzeQueue } from '../app/lib/redis';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Next.js will be running on 3000 locally, or a Vercel domain in production
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);

// Setup Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Authentication Middleware (Guard A & B)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Missing token'));
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    // payload.sub is the user ID
    socket.data.userId = payload.sub;
    next();
  } catch (err) {
    console.error('[Socket.io] Authentication failed:', err);
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id} (User: ${socket.data.userId})`);

  // Clients join a room based on the jobId they want to track (Guard C)
  socket.on('joinJobRoom', async (jobId: string) => {
    try {
      const job = await Job.fromId(analyzeQueue, jobId);
      if (!job) {
        socket.emit('error', { message: 'Job not found' });
        return;
      }

      // Verify owner
      if (job.data.clerkUserId === socket.data.userId) {
        socket.join(jobId);
        console.log(`[Socket.io] Socket ${socket.id} joined room: ${jobId}`);
      } else {
        socket.emit('error', { message: 'Unauthorized room access' });
        console.warn(`[Socket.io] Unauthorized room join attempt by user ${socket.data.userId} for job ${jobId}`);
      }
    } catch (err) {
      console.error(`[Socket.io] Error joining room:`, err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, async () => {
  console.log(`[Express] Server running on port ${port}`);
  console.log(`[Socket.io] WebSocket server listening on port ${port}`);
  await initializeQdrant();

  // Import the BullMQ worker strictly AFTER io is exported and server is running
  require('./worker');
});
