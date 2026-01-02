import { FilesetResolver, TextEmbedder } from '@mediapipe/tasks-text';

let textEmbedder = null;
let isInitializing = false;
let initializationPromise = null;

// Initialize the MediaPipe Text Embedder
async function initializeEmbedder() {
  if (textEmbedder) {
    return textEmbedder;
  }

  if (isInitializing) {
    return initializationPromise;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log('[Offscreen] Initializing MediaPipe Text Embedder...');

      // Use local WASM files bundled with the extension
      const wasmPath = chrome.runtime.getURL('wasm');
      console.log('[Offscreen] WASM path:', wasmPath);

      // Create the FilesetResolver with local WASM files
      const textFiles = await FilesetResolver.forTextTasks(wasmPath);

      // Create the TextEmbedder with Universal Sentence Encoder model from Google Storage
      // Note: The model is loaded from Google's storage as it's too large to bundle
      textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite'
        },
        quantize: false
      });

      console.log('[Offscreen] Text Embedder initialized successfully');
      return textEmbedder;
    } catch (error) {
      console.error('[Offscreen] Failed to initialize Text Embedder:', error);
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

    for (const tab of tabs) {
      try {
        // Create a meaningful text representation combining title and URL
        const text = `${tab.title || ''} ${tab.url || ''}`.trim();

        if (!text) {
          console.warn(`[Offscreen] Skipping tab ${tab.id} - no title or URL`);
          continue;
        }

        // Generate embedding
        const result = embedder.embed(text);

        if (result && result.embeddings && result.embeddings.length > 0) {
          // Extract the floating-point vector
          const embedding = result.embeddings[0];
          const vector = embedding.floatEmbedding || embedding.quantizedEmbedding;

          if (vector) {
            embeddings[tab.id] = Array.from(vector);
            console.log(`[Offscreen] Generated embedding for tab ${tab.id}: ${text.substring(0, 50)}...`);
          } else {
            console.warn(`[Offscreen] No vector in embedding result for tab ${tab.id}`);
          }
        } else {
          console.warn(`[Offscreen] Invalid embedding result for tab ${tab.id}`);
        }
      } catch (error) {
        console.error(`[Offscreen] Error generating embedding for tab ${tab.id}:`, error);
        // Continue with other tabs even if one fails
      }
    }

    console.log(`[Offscreen] Successfully generated ${Object.keys(embeddings).length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error('[Offscreen] Error in generateEmbeddings:', error);
    throw error;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', message.type);

  if (message.type === 'GENERATE_EMBEDDINGS') {
    // Handle async operation
    generateEmbeddings(message.tabs)
      .then(embeddings => {
        sendResponse({ success: true, embeddings });
      })
      .catch(error => {
        console.error('[Offscreen] Error processing request:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to generate embeddings'
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  if (message.type === 'INITIALIZE_MODEL') {
    // Pre-initialize the model
    initializeEmbedder()
      .then(() => {
        sendResponse({ success: true, initialized: true });
      })
      .catch(error => {
        console.error('[Offscreen] Error initializing model:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to initialize model'
        });
      });

    return true;
  }

  return false;
});

console.log('[Offscreen] Offscreen document loaded and ready');
