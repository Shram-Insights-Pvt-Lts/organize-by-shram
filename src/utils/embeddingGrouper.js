// Embedding-based tab grouping using semantic similarity
import { getEmbeddingsBatch, cosineSimilarity, tabToText } from './embeddings.js';

/**
 * Group tabs using embedding-based semantic similarity
 * @param {Array} tabs - Array of tab objects
 * @param {number} similarityThreshold - Minimum similarity score (0-1) to group tabs
 * @returns {Promise<Object>} - { groups, ungrouped }
 */
export async function groupTabsByEmbeddings(tabs, similarityThreshold = 0.65) {
  if (tabs.length === 0) {
    return { groups: [], ungrouped: [] };
  }

  console.log(`Grouping ${tabs.length} tabs using embeddings...`);

  // Step 1: Generate embeddings for all tabs
  const tabTexts = tabs.map(tabToText);
  const embeddings = await getEmbeddingsBatch(tabTexts);

  console.log(`Generated ${embeddings.length} embeddings`);

  // Step 2: Calculate similarity matrix
  const similarityMatrix = calculateSimilarityMatrix(embeddings);

  // Step 3: Cluster tabs using similarity threshold
  const clusters = clusterBySimilarity(tabs, similarityMatrix, similarityThreshold);

  console.log(`Created ${clusters.length} clusters`);

  // Step 4: Format clusters as groups
  return formatClusters(clusters, tabs);
}

/**
 * Calculate pairwise similarity matrix
 * @param {number[][]} embeddings - Array of embedding vectors
 * @returns {number[][]} - Similarity matrix
 */
function calculateSimilarityMatrix(embeddings) {
  const n = embeddings.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        matrix[i][j] = similarity;
        matrix[j][i] = similarity;
      }
    }
  }

  return matrix;
}

/**
 * Cluster tabs using similarity threshold (simple greedy clustering)
 * @param {Array} tabs - Array of tab objects
 * @param {number[][]} similarityMatrix - Similarity matrix
 * @param {number} threshold - Similarity threshold
 * @returns {Array<Array<number>>} - Array of clusters (tab indices)
 */
function clusterBySimilarity(tabs, similarityMatrix, threshold) {
  const n = tabs.length;
  const assigned = new Set();
  const clusters = [];

  for (let i = 0; i < n; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    // Find all tabs similar to this one
    for (let j = i + 1; j < n; j++) {
      if (assigned.has(j)) continue;

      // Check if tab j is similar to any tab in current cluster
      let maxSimilarity = 0;
      for (const clusterIdx of cluster) {
        maxSimilarity = Math.max(maxSimilarity, similarityMatrix[clusterIdx][j]);
      }

      if (maxSimilarity >= threshold) {
        cluster.push(j);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Format clusters into groups with metadata
 * @param {Array<Array<number>>} clusters - Array of clusters (tab indices)
 * @param {Array} tabs - Array of tab objects
 * @returns {Object} - { groups, ungrouped }
 */
function formatClusters(clusters, tabs) {
  const CHROME_COLORS = [
    'grey', 'blue', 'red', 'yellow', 'green',
    'pink', 'purple', 'cyan', 'orange'
  ];

  const groups = [];
  const ungrouped = [];

  clusters.forEach((cluster, idx) => {
    if (cluster.length >= 2) {
      // Create a group
      const tabsInGroup = cluster.map(i => tabs[i]);

      groups.push({
        id: `group-${idx}`,
        name: generateGroupName(tabsInGroup),
        color: CHROME_COLORS[groups.length % CHROME_COLORS.length],
        tabs: tabsInGroup,
        tabIds: tabsInGroup.map(t => t.id)
      });
    } else {
      // Single tab goes to ungrouped
      ungrouped.push(tabs[cluster[0]]);
    }
  });

  return { groups, ungrouped };
}

/**
 * Generate a descriptive name for a group of tabs
 * @param {Array} tabs - Array of tab objects in the group
 * @returns {string} - Group name
 */
function generateGroupName(tabs) {
  if (tabs.length === 0) return 'Empty';

  // Try category-based naming first
  const categories = tabs.map(t => t.category).filter(Boolean);
  if (categories.length === tabs.length) {
    const uniqueCategories = [...new Set(categories)];
    if (uniqueCategories.length === 1) {
      return uniqueCategories[0];
    }
  }

  // Check for common domain
  const domains = tabs.map(t => t.domain).filter(Boolean);
  const domainCounts = {};
  domains.forEach(d => {
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });

  const mostCommonDomain = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommonDomain && mostCommonDomain[1] >= Math.ceil(tabs.length * 0.5)) {
    return formatDomainName(mostCommonDomain[0]);
  }

  // Fall back to keyword-based naming
  const allKeywords = tabs.flatMap(t => t.keywords || []);
  const keywordCounts = {};
  allKeywords.forEach(k => {
    keywordCounts[k] = (keywordCounts[k] || 0) + 1;
  });

  const topKeywords = Object.entries(keywordCounts)
    .filter(([k, count]) => count >= Math.ceil(tabs.length * 0.4))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  if (topKeywords.length > 0) {
    return formatGroupName(topKeywords.join(' '));
  }

  return 'Related Tabs';
}

/**
 * Format domain name for display
 * @param {string} domain - Domain name
 * @returns {string} - Formatted domain
 */
function formatDomainName(domain) {
  // Remove .com, .org, etc. and capitalize
  const parts = domain.split('.');
  const name = parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Format group name
 * @param {string} name - Raw name
 * @returns {string} - Formatted name
 */
function formatGroupName(name) {
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .substring(0, 25);
}
