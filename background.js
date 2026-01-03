import { dbscan, suggestEpsilon } from './lib/dbscan.js';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Available colors for tab groups
const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

// Common stop words to exclude from group title generation
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
  'www', 'com', 'net', 'org', 'http', 'https', 'html', 'htm',
  // Common browser/search terms that aren't meaningful for grouping
  'google', 'search', 'chrome', 'browser', 'tab', 'new', 'page', 'home',
  'web', 'site', 'online', 'free', 'best', 'top', 'how', 'what', 'why',
  'brave', 'firefox', 'safari', 'edge', 'extensions'
]);

/**
 * Check if an offscreen document is already open
 */
async function hasOffscreenDocument() {
  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
  }
  return false;
}

/**
 * Create or reuse the offscreen document
 */
async function setupOffscreenDocument() {
  const hasDocument = await hasOffscreenDocument();

  if (!hasDocument) {
    console.log('[Background] Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['DOM_SCRAPING'], // Use DOM_SCRAPING as the reason for WASM processing
      justification: 'Run WebLLM model for local AI tab embeddings'
    });
    console.log('[Background] Offscreen document created');

    // Give it a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Pre-initialize the model
    try {
      const response = await sendMessageToOffscreen({
        type: 'INITIALIZE_MODEL'
      });
      console.log('[Background] Model initialization:', response);
    } catch (error) {
      console.warn('[Background] Model pre-initialization failed:', error);
    }
  } else {
    console.log('[Background] Offscreen document already exists');
  }
}

/**
 * Send message to offscreen document and wait for response
 */
function sendMessageToOffscreen(message) {
  return new Promise((resolve, reject) => {
    // Set a timeout for the operation
    const timeout = setTimeout(() => {
      reject(new Error('Offscreen document response timeout'));
    }, 30000); // 30 second timeout for model loading

    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Send tabs to offscreen document for embedding generation
 */
async function getEmbeddings(tabs) {
  console.log(`[Background] Requesting embeddings for ${tabs.length} tabs`);

  try {
    const response = await sendMessageToOffscreen({
      type: 'GENERATE_EMBEDDINGS',
      tabs: tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url
      }))
    });

    if (response && response.success) {
      console.log('[Background] Embeddings received successfully');
      return response.embeddings;
    } else {
      throw new Error(response?.error || 'Failed to generate embeddings');
    }
  } catch (error) {
    console.error('[Background] Error getting embeddings:', error);
    throw error;
  }
}

/**
 * Extract keywords from tab titles and generate a group name
 */
