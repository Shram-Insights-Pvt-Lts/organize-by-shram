// Enhanced keyword-based grouping (no dependencies, fast, reliable)

/**
 * Calculate TF-IDF based similarity between two tabs
 */
export function calculateSimilarity(tab1, tab2) {
  // Multiple signals for better grouping
  let score = 0;

  // 1. Same domain (strong signal)
  if (tab1.domain && tab1.domain === tab2.domain) {
    score += 0.4;
  }

  // 2. Same subdomain (very strong signal)
  if (tab1.subdomain && tab1.subdomain === tab2.subdomain && tab1.domain === tab2.domain) {
    score += 0.3;
  }

  // 3. Same category (strong signal)
  if (tab1.category && tab1.category === tab2.category) {
    score += 0.25;
  }

  // 4. Keyword overlap (semantic similarity)
  const keywords1 = new Set(tab1.keywords || []);
  const keywords2 = new Set(tab2.keywords || []);

  if (keywords1.size > 0 && keywords2.size > 0) {
    const intersection = [...keywords1].filter(k => keywords2.has(k));
    const union = new Set([...keywords1, ...keywords2]);
    const jaccardSimilarity = intersection.length / union.size;
    score += jaccardSimilarity * 0.3;
  }

  // 5. Title similarity (word overlap)
  const titleWords1 = new Set((tab1.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const titleWords2 = new Set((tab2.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (titleWords1.size > 0 && titleWords2.size > 0) {
    const titleIntersection = [...titleWords1].filter(w => titleWords2.has(w));
    const titleSimilarity = titleIntersection.length / Math.max(titleWords1.size, titleWords2.size);
    score += titleSimilarity * 0.2;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Group tabs using enhanced similarity
 */
export function groupTabs(tabs, threshold = 0.5) {
  if (tabs.length === 0) {
    return { groups: [], ungrouped: [] };
  }

  console.log(`Grouping ${tabs.length} tabs with threshold ${threshold}...`);

  const n = tabs.length;
  const clusters = [];
  const assigned = new Set();

  // Greedy clustering
  for (let i = 0; i < n; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    for (let j = i + 1; j < n; j++) {
      if (assigned.has(j)) continue;

      // Check similarity with all tabs in current cluster
      let maxSimilarity = 0;
      for (const clusterIdx of cluster) {
        const similarity = calculateSimilarity(tabs[clusterIdx], tabs[j]);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      if (maxSimilarity >= threshold) {
        cluster.push(j);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return formatClusters(clusters, tabs);
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

  console.log(`Created ${groups.length} groups, ${ungrouped.length} ungrouped`);
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

  // Try common domain
  const domains = tabs.map(t => t.domain).filter(Boolean);
  const domainCounts = {};
  domains.forEach(d => domainCounts[d] = (domainCounts[d] || 0) + 1);

  const mostCommon = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (mostCommon && mostCommon[1] >= Math.ceil(tabs.length * 0.5)) {
    const name = mostCommon[0].split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Try common keywords
  const allKeywords = tabs.flatMap(t => t.keywords || []);
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

  return 'Related Tabs';
}
