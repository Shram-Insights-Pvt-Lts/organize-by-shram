const organizeBtn = document.getElementById('organizeBtn');
const clearGroupsBtn = document.getElementById('clearGroupsBtn');
const statusArea = document.getElementById('statusArea');

// Status message templates
const statusMessages = {
  initializing: 'Loading AI model...',
  loading: 'Reading your tabs...',
  processing: 'Analyzing tabs...',
  clustering: 'Finding patterns...',
  grouping: 'Creating groups...',
  clearing: 'Clearing groups...',
  complete: 'Done!',
  error: 'Oops! Something went wrong.'
};

/**
 * Update the status display
 */
function updateStatus(status, message, showSpinner = false) {
  const defaultMessage = statusMessages[status] || message;
  const displayMessage = message || defaultMessage;

  let html = '';

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
    organizeBtn.textContent = 'Organizing...';

    // Show initial status
    updateStatus('initializing', null, true);

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      type: 'ORGANIZE_TABS'
    });

    if (response && response.success) {
      updateStatus('complete',
        `Successfully organized into ${response.groupsCreated} groups!`,
        false
      );

      // Show additional info if there were ungrouped tabs
      if (response.noiseCount > 0) {
        setTimeout(() => {
          updateStatus('complete',
            `Created ${response.groupsCreated} groups. ${response.noiseCount} unique tabs left ungrouped.`,
            false
          );
        }, 1500);
      }
    } else {
      updateStatus('error', response?.error || 'Failed to organize tabs');
    }

  } catch (error) {
    console.error('Error organizing tabs:', error);
    updateStatus('error', error.message || 'An unexpected error occurred');
  } finally {
    // Re-enable button after a delay
    setTimeout(() => {
      organizeBtn.disabled = false;
      organizeBtn.textContent = 'Organize Now';
    }, 2000);
  }
}

/**
 * Listen for status updates from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATUS_UPDATE') {
    const { status, message: statusMessage } = message;

    // Show spinner for in-progress states
    const spinnerStates = ['initializing', 'loading', 'processing', 'clustering', 'grouping'];
    const showSpinner = spinnerStates.includes(status);

    updateStatus(status, statusMessage, showSpinner);
  }
});

/**
 * Handle clear groups button click
 */
async function handleClearGroups() {
  try {
    // Disable button
    clearGroupsBtn.disabled = true;
    clearGroupsBtn.textContent = 'Clearing...';

    // Show status
    updateStatus('clearing', 'Removing all tab groups...', true);

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_ALL_GROUPS'
    });

    if (response && response.success) {
      updateStatus('complete', `Cleared ${response.groupsCleared} group(s)!`, false);
    } else {
      updateStatus('error', response?.error || 'Failed to clear groups');
    }

  } catch (error) {
    console.error('Error clearing groups:', error);
    updateStatus('error', error.message || 'An unexpected error occurred');
  } finally {
    // Re-enable button after a delay
    setTimeout(() => {
      clearGroupsBtn.disabled = false;
      clearGroupsBtn.textContent = 'Clear All Groups';
    }, 1000);
  }
}

// Set up event listeners
organizeBtn.addEventListener('click', handleOrganize);
clearGroupsBtn.addEventListener('click', handleClearGroups);

// Initialize
console.log('[Popup] TabSmart popup loaded');
