// MediaPipe text embeddings for browser-friendly semantic similarity
import { TextEmbedder, FilesetResolver } from '@mediapipe/tasks-text';

let textEmbedder = null;

/**
 * Initialize MediaPipe text embedder
 */
export async function initMediaPipeEmbeddings() {
  if (textEmbedder) return textEmbedder;

  console.log('[MediaPipe] Loading text embedder...');

  try {
    // Initialize MediaPipe
    const textFiles = await FilesetResolver.forTextTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text/wasm'
    );

    // Create text embedder with Universal Sentence Encoder model
    textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite'
      }
    });

    console.log('[MediaPipe] Text embedder loaded successfully!');
    return textEmbedder;
  } catch (error) {
    console.error('[MediaPipe] Failed to load embedder:', error);
    throw error;
  }
}

/**
 * Generate embedding for text
 */
export async function getEmbedding(text) {
  if (!textEmbedder) {
    await initMediaPipeEmbeddings();
  }

  try {
    const result = textEmbedder.embed(text.slice(0, 500)); // Limit text length

    // MediaPipe returns embeddings in result.embeddings[0]
    if (result.embeddings && result.embeddings.length > 0) {
      return result.embeddings[0].floatEmbedding || result.embeddings[0].quantizedEmbedding;
    }

    throw new Error('No embeddings returned');
  } catch (error) {
    console.error('[MediaPipe] Embedding error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    console.warn('Invalid embeddings for similarity calculation');
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dotProduct / norm;
}

/**
 * Group tabs using MediaPipe embeddings
 */
export async function groupTabsByEmbeddings(tabs, threshold = 0.65) {
  console.log(`[MediaPipe] Grouping ${tabs.length} tabs...`);

  if (tabs.length === 0) {
    return { groups: [], ungrouped: [] };
  }

  try {
    // Initialize embedder
    await initMediaPipeEmbeddings();

    // Generate embeddings for all tabs
    const embeddings = [];
    for (const tab of tabs) {
      const text = `${tab.title} ${tab.domain} ${tab.pageContent || ''}`.slice(0, 500);
      const embedding = await getEmbedding(text);
      embeddings.push(embedding);
    }

    console.log(`[MediaPipe] Generated ${embeddings.length} embeddings`);

    // Cluster by similarity
    const n = tabs.length;
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < n; i++) {
      if (assigned.has(i)) continue;

      const cluster = [i];
      assigned.add(i);

      for (let j = i + 1; j < n; j++) {
        if (assigned.has(j)) continue;

        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);

        if (similarity >= threshold) {
          cluster.push(j);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    return formatClusters(clusters, tabs);
  } catch (error) {
    console.error('[MediaPipe] Grouping error:', error);
    throw error;
  }
}

function formatClusters(clusters, tabs) {
  const CHROME_COLORS = [
    'grey', 'blue', 'red', 'yellow', 'green',
    'pink', 'purple', 'cyan', 'orange'
  ];

  const groups = [];
  const ungrouped = [];

  clusters.forEach((cluster, idx) => {
    if (cluster.length >= 2) {
      const tabsInGroup = cluster.map(i => tabs[i]);
      groups.push({
        id: `group-${idx}`,
        name: generateGroupName(tabsInGroup),
        color: CHROME_COLORS[groups.length % CHROME_COLORS.length],
        tabs: tabsInGroup,
        tabIds: tabsInGroup.map(t => t.id)
      });
    } else {
      ungrouped.push(tabs[cluster[0]]);
    }
  });

  console.log(`[MediaPipe] Created ${groups.length} groups, ${ungrouped.length} ungrouped`);
  return { groups, ungrouped };
}

function generateGroupName(tabs) {
  if (tabs.length === 0) return 'Empty';

  // Try category first
  const categories = tabs.map(t => t.category).filter(Boolean);
  if (categories.length === tabs.length) {
    const uniqueCategories = [...new Set(categories)];
    if (uniqueCategories.length === 1) {
      return uniqueCategories[0];
    }
  }

  // Try domain
  const domains = tabs.map(t => t.domain).filter(Boolean);
  if (domains.length > 0) {
    const domainCounts = {};
    domains.forEach(d => domainCounts[d] = (domainCounts[d] || 0) + 1);

    const mostCommon = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommon && mostCommon[1] >= Math.ceil(tabs.length * 0.5)) {
      const name = mostCommon[0].split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Try keywords
  const allKeywords = tabs.flatMap(t => t.keywords || []);
  if (allKeywords.length > 0) {
    const keywordCounts = {};
    allKeywords.forEach(k => keywordCounts[k] = (keywordCounts[k] || 0) + 1);

    const topKeywords = Object.entries(keywordCounts)
      .filter(([k, count]) => count >= Math.ceil(tabs.length * 0.4))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);

    if (topKeywords.length > 0) {
      return topKeywords
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .substring(0, 25);
    }
  }

  return 'Related Tabs';
}
