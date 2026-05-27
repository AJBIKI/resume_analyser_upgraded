"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeQueue = exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const bullmq_1 = require("bullmq");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Prevent maxEventListeners warning when multiple queues connect
exports.redisConnection = new ioredis_1.default(REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ requires this
});
exports.analyzeQueue = new bullmq_1.Queue('analyze-resume', {
    connection: exports.redisConnection,
});
