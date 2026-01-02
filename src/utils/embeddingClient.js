// Client to communicate with embedding worker in background

/**
 * Generate embeddings using background worker
 */
export async function generateEmbeddings(texts) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'generateEmbeddings', texts },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.embeddings);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

/**
 * Calculate cosine similarity
 */
export function cosineSimilarity(a, b) {
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

/**
 * Group tabs using embeddings from background worker
 */
export async function groupTabsByEmbeddings(tabs, threshold = 0.65) {
  console.log('Grouping tabs using embeddings from worker...');

  // Create text representation
  const tabTexts = tabs.map(t =>
    `${t.title} ${t.domain} ${t.pageContent || ''}`.slice(0, 300)
  );

  // Get embeddings from worker
  const embeddings = await generateEmbeddings(tabTexts);

  // Calculate similarity and cluster
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
}

function formatClusters(clusters, tabs) {
  const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
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

  return { groups, ungrouped };
}

function generateGroupName(tabs) {
  if (tabs.length === 0) return 'Empty';

  // Use domain-based naming
  const domains = tabs.map(t => t.domain).filter(Boolean);
  if (domains.length > 0) {
    const domain = domains[0].split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  return 'Related Tabs';
}
