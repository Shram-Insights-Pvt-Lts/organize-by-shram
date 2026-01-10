# Organize by Shram - AI-Powered Tab Organizer

> **Automatically organize open browser tabs into logical groups using local, privacy-first AI embeddings**

Organize by Shram is a Chrome Extension (Manifest V3) that uses a hybrid approach combining domain-based grouping and WebLLM's Snowflake Arctic Embed model to intelligently cluster your tabs into meaningful groups. All processing happens **100% locally** in your browser - no data is ever sent to external servers.

## Features

- **Hybrid Clustering**: Two-stage approach combining domain grouping + semantic AI clustering
- **Domain-First Grouping**: Instantly groups tabs from the same website (e.g., all GitHub tabs together)
- **Local AI Processing**: Uses WebLLM models running entirely in your browser
- **Privacy-First**: Zero external API calls - your browsing data never leaves your device
- **Smart Semantic Clustering**: DBSCAN algorithm with cosine similarity for remaining tabs
- **Automatic Naming**: Generates meaningful group titles based on tab content and domains
- **Quick Ungroup**: One-click button to remove all tab groups
- **Modern UI**: Clean, minimal interface with dark mode support
- **Arc Browser Compatible**: Tab groups work seamlessly as Folders in Arc browser
- **Zero Configuration**: Just click and organize!

## Architecture

### Core Components

1. **manifest.json**: Manifest V3 configuration with required permissions (`tabs`, `tabGroups`, `offscreen`)

2. **offscreen.js** (The Brain):
   - Hosts WebLLM AI model (snowflake-arctic-embed)
   - Generates vector embeddings for tab titles/URLs
   - Runs in offscreen document to avoid Service Worker limitations

3. **background.js** (The Orchestrator):
   - Manages offscreen document lifecycle
   - Coordinates tab querying and grouping
   - Implements hybrid clustering: domain-first, then semantic DBSCAN
   - Generates group titles and assigns colors
   - Handles tab ungrouping functionality

4. **lib/dbscan.js** (The Algorithm):
   - Pure JavaScript DBSCAN implementation
   - Cosine similarity distance metric for text embeddings
   - Auto-tuning capabilities for epsilon parameter

5. **popup.html/js** (The Interface):
   - "Organize Tabs" button with real-time status updates
   - "Ungroup" button to quickly remove all tab groups
   - Modern, minimal UI with dark mode support
   - Privacy-focused design with local processing indicators
   - Powered by Shram design language

## How It Works

### Hybrid Two-Stage Clustering Approach

```
User clicks "Organize Tabs"
    ↓
Background creates/reuses offscreen document
    ↓
Query all tabs in current window
    ↓
Send tabs to offscreen → Generate embeddings (WebLLM)
    ↓
STAGE 1: Domain-Based Grouping
├─ Group tabs from same domain (2+ tabs)
├─ Extract domain names (e.g., "github", "stackoverflow")
└─ Create domain groups (most reliable signal)
    ↓
STAGE 2: Semantic Clustering (for remaining tabs)
├─ Filter out already-grouped tabs
├─ Run DBSCAN clustering on embeddings (tight epsilon=0.3-0.35)
└─ Create semantic groups for truly similar content
    ↓
Create "Ungrouped" group for outliers (collapsed)
    ↓
Generate titles + Assign colors + Update UI
    ↓
Done!
```

### Why Domain-First?

Domain grouping provides the most reliable signal for tab organization:
- **Accuracy**: Tabs from the same site are almost always related
- **Speed**: No AI processing needed for domain extraction
- **User Intent**: Users often want GitHub tabs grouped together, regardless of semantic similarity

Semantic clustering then handles the remaining tabs that don't share domains but may be topically related (e.g., different documentation sites about the same topic).

## Installation & Setup

### Prerequisites

