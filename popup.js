const organizeBtn = document.getElementById("organizeBtn");
const clearGroupsBtn = document.getElementById("clearGroupsBtn");
const statusArea = document.getElementById("statusArea");

// Track if this is a first run (model not yet cached)
let isFirstRun = false;
let initStartTime = null;
let statusUpdateInterval = null;

// Status message templates
const statusMessages = {
  initializing: "Loading AI model...",
  loading: "Reading your tabs...",
  processing: "Analyzing tabs...",
  clustering: "Finding patterns...",
  grouping: "Creating groups...",
  clearing: "Clearing groups...",
  complete: "Done!",
  error: "Oops! Something went wrong.",
};

/**
 * Update the status display
 */
function updateStatus(status, message, showSpinner = false) {
  const defaultMessage = statusMessages[status] || message;
  const displayMessage = message || defaultMessage;

  let html = "";

  if (showSpinner) {
    html += '<div class="spinner"></div>';
  }

  html += `<div class="status-text ${status}">${displayMessage}</div>`;

  statusArea.innerHTML = html;
}

/**
 * Handle organize button click
 */
async function handleOrganize() {
  try {
    // Disable button
    organizeBtn.disabled = true;
    organizeBtn.textContent = "Organizing Tabs...";

    // Show initial status
    updateStatus("initializing", null, true);

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      type: "ORGANIZE_TABS",
    });

    if (response && response.success) {
      updateStatus(
        "complete",
        `Successfully organized into ${response.groupsCreated} groups!`,
        false
      );

      // Show additional info if there were ungrouped tabs
      if (response.noiseCount > 0) {
        setTimeout(() => {
          updateStatus(
            "complete",
            `Created ${response.groupsCreated} groups. ${response.noiseCount} unique tabs left ungrouped.`,
            false
          );
        }, 1500);
      }
    } else {
      updateStatus("error", response?.error || "Failed to organize tabs");
    }
  } catch (error) {
    console.error("Error organizing tabs:", error);
    updateStatus("error", error.message || "An unexpected error occurred");
  } finally {
    // Re-enable button after a delay
    setTimeout(() => {
      organizeBtn.disabled = false;
      organizeBtn.textContent = "Organize Tabs";
    }, 2000);
  }
}

/**
 * Listen for status updates from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle model download progress
  if (message.type === "MODEL_DOWNLOAD_PROGRESS") {
    const downloadProgress = document.getElementById("downloadProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    if (downloadProgress && progressFill && progressText) {
      // Show the progress bar
      downloadProgress.classList.add("visible");

      // Update progress bar fill
      const percent = Math.min(100, Math.max(0, message.percent));
      progressFill.style.width = percent + "%";

      // Update text
      if (percent < 100) {
        progressText.textContent = `Downloading AI model... ${Math.round(
          percent
        )}%`;
      } else {
        progressText.textContent = "Model loaded! Analyzing tabs...";
      }
    }
    return;
  }

  if (message.type === "STATUS_UPDATE") {
    const { status, message: statusMessage } = message;

    // Hide download progress when we move past initializing
    if (status !== "initializing") {
      const downloadProgress = document.getElementById("downloadProgress");
      if (downloadProgress) {
        downloadProgress.classList.remove("visible");
      }
    }

    // Track initialization timing for first-run detection
    if (status === "initializing" && !initStartTime) {
      initStartTime = Date.now();
    }

    // Detect first run by checking if we're still in initializing after 5 seconds
    if (status === "initializing" && initStartTime) {
      const elapsed = (Date.now() - initStartTime) / 1000;
      if (elapsed > 5 && !isFirstRun) {
        isFirstRun = true;
      }
    }

    // Build enhanced message for first run
    let displayMessage = statusMessage;
    if (isFirstRun && status === "initializing") {
      const elapsed = Math.floor((Date.now() - initStartTime) / 1000);
      displayMessage = `Downloading AI model... (${elapsed}s)\nFirst run takes ~30-40 seconds. Subsequent runs will be instant!`;
    }

    // Show spinner for in-progress states
    const spinnerStates = [
      "initializing",
      "loading",
      "processing",
      "clustering",
      "grouping",
    ];
    const showSpinner = spinnerStates.includes(status);

    updateStatus(status, displayMessage, showSpinner);
  }
});

/**
 * Handle clear groups button click
 */
async function handleClearGroups() {
  try {
    // Disable button
    clearGroupsBtn.disabled = true;
    clearGroupsBtn.textContent = "Ungrouping...";

    // Show status
    updateStatus("clearing", "Removing all tab groups...", true);

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      type: "CLEAR_ALL_GROUPS",
    });

    if (response && response.success) {
      updateStatus(
        "complete",
        `Cleared ${response.groupsCleared} group(s)!`,
        false
      );
    } else {
      updateStatus("error", response?.error || "Failed to clear groups");
    }
  } catch (error) {
    console.error("Error clearing groups:", error);
    updateStatus("error", error.message || "An unexpected error occurred");
  } finally {
    // Re-enable button after a delay
    setTimeout(() => {
      clearGroupsBtn.disabled = false;
      clearGroupsBtn.textContent = "Ungroup";
    }, 1000);
  }
}

// Set up event listeners
organizeBtn.addEventListener("click", handleOrganize);
clearGroupsBtn.addEventListener("click", handleClearGroups);

// Initialize
console.log("[Popup] Organize popup loaded");
