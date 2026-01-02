# Reflect

A minimalist Chrome extension that replaces your new tab page with a calm moment of reflection.

## What It Does

Every time you open a new tab, you'll see a simple, thoughtful prompt:

**"What are you avoiding right now?"**

This isn't another productivity tool with streaks, stats, or notifications. It's a lightweight pause button for your browser—designed to make you think, not track.

Built as a subtle marketing extension for [shram.ai](https://shram.ai).

## Features

- **New Tab Override**: Replaces Chrome's default new tab with a calm, minimalist page
- **Daily Prompt Rotation**: Different reflection questions each day
- **Smart Input**: Type your answer and press Enter
  - Automatically navigates to URLs (e.g., "github.com")
  - Searches using your browser's default search engine for queries
  - Saves all responses locally before navigating
- **Local Storage**: Your responses are stored locally in your browser
- **Offline-First**: Works completely offline, no internet required
- **Zero Analytics**: No tracking, no data collection, no backend
- **Instant Load**: Lightweight design loads in <100ms

## Daily Prompts

The extension rotates through thoughtful prompts:
- "What are you avoiding right now?"
- "What would make today successful?"
- "What's the smallest thing you could finish?"
- "What are you procrastinating on?"
- "What's one thing you've been putting off?"

## Development Setup

This project uses [Bun](https://bun.sh) as the package manager and build tool.

### Project Structure

```
organize-by-shram/
├── src/
│   ├── newtab.html     # New tab page
│   ├── newtab.css      # Minimal styling
│   ├── newtab.js       # Behavior & storage
│   ├── icons/          # Extension icons
│   └── manifest.json   # Extension manifest
├── dist/               # Build output (not committed)
├── build.ts            # Build script
└── package.json
```

### Available Commands

```bash
# Install dependencies
bun install

# Build the extension
bun run build

# Clean build artifacts
bun run clean

# Package extension as ZIP for Chrome Web Store
bun run package

# Watch mode (rebuild on changes)
bun run watch

# Build and open in Chrome (macOS)
bun run dev:chrome
```

### Loading the Extension Locally

1. Build the extension: `bun run build`
2. Open Chrome/Edge/Brave
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top-right)
5. Click "Load unpacked"
6. Select the `dist/` folder

The extension will now override your new tab page.

## Publishing to Chrome Web Store

1. Build and package: `bun run package`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create a new item
4. Upload `reflect-newtab.zip`
5. Fill in store listing details:
   - **Name**: Reflect
   - **Description**: A calm moment of reflection with every new tab
   - **Category**: Productivity
6. Submit for review

## Design Philosophy

This extension is intentionally:
- **Calm** — Soft gradients, spacious layout, no urgency
- **Minimal** — No features, no settings, no complexity
- **Uncomfortable (in a good way)** — The prompt makes you pause
- **Non-judgmental** — No streaks, no stats, no guilt
- **Offline** — Works without internet, no external dependencies

## Technical Details

- **Manifest V3** — Latest Chrome extension standard
- **Vanilla JavaScript** — No frameworks, no build complexity
- **Chrome Storage API** — Responses saved locally
- **Chrome Search API** — Uses browser's default search engine
- **Minimal Permissions** — Only requires `storage` and `search` permissions
- **Instant Load** — No external resources, everything bundled

## Browser Compatibility

- Chrome/Chromium (Manifest V3)
- Edge
- Brave

Requires Chrome 88+ for Manifest V3 support.

## Architecture

The extension consists of three simple files:

1. **newtab.html** — Minimal HTML structure with centered container
2. **newtab.css** — Gradient background, clean typography, subtle footer CTA
3. **newtab.js** — Daily prompt rotation, Enter key handling, chrome.storage.local integration

No background workers, no popup, no content scripts. Just a single page override.

## License

Private / Proprietary
