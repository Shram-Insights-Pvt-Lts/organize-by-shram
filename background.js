import { dbscan, suggestEpsilon } from './lib/dbscan.js';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Available colors for tab groups
const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

// Common stop words to exclude from group title generation
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
  'www', 'com', 'net', 'org', 'http', 'https', 'html', 'htm'
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
      justification: 'Run MediaPipe WASM model for local AI tab embeddings'
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
  // Collect all words from titles
  const wordCounts = new Map();

  for (const tab of tabs) {
    const title = tab.title || '';
    // Extract words (alphanumeric sequences)
    const words = title.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];

    for (const word of words) {
      // Skip stop words and very short words
      if (STOP_WORDS.has(word) || word.length < 3) {
        continue;
      }

      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Find the most common word
  let maxCount = 0;
  let bestWord = null;

  for (const [word, count] of wordCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
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

    // Step 4: Run DBSCAN clustering
    if (sendStatus) sendStatus({ status: 'clustering', message: 'Finding patterns...' });

    // Auto-suggest epsilon or use default
    const epsilon = embeddingCount > 10 ? suggestEpsilon(embeddings) : 0.4;
    const minPoints = 2;

    const { clusters, noise } = dbscan(embeddings, epsilon, minPoints);

    console.log(`[Background] Clustering result: ${clusters.length} clusters, ${noise.length} noise points`);

    // Step 5: Create tab groups
    if (sendStatus) sendStatus({ status: 'grouping', message: `Creating ${clusters.length} groups...` });

    let groupsCreated = 0;
    const usedColors = new Set();

    for (const cluster of clusters) {
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
          title: groupTitle,
          color: groupColor,
          collapsed: false
        });

        console.log(`[Background] Created group "${groupTitle}" with ${tabIds.length} tabs`);
        groupsCreated++;
      } catch (error) {
        console.error('[Background] Error creating group:', error);
      }
    }

    if (sendStatus) {
      sendStatus({
        status: 'complete',
        message: `Successfully organized into ${groupsCreated} groups!`,
        groupsCreated,
        noiseCount: noise.length
      });
    }

    return {
      success: true,
      groupsCreated,
      noiseCount: noise.length,
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

  return false;
});

// Listen for extension icon click (alternative trigger)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked, organizing tabs...');
  await organizeTabs();
});

console.log('[Background] TabSmart background script loaded');