- [Bun](https://bun.sh) (or Node.js/npm)
- Google Chrome or Arc Browser (or any Chromium-based browser)

### Step 1: Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### Step 2: Generate Icons (Optional)

The extension needs icon files to work properly. You can either:

**Option A: Generate SVG placeholders**
```bash
bun run generate-icons.ts
```

Then convert the SVG files to PNG using an online tool like [CloudConvert](https://cloudconvert.com/svg-to-png).

**Option B: Create your own icons**
Place PNG icon files in the `icons/` directory:
- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

**Option C: Skip icons temporarily**
Comment out the `icons` and `action.default_icon` sections in `manifest.json` for development.

### Step 3: Build the Extension

```bash
# Build for production
bun run build

# Or build and watch for changes
bun run dev
```

This will create a `dist/` folder with the bundled extension.

### Step 4: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `dist/` folder from this project

### Step 5: Use the Extension

1. Click the Organize by Shram extension icon in your toolbar
2. Click **"Organize Tabs"** to create groups
3. Watch as your tabs are intelligently grouped (domain groups first, then semantic groups)!
4. Use **"Ungroup"** to quickly remove all tab groups at once

The extension features a clean, modern UI with:
- Real-time status updates during organization
- Privacy indicators showing local processing
- Dark mode support matching your system preferences
- Quick access to both organize and ungroup functions

## Configuration

### Tuning Clustering Parameters

The extension uses a hybrid approach with different parameters for each stage:

#### Domain Grouping (Stage 1)
Edit `background.js` around line 296:

```javascript
// Domain grouping - groups 2+ tabs from same domain
if (tabIds.length >= 2) {
  // Create domain group
}
```

- No tuning needed - automatically groups tabs from the same domain
- Minimum 2 tabs required to form a domain group

#### Semantic Clustering (Stage 2)
Edit `background.js` around line 323:

```javascript
// Semantic clustering - only for ungrouped tabs
const suggestedEps = remainingCount > 5 ? suggestEpsilon(remainingEmbeddings) : 0.3;
const epsilon = Math.min(suggestedEps, 0.35); // Cap at 0.35 for strict similarity
const minPoints = 2;
```

- **epsilon**: Semantic similarity threshold (capped at 0.35 for strict grouping)
  - Lower values (0.25-0.30): Very strict semantic similarity required
  - Higher values (0.35-0.45): More lenient semantic grouping
  - Default: Auto-calculated or 0.3, capped at 0.35

- **minPoints**: Minimum tabs required to form a semantic cluster
  - Default: 2 (any 2 semantically similar tabs can form a group)

### Customizing Group Colors

Edit the `GROUP_COLORS` array in `background.js`:

```javascript
const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
```

## Development

### Project Structure

```
organize-by-shram/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker orchestration
├── offscreen.html         # Offscreen document host
├── offscreen.js           # MediaPipe integration
├── popup.html             # Extension popup UI
├── popup.js               # Popup interaction logic
├── lib/
│   └── dbscan.js         # DBSCAN clustering algorithm
├── icons/                 # Extension icons (16, 32, 48, 128)
├── build.ts               # Build script
├── package.json           # Dependencies
└── README.md             # This file
```

### Build Scripts

```bash
# Clean build
bun run clean && bun run build

# Package for distribution
bun run package  # Creates tabsmart.zip

# Development mode (auto-reload)
bun run dev:chrome
```

### Debugging

- **Background Script**: Open `chrome://extensions/`, find Organize by Shram, click "service worker"
- **Offscreen Document**: Check background script console for offscreen logs
- **Popup**: Right-click extension icon → Inspect popup

Enable verbose logging by checking browser console in each context. Look for:
- `[Background] Domain grouping: X domain groups, Y tabs grouped`
- `[Background] Semantic clustering result: X clusters, Y noise points`
- `[Background] Final result: X domain clusters, Y semantic clusters`

## Technical Details

### Why Offscreen Document?

Service Workers in Manifest V3 have strict limitations:
- No DOM access
- Unreliable for long-running operations
- Cannot load WASM modules reliably

The offscreen API provides a hidden document that can run WASM models like WebLLM while remaining invisible to the user.

### Why Hybrid Domain + Semantic Clustering?

**Domain-First Approach:**
- Most reliable signal: tabs from the same site are usually related
- Fast: no AI processing needed
- User-friendly: predictable grouping (all GitHub tabs together)

**Semantic Clustering (DBSCAN) for Remaining Tabs:**
Unlike K-Means (which requires pre-specifying cluster count), DBSCAN:
- Automatically determines the number of groups
- Handles noise (tabs that don't fit any cluster → "Ungrouped" group)
- Works well with varying cluster sizes
- Uses density-based grouping (semantic similarity)
- Only processes ungrouped tabs (more efficient)

### Why Cosine Similarity?

For text embeddings:
- Focuses on direction (semantic meaning) not magnitude
- Range: -1 to 1 (we use distance: 1 - similarity)
- More effective than Euclidean distance for high-dimensional vectors
- Standard metric for sentence embeddings

## Browser Compatibility

### Tested On:
- ✅ Google Chrome (v120+)
- ✅ Arc Browser
- ✅ Microsoft Edge (Chromium)
- ✅ Brave Browser

### Requirements:
- Manifest V3 support
- `chrome.offscreen` API
- `chrome.tabGroups` API
- WebAssembly support

## Privacy & Security

- **No Network Requests**: All processing is local (except initial model download from CDN)
- **No Data Collection**: No analytics, tracking, or telemetry
- **No External APIs**: WebLLM models loaded from MLC-AI CDN but all processing is local
- **Privacy by Design**: UI clearly indicates that data never leaves your device
- **Open Source**: Fully auditable code

**Your data stays on your device.** The extension includes privacy indicators in the UI to remind you that all processing happens locally in your browser.

## Performance

- **Model Load Time**: ~2-3 seconds (first run only, cached thereafter)
- **Domain Grouping**: Instant (no AI processing)
- **Semantic Processing Time**: ~100-500ms for remaining ungrouped tabs
- **Total Processing Time**: ~200-800ms for 50 tabs (depending on distribution)
- **Memory Usage**: ~50-100MB while active (offscreen document)
- **Battery Impact**: Minimal (only runs on demand)

## Troubleshooting

### Extension won't load
- Ensure all icon files exist or remove icon references from manifest.json
- Check build output for errors: `bun run build`

### "Offscreen document failed to create"
- Chrome version may not support offscreen API
- Update Chrome to latest version (v109+)

### Tabs aren't grouping
- Check background script console for errors
- Verify you have at least 2 tabs open
- Domain groups require 2+ tabs from the same domain
- Semantic groups require similar content (tight epsilon=0.35)
- Try adjusting epsilon value in background.js (increase cap for more semantic grouping)
- Check if tabs are ending up in "Ungrouped" group (normal for outliers)

### Model fails to load
- Check internet connection (needed to download WebLLM model from MLC-AI CDN on first run)
- Clear browser cache and reload extension
- Check offscreen document console for WASM errors
- The model is ~140MB and may take a few seconds to download on first use

## License

MIT License

## Credits

- **WebLLM**: MLC-AI's framework for running LLMs in the browser
- **Snowflake Arctic Embed**: Semantic text embeddings model
- **DBSCAN**: Density-based clustering algorithm
- **Design**: Shram design system

## FAQ

### How does domain grouping work?
The extension extracts the main domain from each tab's URL (e.g., "github" from "github.com") and groups tabs that share the same domain. This happens before AI clustering and provides the most reliable grouping signal.

### What's the "(s)" suffix on some group names?
Groups with "(s)" suffix are semantic clusters created by AI analysis, while groups without the suffix are domain-based groups.

### Why are some tabs in "Ungrouped"?
Tabs that don't share a domain with 2+ other tabs AND don't have strong semantic similarity to other ungrouped tabs are placed in the "Ungrouped" group (collapsed by default). This prevents forcing unrelated tabs into groups.

### Can I adjust grouping strictness?
Yes! Edit the `epsilon` cap in `background.js` line 324. Lower values (0.25-0.30) create stricter semantic groups, higher values (0.40-0.50) create more lenient groups. Domain grouping is always enabled.

---

## Links

- **Website**: [shram.ai](https://www.shram.ai)
- **Privacy Policy**: [PRIVACY.md](PRIVACY.md)
- **Report Issues**: [GitHub Issues](https://github.com/Shram-Insights-Pvt-Lts/organize-by-shram/issues)

---

Made with ❤️ by Team Shram • Privacy-First Tab Organization
