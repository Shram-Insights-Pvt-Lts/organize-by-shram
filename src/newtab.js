// Array of daily prompts
const PROMPTS = [
  "What are you avoiding right now?",
  "What would make today successful?",
  "What's the smallest thing you could finish?",
  "What are you procrastinating on?",
  "What's one thing you've been putting off?"
];

// Get the prompt for today based on the current date
function getTodaysPrompt() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const promptIndex = dayOfYear % PROMPTS.length;
  return PROMPTS[promptIndex];
}

// Initialize the page
function init() {
  const promptElement = document.getElementById('prompt');
  const input = document.getElementById('reflectionInput');

  // Set today's prompt
  promptElement.textContent = getTodaysPrompt();

  // Focus the input field
  input.focus();

  // Handle Enter key
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      const response = input.value.trim();

      // Save to storage
      await saveResponse(response);

      // Navigate to URL or search
      navigateOrSearch(response);
    }
  });
}

// Check if input is a URL
function isURL(text) {
  // Check for explicit protocol
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return true;
  }

  // Check for common domain patterns (e.g., "google.com", "example.org")
  const domainPattern = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;
  return domainPattern.test(text);
}

// Navigate to URL or search using default search engine
function navigateOrSearch(text) {
  if (isURL(text)) {
    // Add protocol if missing
    const url = text.startsWith('http') ? text : `https://${text}`;
    window.location.href = url;
  } else {
    // Use Chrome's search API with user's default search engine
    if (chrome.search && chrome.search.query) {
      chrome.search.query({
        text: text,
        disposition: 'CURRENT_TAB'
      });
    } else {
      // Fallback to Google search if API not available
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    }
  }
}

// Save response to chrome.storage.local
async function saveResponse(text) {
  try {
    const timestamp = Date.now();
    const entry = { text, timestamp };

    // Get existing responses
    const result = await chrome.storage.local.get(['responses']);
    const responses = result.responses || [];

    // Add new response
    responses.push(entry);

    // Save back to storage
    await chrome.storage.local.set({ responses });
  } catch (error) {
    console.error('Error saving response:', error);
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
