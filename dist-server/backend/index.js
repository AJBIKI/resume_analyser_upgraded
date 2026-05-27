"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from Next.js .env file
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
// Import the BullMQ worker
require("./worker");
const qdrant_1 = require("./lib/qdrant");
const backend_1 = require("@clerk/backend");
const bullmq_1 = require("bullmq");
const redis_1 = require("../app/lib/redis");
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
// Next.js will be running on 3000
app.use((0, cors_1.default)({ origin: 'http://localhost:3000' }));
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
// Setup Socket.io
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});
// Authentication Middleware (Guard A & B)
exports.io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Missing token'));
    }
    try {
        const payload = await (0, backend_1.verifyToken)(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        // payload.sub is the user ID
        socket.data.userId = payload.sub;
        next();
    }
    catch (err) {
        console.error('[Socket.io] Authentication failed:', err);
        return next(new Error('Authentication error: Invalid token'));
    }
});
exports.io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id} (User: ${socket.data.userId})`);
    // Clients join a room based on the jobId they want to track (Guard C)
    socket.on('joinJobRoom', async (jobId) => {
        try {
            const job = await bullmq_1.Job.fromId(redis_1.analyzeQueue, jobId);
            if (!job) {
                socket.emit('error', { message: 'Job not found' });
                return;
            }
            // Verify owner
            if (job.data.clerkUserId === socket.data.userId) {
                socket.join(jobId);
                console.log(`[Socket.io] Socket ${socket.id} joined room: ${jobId}`);
            }
            else {
                socket.emit('error', { message: 'Unauthorized room access' });
                console.warn(`[Socket.io] Unauthorized room join attempt by user ${socket.data.userId} for job ${jobId}`);
            }
        }
        catch (err) {
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
    await (0, qdrant_1.initializeQdrant)();
});