function generateGroupTitle(tabs) {
  // First, try to find a common domain
  const domainCounts = new Map();
  
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      let domain = url.hostname.replace('www.', '');
      // Get the main domain name (e.g., 'github' from 'github.com')
      const parts = domain.split('.');
      if (parts.length >= 2) {
        domain = parts[parts.length - 2]; // Get second-to-last part
      }
      if (domain.length >= 3 && !STOP_WORDS.has(domain.toLowerCase())) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }
  
  // If majority share a domain, use it as the group name
  for (const [domain, count] of domainCounts.entries()) {
    if (count >= Math.ceil(tabs.length * 0.5)) {
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  // Fall back to analyzing titles
  const wordCounts = new Map();
  const wordTabs = new Map(); // Track which tabs contain each word for diversity scoring

  for (const tab of tabs) {
    const title = tab.title || '';
    // Extract words (alphanumeric sequences)
    const words = title.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    const seenWords = new Set();

    for (const word of words) {
      // Skip stop words and very short words
      if (STOP_WORDS.has(word) || word.length < 3) {
        continue;
      }

      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      
      // Track unique tabs containing this word
      if (!seenWords.has(word)) {
        seenWords.add(word);
        if (!wordTabs.has(word)) {
          wordTabs.set(word, new Set());
        }
        wordTabs.get(word).add(tab.id);
      }
    }
  }

  // Score words: prefer words that appear in multiple tabs but aren't too generic
  let bestScore = 0;
  let bestWord = null;

  for (const [word, count] of wordCounts.entries()) {
    const tabSpread = wordTabs.get(word)?.size || 0;
    // Score = number of tabs containing the word * sqrt(word length)
    // This balances spread across tabs with word specificity
    const score = tabSpread * Math.sqrt(word.length);
    
    if (score > bestScore) {
      bestScore = score;
      bestWord = word;
    }
  }

  // Capitalize first letter
  if (bestWord) {
    return bestWord.charAt(0).toUpperCase() + bestWord.slice(1);
  }

  return `Group ${Date.now() % 1000}`;
}


/**
 * Get a random color that hasn't been used recently
 */
function getRandomColor(usedColors = new Set()) {
  const availableColors = GROUP_COLORS.filter(color => !usedColors.has(color));

  if (availableColors.length === 0) {
    // All colors used, pick any random one
    return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
  }

  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

/**
 * Main function to organize tabs
 */
async function organizeTabs(sendStatus = null) {
  try {
    // Step 1: Setup offscreen document
    if (sendStatus) sendStatus({ status: 'initializing', message: 'Initializing AI model...' });
    await setupOffscreenDocument();

    // Step 2: Query all tabs in current window
    if (sendStatus) sendStatus({ status: 'loading', message: 'Loading tabs...' });
    const tabs = await chrome.tabs.query({ currentWindow: true });

    console.log(`[Background] Found ${tabs.length} tabs to organize`);
    console.log('[Background] ========== TAB DETAILS ==========');
    tabs.forEach((tab, index) => {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        console.log(`[Background] Tab ${index + 1}: "${tab.title}" | Domain: ${domain}`);
      } catch (e) {
        console.log(`[Background] Tab ${index + 1}: "${tab.title}" | Domain: [invalid URL]`);
      }
    });
    console.log('[Background] =====================================');

    if (tabs.length < 2) {
      if (sendStatus) sendStatus({ status: 'error', message: 'Need at least 2 tabs to organize' });
      return { success: false, error: 'Not enough tabs to organize' };
    }

    // Step 3: Get embeddings
    if (sendStatus) sendStatus({ status: 'processing', message: `Analyzing ${tabs.length} tabs...` });
    const embeddings = await getEmbeddings(tabs);

    const embeddingCount = Object.keys(embeddings).length;
    console.log(`[Background] Received ${embeddingCount} embeddings`);

    if (embeddingCount < 2) {
      if (sendStatus) sendStatus({ status: 'error', message: 'Not enough valid tabs to organize' });
      return { success: false, error: 'Not enough valid tabs' };
    }

    // ==================== NEW DOMAIN-FIRST APPROACH ====================
    // Step 4: Group by domain FIRST (most reliable signal)
    if (sendStatus) sendStatus({ status: 'clustering', message: 'Grouping by domain...' });

    const domainGroups = new Map();
    const tabIdToDomain = new Map();

    for (const tab of tabs) {
      if (!embeddings[tab.id]) continue; // Skip tabs without embeddings

      try {
        const url = new URL(tab.url);
        let domain = url.hostname.replace('www.', '');

        // Extract main domain (e.g., 'github' from 'github.com')
        const parts = domain.split('.');
        if (parts.length >= 2) {
          domain = parts[parts.length - 2];
        }

        // Skip generic/local domains
        if (domain === 'extensions' || domain === 'localhost' || domain.length < 3) {
          continue;
        }

        tabIdToDomain.set(tab.id.toString(), domain);

        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab.id.toString());
      } catch (e) {
        // Skip invalid URLs
      }
    }

    // Create domain clusters (2+ tabs from same domain)
    const domainClusters = [];
    const domainGroupedTabIds = new Set();

    for (const [domain, tabIds] of domainGroups.entries()) {
      if (tabIds.length >= 2) {
        domainClusters.push({ domain, tabIds });
        tabIds.forEach(id => domainGroupedTabIds.add(id));
        console.log(`[Background] Domain cluster: ${domain} with ${tabIds.length} tabs`);
      }
    }

    console.log(`[Background] Domain grouping: ${domainClusters.length} domain groups, ${domainGroupedTabIds.size} tabs grouped`);

    // Step 5: Semantic clustering for REMAINING ungrouped tabs only
    if (sendStatus) sendStatus({ status: 'clustering', message: 'Finding semantic patterns...' });

    // Filter embeddings to only ungrouped tabs
    const remainingEmbeddings = {};
    for (const [tabId, embedding] of Object.entries(embeddings)) {
      if (!domainGroupedTabIds.has(tabId)) {
        remainingEmbeddings[tabId] = embedding;
      }
    }

    const remainingCount = Object.keys(remainingEmbeddings).length;
    console.log(`[Background] Running semantic clustering on ${remainingCount} remaining tabs`);

    let semanticClusters = [];
    if (remainingCount >= 2) {
      // Use tight epsilon for semantic clustering - we only want truly similar content
      const suggestedEps = remainingCount > 5 ? suggestEpsilon(remainingEmbeddings) : 0.3;
      const epsilon = Math.min(suggestedEps, 0.35); // Cap at 0.35 for strict similarity
      const minPoints = 2;

      console.log(`[Background] Semantic clustering parameters: epsilon=${epsilon.toFixed(3)}, minPoints=${minPoints}`);

      const { clusters, noise } = dbscan(remainingEmbeddings, epsilon, minPoints);
      semanticClusters = clusters;

      console.log(`[Background] Semantic clustering result: ${clusters.length} clusters, ${noise.length} noise points`);
    }

    console.log(`[Background] Final result: ${domainClusters.length} domain clusters, ${semanticClusters.length} semantic clusters`);


    // Step 6: Create tab groups
    const totalGroups = domainClusters.length + semanticClusters.length;
    if (sendStatus) sendStatus({ status: 'grouping', message: `Creating ${totalGroups} groups...` });

    let groupsCreated = 0;
    const usedColors = new Set();

    // Create domain clusters FIRST (most reliable grouping)
    for (const { domain, tabIds: clusterTabIds } of domainClusters) {
      try {
        const tabIds = clusterTabIds.map(id => parseInt(id, 10));
        const groupId = await chrome.tabs.group({ tabIds });
        const groupTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
        const groupColor = getRandomColor(usedColors);
        usedColors.add(groupColor);

        await chrome.tabGroups.update(groupId, {
          title: groupTitle,
          color: groupColor,
          collapsed: false
        });

        console.log(`[Background] Created domain group "${groupTitle}" with ${tabIds.length} tabs`);
        groupsCreated++;
      } catch (error) {
        console.error('[Background] Error creating domain group:', error);
      }
    }

    // Then create semantic clusters
    for (const cluster of semanticClusters) {
      if (cluster.length < 2) {
        console.log('[Background] Skipping cluster with less than 2 tabs');
        continue;
      }

      try {
        // Convert tab IDs to integers
        const tabIds = cluster.map(id => parseInt(id, 10));

        // Get tab objects for title generation
        const clusterTabs = tabs.filter(tab => tabIds.includes(tab.id));

        // Group the tabs
        const groupId = await chrome.tabs.group({ tabIds });

        // Generate a meaningful title
        const groupTitle = generateGroupTitle(clusterTabs);

        // Pick a color
        const groupColor = getRandomColor(usedColors);
        usedColors.add(groupColor);

        // Update the group
        await chrome.tabGroups.update(groupId, {
          title: `${groupTitle} (s)`,
          color: groupColor,
          collapsed: false
        });

        console.log(`[Background] Created semantic group "${groupTitle}" with ${tabIds.length} tabs`);
        groupsCreated++;
      } catch (error) {
        console.error('[Background] Error creating semantic group:', error);
      }
    }

    // Calculate ungrouped tabs
    const groupedTabIds = new Set();
    domainClusters.forEach(c => c.tabIds.forEach(id => groupedTabIds.add(id)));
    semanticClusters.forEach(c => c.forEach(id => groupedTabIds.add(id)));

    // Find tabs that weren't grouped
    const ungroupedTabIds = Object.keys(embeddings).filter(id => !groupedTabIds.has(id));
    const remainingUngrouped = ungroupedTabIds.length;

    // Create "Ungrouped" group for remaining tabs (at rightmost position since created last)
    if (ungroupedTabIds.length > 0) {
      try {
        const tabIds = ungroupedTabIds.map(id => parseInt(id, 10));
        const groupId = await chrome.tabs.group({ tabIds });

        await chrome.tabGroups.update(groupId, {
          title: 'Ungrouped',
          color: 'grey',
          collapsed: true
        });

        console.log(`[Background] Created Ungrouped group with ${tabIds.length} tabs`);
        groupsCreated++;
      } catch (error) {
        console.error('[Background] Error creating Ungrouped group:', error);
      }
    }

    if (sendStatus) {
      const domainCount = domainClusters.length;
      const semanticCount = semanticClusters.length;
      let message = `Created ${groupsCreated} groups`;
      if (domainCount > 0 && semanticCount > 0) {
        message += ` (${domainCount} domain, ${semanticCount} semantic)`;
      }
      if (remainingUngrouped > 0) {
        message += `, ${remainingUngrouped} tabs ungrouped`;
      }

      sendStatus({
        status: 'complete',
        message: message,
        groupsCreated,
        noiseCount: remainingUngrouped
      });
    }

    return {
      success: true,
      groupsCreated,
      domainGroups: domainClusters.length,
      semanticGroups: semanticClusters.length,
      noiseCount: remainingUngrouped,
      totalTabs: tabs.length
    };

  } catch (error) {
    console.error('[Background] Error organizing tabs:', error);
    if (sendStatus) {
      sendStatus({ status: 'error', message: `Error: ${error.message}` });
    }
    return { success: false, error: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ORGANIZE_TABS') {
    // Create a status callback that sends messages back to popup
    const sendStatus = (status) => {
      chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', ...status }).catch(() => {
        // Popup might be closed, ignore error
      });
    };

    organizeTabs(sendStatus)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  }

  if (message.type === 'CLEAR_ALL_GROUPS') {
    (async () => {
      try {
        // Get all tabs in current window
        const tabs = await chrome.tabs.query({ currentWindow: true });
        
        // Get all grouped tab IDs
        const groupedTabIds = tabs
          .filter(tab => tab.groupId !== -1)
          .map(tab => tab.id);
        
        if (groupedTabIds.length === 0) {
          sendResponse({ success: true, groupsCleared: 0 });
          return;
        }

        // Get unique group IDs for counting
        const groupIds = new Set(tabs.filter(tab => tab.groupId !== -1).map(tab => tab.groupId));
        
        // Ungroup all tabs
        await chrome.tabs.ungroup(groupedTabIds);
        
        console.log(`[Background] Cleared ${groupIds.size} groups, ungrouped ${groupedTabIds.length} tabs`);
        sendResponse({ success: true, groupsCleared: groupIds.size });
      } catch (error) {
        console.error('[Background] Error clearing groups:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    // Return true to indicate async response
    return true;
  }

  return false;
});

// Listen for extension icon click (alternative trigger)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked, organizing tabs...');
  await organizeTabs();
});

console.log('[Background] Organize background script loaded');
