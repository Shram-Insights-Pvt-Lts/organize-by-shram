// Use Chrome's built-in AI for embeddings (requires Chrome 127+)

let aiSession = null;

/**
 * Initialize Chrome AI session
 */
export async function initChromeAI() {
  if (!('ai' in self)) {
    throw new Error('Chrome AI not available. Use Chrome Canary with flags enabled.');
  }

  if (aiSession) return aiSession;

  const capabilities = await self.ai.languageModel.capabilities();

  if (capabilities.available === 'no') {
    throw new Error('Chrome AI not available on this device');
  }

  if (capabilities.available === 'after-download') {
    console.log('Downloading AI model...');
  }

  aiSession = await self.ai.languageModel.create({
    systemPrompt: 'You are a helpful assistant that analyzes text similarity.'
  });

  return aiSession;
}

/**
 * Calculate similarity between two texts using Chrome AI
 */
export async function calculateSimilarity(text1, text2) {
  const session = await initChromeAI();

  const prompt = `On a scale of 0.0 to 1.0, how semantically similar are these two texts? Respond with only a number.

Text 1: ${text1.slice(0, 200)}
Text 2: ${text2.slice(0, 200)}

Similarity score:`;

  const response = await session.prompt(prompt);
  const score = parseFloat(response.trim());

  return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
}

/**
 * Group tabs using Chrome AI similarity
 */
export async function groupTabsWithChromeAI(tabs, threshold = 0.65) {
  console.log('Using Chrome Built-in AI for grouping...');

  const tabTexts = tabs.map(t => `${t.title} ${t.domain} ${t.pageContent || ''}`.slice(0, 300));

  // Calculate similarity matrix
  const n = tabs.length;
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < n; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    for (let j = i + 1; j < n; j++) {
      if (assigned.has(j)) continue;

      const similarity = await calculateSimilarity(tabTexts[i], tabTexts[j]);
      console.log(`Similarity between tab ${i} and ${j}: ${similarity}`);

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

  // Use first tab's domain as name
  const domain = tabs[0].domain;
  if (domain) {
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return 'Related Tabs';
}
