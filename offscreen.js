import * as webllm from "@mlc-ai/web-llm";

let engine = null;
let isInitializing = false;
let initializationPromise = null;

// Embedding model - supports batch processing for efficiency
const EMBEDDING_MODEL = "snowflake-arctic-embed-m-q0f32-MLC-b4";

// Initialize the WebLLM Engine for embeddings
async function initializeEmbedder() {
  if (engine) {
    return engine;
  }

  if (isInitializing) {
    return initializationPromise;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log("[Offscreen] Initializing WebLLM Engine...");

      engine = await webllm.CreateMLCEngine(EMBEDDING_MODEL, {
        initProgressCallback: (progress) => {
          console.log("[Offscreen] Model loading:", progress.text);

          // Parse progress percentage from text (e.g., "Loading model... 45%")
          let percent = 0;
          const match = progress.text.match(/(\d+(?:\.\d+)?)%/);
          if (match) {
            percent = parseFloat(match[1]);
          } else if (progress.progress !== undefined) {
            percent = Math.round(progress.progress * 100);
          }

          // Send progress to popup
          chrome.runtime
            .sendMessage({
              type: "MODEL_DOWNLOAD_PROGRESS",
              percent: percent,
              text: progress.text,
            })
            .catch(() => {
              // Popup might be closed, ignore error
            });
        },
        logLevel: "INFO",
      });

      console.log("[Offscreen] WebLLM Engine initialized successfully");
      return engine;
    } catch (error) {
      console.error("[Offscreen] Failed to initialize WebLLM Engine:", error);
      isInitializing = false;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Generate embeddings for a list of tabs
async function generateEmbeddings(tabs) {
  try {
    const embedder = await initializeEmbedder();
    const embeddings = {};

    console.log(`[Offscreen] Generating embeddings for ${tabs.length} tabs`);

    // Prepare all texts for batch processing
    const tabTexts = [];
    const validTabs = [];

    for (const tab of tabs) {
      const text = `${tab.title || ""} ${tab.url || ""}`.trim();
      if (text) {
        tabTexts.push(text);
        validTabs.push(tab);
      } else {
        console.warn(`[Offscreen] Skipping tab ${tab.id} - no title or URL`);
      }
    }

    if (tabTexts.length === 0) {
      return embeddings;
    }

    // Generate embeddings in batch (model supports up to batch size 4)
    const batchSize = 4;
    for (let i = 0; i < tabTexts.length; i += batchSize) {
      const batchTexts = tabTexts.slice(i, i + batchSize);
      const batchTabs = validTabs.slice(i, i + batchSize);

      try {
        const result = await embedder.embeddings.create({
          input: batchTexts,
        });

        // Map results back to tab IDs
        for (let j = 0; j < result.data.length; j++) {
          const tab = batchTabs[j];
          const embedding = result.data[j].embedding;
          embeddings[tab.id] = embedding;
          console.log(
            `[Offscreen] Generated embedding for tab ${tab.id}: ${batchTexts[
              j
            ].substring(0, 50)}...`
          );
        }
      } catch (error) {
        console.error(
          `[Offscreen] Error generating embeddings for batch starting at ${i}:`,
          error
        );
        // Continue with other batches even if one fails
      }
    }

    console.log(
      `[Offscreen] Successfully generated ${
        Object.keys(embeddings).length
      } embeddings`
    );
    return embeddings;
  } catch (error) {
    console.error("[Offscreen] Error in generateEmbeddings:", error);
    throw error;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);

  if (message.type === "GENERATE_EMBEDDINGS") {
    // Handle async operation
    generateEmbeddings(message.tabs)
      .then((embeddings) => {
        sendResponse({ success: true, embeddings });
      })
      .catch((error) => {
        console.error("[Offscreen] Error processing request:", error);
        sendResponse({
          success: false,
          error: error.message || "Failed to generate embeddings",
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  if (message.type === "INITIALIZE_MODEL") {
    // Pre-initialize the model
    initializeEmbedder()
      .then(() => {
        sendResponse({ success: true, initialized: true });
      })
      .catch((error) => {
        console.error("[Offscreen] Error initializing model:", error);
        sendResponse({
          success: false,
          error: error.message || "Failed to initialize model",
        });
      });

    return true;
  }

  // Respond to ping - used by background script to check if offscreen is ready
  if (message.type === "PING") {
    sendResponse({ success: true, ready: true });
    return false;
  }

  return false;
});

console.log("[Offscreen] Offscreen document loaded and ready");

// Signal to background that we're ready (in case it's already listening)
chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }).catch(() => {
  // Background might not be listening yet, that's okay
});
