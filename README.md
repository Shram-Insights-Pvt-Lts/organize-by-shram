# Smart Tab Grouper

Intelligently group your browser tabs using ML-based clustering.

## Development Setup

This project uses [Bun](https://bun.sh) as the package manager and build tool.

### Project Structure

```
organize-by-shram/
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── background/
│   │   └── background.js
│   ├── icons/
│   └── manifest.json
├── dist/              # Build output (not committed)
├── build.ts           # Build script
└── package.json
```

### Available Commands

```bash
# Install dependencies
~/.bun/bin/bun install

# Build the extension
~/.bun/bin/bun run build

# Clean build artifacts
~/.bun/bin/bun run clean

# Package extension as ZIP
~/.bun/bin/bun run package

# Watch mode (rebuild on changes)
~/.bun/bin/bun run watch
```

### Loading the Extension

1. Build the extension: `~/.bun/bin/bun run build`
2. Open Chrome/Edge/Brave
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the `dist/` folder

### How It Works

The extension uses a multi-stage clustering algorithm:

1. **Category-based grouping**: Groups tabs by detected category (Development, Social, Shopping, etc.)
2. **Subdomain-based grouping**: Groups tabs from the same subdomain
3. **Keyword similarity**: Groups tabs with 3+ common keywords or 40%+ keyword overlap

### Features

- Smart tab categorization using 14 categories
- Keyword extraction from titles and page content
- Drag-and-drop tab reorganization
- Custom group naming and colors
- Multi-window support
- Persistent grouping patterns

## Browser Compatibility

- Chrome/Chromium (Manifest V3)
- Edge
- Brave

Requires Tab Groups API support.
