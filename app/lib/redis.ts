import Redis from 'ioredis';
import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Prevent maxEventListeners warning when multiple queues connect
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ requires this
});

export const analyzeQueue = new Queue('analyze-resume', {
  connection: redisConnection,
});
