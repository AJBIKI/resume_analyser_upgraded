// backend/lib/embeddings.ts
// Generates text embeddings with a HuggingFace → OpenAI fallback strategy.
//
// Priority order:
//   1. If EMBEDDING_PROVIDER=openai is set, skip HF and go straight to OpenAI.
//   2. Otherwise try HuggingFace (sentence-transformers/all-MiniLM-L6-v2, 384-dim).
//   3. If HF fails for any reason (quota, network, timeout), fall back to
//      OpenAI text-embedding-3-small with dimensions=384.
//
// Both providers output 384-dimensional vectors, so the existing Qdrant
// collection (VECTOR_SIZE=384) requires no changes.
// Within a single analysis job all embeddings come from the same provider,
// so cosine similarity comparisons remain valid even when different jobs in
// the same collection used different providers.

import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

// ── Clients (lazy initialisation avoids crashes when a key isn't set) ────────
let _hf: HfInference | null = null;
function getHfClient(): HfInference {
  if (!_hf) _hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  return _hf;
}

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Dimension constant (must match Qdrant VECTOR_SIZE) ───────────────────────
const EMBEDDING_DIMS = 384;

// ── HuggingFace provider ─────────────────────────────────────────────────────
async function embedWithHuggingFace(text: string): Promise<number[]> {
  const hf = getHfClient();
  const response = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  });
  // API can return 1-D, 2-D or 3-D array depending on input shape
  const embedding = Array.isArray(response[0]) ? response[0] : response;
  return embedding as number[];
}

// ── OpenAI provider ──────────────────────────────────────────────────────────
// text-embedding-3-small supports Matryoshka Representation Learning (MRL):
// passing `dimensions: 384` outputs a valid 384-dim vector — not truncated
// junk — that fits the existing Qdrant collection without any migration.
async function embedWithOpenAI(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: EMBEDDING_DIMS,
  });
  return response.data[0].embedding;
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Generates a 384-dimensional embedding for the given text.
 *
 * Provider selection:
 *  - Set  EMBEDDING_PROVIDER=openai  to always use OpenAI (skip HF attempt).
 *  - Otherwise HuggingFace is tried first; OpenAI is the automatic fallback.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const forceOpenAI =
    (process.env.EMBEDDING_PROVIDER ?? '').toLowerCase() === 'openai';

  // ── Path A: forced OpenAI ─────────────────────────────────────────────────
  if (forceOpenAI) {
    console.log('[Embeddings] Provider: OpenAI (forced via EMBEDDING_PROVIDER)');
    try {
      return await embedWithOpenAI(text);
    } catch (err) {
      console.error('[Embeddings] OpenAI embedding failed:', err);
      throw new Error('Failed to generate embedding via OpenAI');
    }
  }

  // ── Path B: HuggingFace with OpenAI fallback ──────────────────────────────
  try {
    const embedding = await embedWithHuggingFace(text);
    return embedding;
  } catch (hfError) {
    console.warn(
      '[Embeddings] ⚠️  HuggingFace failed — falling back to OpenAI.',
      '\n             Reason:',
      hfError instanceof Error ? hfError.message : hfError
    );

    try {
      const embedding = await embedWithOpenAI(text);
      console.log('[Embeddings] ✅ OpenAI fallback succeeded (text-embedding-3-small, 384-dim)');
      return embedding;
    } catch (oaiError) {
      console.error('[Embeddings] ❌ OpenAI fallback also failed:', oaiError);
      throw new Error(
        `Both embedding providers failed.\n` +
        `HuggingFace: ${hfError instanceof Error ? hfError.message : hfError}\n` +
        `OpenAI: ${oaiError instanceof Error ? oaiError.message : oaiError}`
      );
    }
  }
}
