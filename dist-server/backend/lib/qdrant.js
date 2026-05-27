"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VECTOR_SIZE = exports.COLLECTION_NAME = exports.qdrantClient = void 0;
exports.initializeQdrant = initializeQdrant;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || '';
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
});
exports.COLLECTION_NAME = 'resume_chunks';
exports.VECTOR_SIZE = 384; // all-MiniLM-L6-v2 outputs 384 dimensions
/**
 * Initializes the Qdrant collection if it doesn't already exist.
 */
async function initializeQdrant() {
    var _a;
    try {
        const collections = await exports.qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === exports.COLLECTION_NAME);
        if (!exists) {
            console.log(`[Qdrant] Collection '${exports.COLLECTION_NAME}' not found. Creating...`);
            await exports.qdrantClient.createCollection(exports.COLLECTION_NAME, {
                vectors: {
                    size: exports.VECTOR_SIZE,
                    distance: 'Cosine',
                },
            });
            console.log(`[Qdrant] Collection '${exports.COLLECTION_NAME}' created successfully.`);
        }
        else {
            console.log(`[Qdrant] Collection '${exports.COLLECTION_NAME}' already exists.`);
        }
        // Ensure the payload index exists for filtering
        try {
            await exports.qdrantClient.createPayloadIndex(exports.COLLECTION_NAME, {
                field_name: 'jobId',
                field_schema: 'keyword',
            });
            console.log(`[Qdrant] Payload index for 'jobId' ensured.`);
        }
        catch (indexError) {
            // Ignore if it already exists
            if (!((_a = indexError.message) === null || _a === void 0 ? void 0 : _a.includes('already exists'))) {
                console.error(`[Qdrant] Note: Payload index creation returned:`, indexError.message);
            }
        }
    }
    catch (error) {
        console.error('[Qdrant] Failed to initialize collection:', error);
        // Don't throw here, just log, so the server can still start even if Qdrant isn't ready
    }
}
