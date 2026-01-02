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

The extension now uses **AI-powered semantic similarity** with text embeddings:

1. **Text Embeddings**: Uses Transformers.js with the `all-MiniLM-L6-v2` model to generate semantic embeddings for each tab
2. **Similarity Calculation**: Computes cosine similarity between tab embeddings (title + domain + content)
3. **Smart Clustering**: Groups tabs with similarity score ≥ 0.65 (configurable)
4. **Intelligent Naming**: Auto-generates group names based on categories, domains, or common keywords

**Model**: all-MiniLM-L6-v2 (23MB, quantized) - Fast, lightweight, and excellent for semantic text similarity

**Previous approach** (keyword-based): Now replaced with embeddings for much better semantic understanding

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
