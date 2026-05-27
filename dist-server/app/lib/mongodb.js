"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/resume-analyzer';
const DB_NAME = 'resume-analyzer';
let client = null;
let db = null;
async function getDb() {
    if (db)
        return db;
    client = new mongodb_1.MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    return db;
}
