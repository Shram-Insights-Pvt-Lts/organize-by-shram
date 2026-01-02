// Embedding-based similarity for tab grouping
import { pipeline, env } from '@xenova/transformers';

// Configure to use local models (better for extension)
env.allowLocalModels = true;
env.allowRemoteModels = true;

let embeddingPipeline = null;

/**
 * Initialize the embedding model
 * Uses a lightweight model optimized for semantic similarity
 */
export async function initEmbeddings() {
  if (embeddingPipeline) return embeddingPipeline;

  try {
    console.log('Loading embedding model...');
    // Using all-MiniLM-L6-v2: Fast, small (23MB), good for semantic similarity
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true } // Use quantized version for smaller size
    );
    console.log('Embedding model loaded successfully');
    return embeddingPipeline;
  } catch (error) {
    console.error('Failed to load embedding model:', error);
    throw error;
  }
}

/**
 * Generate embeddings for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function getEmbedding(text) {
  if (!embeddingPipeline) {
    await initEmbeddings();
  }

  const result = await embeddingPipeline(text, {
    pooling: 'mean',
    normalize: true
  });

  // Convert to regular array
  return Array.from(result.data);
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function getEmbeddingsBatch(texts) {
  if (!embeddingPipeline) {
    await initEmbeddings();
  }

  const embeddings = [];

  // Process in smaller batches to avoid memory issues
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => getEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {number[]} a - First embedding vector
 * @param {number[]} b - Second embedding vector
 * @returns {number} - Similarity score (0-1)
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Create a text representation of a tab for embedding
 * @param {Object} tab - Tab object
 * @returns {string} - Text representation
 */
export function tabToText(tab) {
  // Combine title, domain, and content for richer representation
  const parts = [];

  if (tab.title) parts.push(tab.title);
  if (tab.domain) parts.push(tab.domain);
  if (tab.pageContent) parts.push(tab.pageContent.slice(0, 200)); // Limit content

  return parts.join(' ');
}
