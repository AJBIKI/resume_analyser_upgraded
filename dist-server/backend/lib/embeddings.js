"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const inference_1 = require("@huggingface/inference");
// Initialize the Hugging Face Inference API client
const hf = new inference_1.HfInference(process.env.HUGGINGFACE_API_KEY);
/**
 * Generates an embedding for a given text using a free Hugging Face model.
 * Default model: all-MiniLM-L6-v2 (produces 384-dimensional vectors).
 */
async function generateEmbedding(text) {
    try {
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text,
        });
        // The API can return a 1D, 2D, or 3D array depending on inputs.
        // For a single string input, it usually returns number[].
        const embedding = Array.isArray(response[0]) ? response[0] : response;
        return embedding;
    }
    catch (error) {
        console.error('[Embeddings] Failed to generate embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}
