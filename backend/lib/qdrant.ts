import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || '';

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

export const COLLECTION_NAME = 'resume_chunks';
export const VECTOR_SIZE = 384; // all-MiniLM-L6-v2 outputs 384 dimensions

/**
 * Initializes the Qdrant collection if it doesn't already exist.
 */
export async function initializeQdrant() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' not found. Creating...`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' created successfully.`);
    } else {
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' already exists.`);
    }

    // Ensure the payload index exists for filtering
    try {
      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'jobId',
        field_schema: 'keyword',
      });
      console.log(`[Qdrant] Payload index for 'jobId' ensured.`);
    } catch (indexError: any) {
      // Ignore if it already exists
      if (!indexError.message?.includes('already exists')) {
        console.error(`[Qdrant] Note: Payload index creation returned:`, indexError.message);
      }
    }
  } catch (error) {
    console.error('[Qdrant] Failed to initialize collection:', error);
    // Don't throw here, just log, so the server can still start even if Qdrant isn't ready
  }
}
