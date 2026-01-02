# TabSmart - AI-Powered Tab Organizer

> **Automatically organize open browser tabs into logical groups using local, privacy-first AI embeddings**

TabSmart is a Chrome Extension (Manifest V3) that uses Google's MediaPipe Text Embedder (Universal Sentence Encoder) to intelligently cluster your tabs into meaningful groups. All processing happens **100% locally** in your browser - no data is ever sent to external servers.

## Features

- **Local AI Processing**: Uses MediaPipe WASM models running entirely in your browser
- **Privacy-First**: Zero external API calls - your browsing data never leaves your device
- **Smart Clustering**: DBSCAN algorithm with cosine similarity for intelligent grouping
- **Automatic Naming**: Generates meaningful group titles based on tab content
- **Arc Browser Compatible**: Tab groups work seamlessly as Folders in Arc browser
- **Zero Configuration**: Just click and organize!

## Architecture

### Core Components

1. **manifest.json**: Manifest V3 configuration with required permissions (`tabs`, `tabGroups`, `offscreen`)

2. **offscreen.js** (The Brain):
   - Hosts MediaPipe Text Embedder WASM model
   - Generates vector embeddings for tab titles/URLs
   - Runs in offscreen document to avoid Service Worker limitations

3. **background.js** (The Orchestrator):
   - Manages offscreen document lifecycle
   - Coordinates tab querying and grouping
   - Implements DBSCAN clustering
   - Generates group titles and assigns colors

4. **lib/dbscan.js** (The Algorithm):
   - Pure JavaScript DBSCAN implementation
   - Cosine similarity distance metric for text embeddings
   - Auto-tuning capabilities for epsilon parameter

5. **popup.html/js** (The Interface):
   - Simple "Organize Now" button
   - Real-time status updates during processing

## How It Works

```
User clicks "Organize"
    ↓
Background creates/reuses offscreen document
    ↓
Query all tabs in current window
    ↓
Send tabs to offscreen → Generate embeddings (MediaPipe)
    ↓
Run DBSCAN clustering on embeddings
    ↓
Create tab groups + Generate titles + Assign colors
    ↓
Done!
```

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

1. Click the TabSmart extension icon in your toolbar
2. Click "Organize Now"
3. Watch as your tabs are intelligently grouped!

## Configuration

### Tuning DBSCAN Parameters

Edit `background.js` to adjust clustering behavior:

```javascript
// Default values
const epsilon = 0.4;  // Similarity threshold (0-2, lower = stricter)
const minPoints = 2;  // Minimum tabs to form a group
```

- **epsilon**: Controls how similar tabs must be to group together
  - Lower values (0.2-0.3): More, smaller groups
  - Higher values (0.5-0.6): Fewer, larger groups
  - Default: 0.4 or auto-calculated

- **minPoints**: Minimum number of tabs required to form a cluster
  - Default: 2 (any 2 similar tabs can form a group)

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

- **Background Script**: Open `chrome://extensions/`, find TabSmart, click "service worker"
- **Offscreen Document**: Check background script console for offscreen logs
- **Popup**: Right-click extension icon → Inspect popup

Enable verbose logging by checking browser console in each context.

## Technical Details

### Why Offscreen Document?

Service Workers in Manifest V3 have strict limitations:
- No DOM access
- Unreliable for long-running operations
- Cannot load WASM modules reliably

The offscreen API provides a hidden document that can run WASM models like MediaPipe while remaining invisible to the user.

### Why DBSCAN?

Unlike K-Means (which requires pre-specifying cluster count), DBSCAN:
- Automatically determines the number of groups
- Handles noise (tabs that don't fit any cluster)
- Works well with varying cluster sizes
- Uses density-based grouping (semantic similarity)

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
- **No External APIs**: MediaPipe models loaded from CDN but processing is local
- **Open Source**: Fully auditable code

## Performance

- **Model Load Time**: ~2-3 seconds (first run only, cached thereafter)
- **Processing Time**: ~100-500ms for 50 tabs
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
- Try adjusting epsilon value (increase for more grouping)

### Model fails to load
- Check internet connection (needed to download MediaPipe model from CDN on first run)
- Clear browser cache and reload extension
- Check offscreen document console for WASM errors

## License

MIT License

## Credits

- **MediaPipe**: Google's ML framework for on-device processing
- **Universal Sentence Encoder**: Semantic text embeddings model
- **DBSCAN**: Density-based clustering algorithm

---

Made with privacy in mind for tab enthusiasts
