// Background worker for embeddings - has fewer restrictions than popup
import { pipeline } from '@xenova/transformers';

let embeddingPipeline = null;

// Initialize embedding model
async function initEmbeddings() {
  if (embeddingPipeline) return embeddingPipeline;

  console.log('[Worker] Loading embedding model...');
  embeddingPipeline = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { quantized: true }
  );
  console.log('[Worker] Model loaded!');
  return embeddingPipeline;
}

// Generate embedding for a single text
async function getEmbedding(text) {
  if (!embeddingPipeline) await initEmbeddings();

  const result = await embeddingPipeline(text, {
    pooling: 'mean',
    normalize: true
  });

  return Array.from(result.data);
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dotProduct / norm;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateEmbeddings') {
    console.log('[Worker] Generating embeddings for', request.texts.length, 'tabs');

    // Process embeddings
    (async () => {
      try {
        await initEmbeddings();

        const embeddings = [];
        for (const text of request.texts) {
          const embedding = await getEmbedding(text);
          embeddings.push(embedding);
        }

        console.log('[Worker] Generated', embeddings.length, 'embeddings');
        sendResponse({ success: true, embeddings });
      } catch (error) {
        console.error('[Worker] Error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep channel open for async response
  }

  if (request.action === 'calculateSimilarity') {
    const similarity = cosineSimilarity(request.embedding1, request.embedding2);
    sendResponse({ similarity });
    return false;
  }
});

console.log('[Worker] Embedding worker ready');
