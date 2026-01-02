#!/usr/bin/env bun

/**
 * Generate placeholder icons for the Chrome Extension
 * Creates SVG icons and converts them to PNG using canvas
 */

import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const ICONS_DIR = "icons";
const SIZES = [16, 32, 48, 128];

// Create icons directory if it doesn't exist
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

// Generate SVG icon
function generateIconSVG(size: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>

  <!-- Tab icon (three stacked rectangles representing tabs) -->
  <g transform="translate(24, 32)">
    <!-- Front tab -->
    <rect x="24" y="32" width="56" height="44" rx="4" fill="white" opacity="1"/>

    <!-- Middle tab -->
    <rect x="16" y="24" width="56" height="44" rx="4" fill="white" opacity="0.7"/>

    <!-- Back tab -->
    <rect x="8" y="16" width="56" height="44" rx="4" fill="white" opacity="0.4"/>
  </g>

  <!-- AI brain icon (simplified neural network) -->
  <g transform="translate(84, 84)">
    <circle cx="0" cy="0" r="8" fill="#fbbf24"/>
    <circle cx="-8" cy="8" r="4" fill="#fbbf24" opacity="0.8"/>
    <circle cx="8" cy="8" r="4" fill="#fbbf24" opacity="0.8"/>
    <circle cx="0" cy="12" r="4" fill="#fbbf24" opacity="0.8"/>
  </g>
</svg>`;
}

// Write SVG files
console.log("🎨 Generating icon files...");

for (const size of SIZES) {
  const svg = generateIconSVG(size);
  const filename = join(ICONS_DIR, `icon${size}.svg`);

  await Bun.write(filename, svg);
  console.log(`✓ Created ${filename}`);
}

// Also create a generic SVG that can be used
await Bun.write(join(ICONS_DIR, "icon.svg"), generateIconSVG(128));

console.log("\n✅ Icons generated successfully!");
console.log("📝 Note: SVG icons created. For production, consider converting to PNG.");
console.log("   You can use an online tool like https://cloudconvert.com/svg-to-png");
