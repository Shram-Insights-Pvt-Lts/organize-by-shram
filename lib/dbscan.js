/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Implementation using Cosine Similarity for high-dimensional text embeddings
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity score
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine distance between two vectors
 * Distance = 1 - similarity (range: 0 to 2, where 0 means identical)
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine distance
 */
function cosineDistance(vecA, vecB) {
  return 1 - cosineSimilarity(vecA, vecB);
}

/**
 * DBSCAN clustering algorithm
 * @param {Object} embeddings - Map of {tabId: vector[]}
 * @param {number} epsilon - Maximum distance between two samples to be considered neighbors (default: 0.4 for cosine distance)
 * @param {number} minPoints - Minimum number of points to form a dense region (default: 2)
 * @returns {Object} - { clusters: Array<Array<tabId>>, noise: Array<tabId> }
 */
export function dbscan(embeddings, epsilon = 0.4, minPoints = 2) {
  const tabIds = Object.keys(embeddings);
  const visited = new Set();
  const clustered = new Set();
  const clusters = [];
  const noise = [];

  console.log(`[DBSCAN] Starting clustering with epsilon=${epsilon}, minPoints=${minPoints}`);
  console.log(`[DBSCAN] Processing ${tabIds.length} points`);

  /**
   * Find all neighbors of a point within epsilon distance
   * @param {string} tabId - The tab ID to find neighbors for
   * @returns {string[]} Array of neighbor tab IDs
   */
  function getNeighbors(tabId) {
    const neighbors = [];
    const vector = embeddings[tabId];

    for (const otherTabId of tabIds) {
      if (tabId === otherTabId) continue;

      const otherVector = embeddings[otherTabId];
      const distance = cosineDistance(vector, otherVector);

      if (distance <= epsilon) {
        neighbors.push(otherTabId);
      }
    }

    return neighbors;
  }

  /**
   * Expand a cluster from a seed point
   * @param {string} tabId - The seed point
   * @param {string[]} neighbors - Initial neighbors
   * @param {Array<string>} cluster - The cluster being built
   */
  function expandCluster(tabId, neighbors, cluster) {
    cluster.push(tabId);
    clustered.add(tabId);

    // Use a queue for breadth-first expansion
    const queue = [...neighbors];
    const processed = new Set([tabId]);

    while (queue.length > 0) {
      const currentTabId = queue.shift();

      if (processed.has(currentTabId)) {
        continue;
      }
      processed.add(currentTabId);

      if (!visited.has(currentTabId)) {
        visited.add(currentTabId);

        const currentNeighbors = getNeighbors(currentTabId);

        // If this point has enough neighbors, it's a core point
        if (currentNeighbors.length >= minPoints) {
          // Add new neighbors to the queue
          for (const neighbor of currentNeighbors) {
            if (!processed.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }

      // Add to cluster if not already clustered
      if (!clustered.has(currentTabId)) {
        cluster.push(currentTabId);
        clustered.add(currentTabId);
      }
    }
  }

  // Main DBSCAN loop
  for (const tabId of tabIds) {
    if (visited.has(tabId)) {
      continue;
    }

    visited.add(tabId);

    const neighbors = getNeighbors(tabId);

    if (neighbors.length < minPoints) {
      // Mark as potential noise (may be added to a cluster later)
      continue;
    }

    // Start a new cluster
    const cluster = [];
    expandCluster(tabId, neighbors, cluster);

    if (cluster.length > 0) {
      clusters.push(cluster);
      console.log(`[DBSCAN] Created cluster with ${cluster.length} points`);
    }
  }

  // Identify noise points (not assigned to any cluster)
  for (const tabId of tabIds) {
    if (!clustered.has(tabId)) {
      noise.push(tabId);
    }
  }

  console.log(`[DBSCAN] Clustering complete: ${clusters.length} clusters, ${noise.length} noise points`);

  return {
    clusters,
    noise
  };
}

/**
 * Auto-tune epsilon based on the k-distance graph
 * This is a helper function to find a good epsilon value
 * @param {Object} embeddings - Map of {tabId: vector[]}
 * @param {number} k - Number of neighbors to consider (default: 4)
 * @returns {number} Suggested epsilon value
 */
export function suggestEpsilon(embeddings, k = 4) {
  const tabIds = Object.keys(embeddings);
  const distances = [];

  for (const tabId of tabIds) {
    const vector = embeddings[tabId];
    const kDistances = [];

    for (const otherTabId of tabIds) {
      if (tabId === otherTabId) continue;
      const otherVector = embeddings[otherTabId];
      const distance = cosineDistance(vector, otherVector);
      kDistances.push(distance);
    }

    // Sort distances and get the k-th nearest neighbor distance
    kDistances.sort((a, b) => a - b);
    if (kDistances.length >= k) {
      distances.push(kDistances[k - 1]);
    }
  }

  // Sort k-distances
  distances.sort((a, b) => a - b);

  // Find the "elbow" point - we'll use the 80th percentile as a heuristic
  const elbowIndex = Math.floor(distances.length * 0.8);
  const suggestedEpsilon = distances[elbowIndex] || 0.4;

  console.log(`[DBSCAN] Suggested epsilon: ${suggestedEpsilon.toFixed(3)}`);

  return suggestedEpsilon;
}
