#!/usr/bin/env node

/**
 * Generate simple PNG icons for the Chrome Extension
 * Creates colored square PNG files without external dependencies
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = 'icons';
const SIZES = [16, 32, 48, 128];

// Create icons directory if it doesn't exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  console.log(`✓ Created ${ICONS_DIR} directory`);
}

// Simple PNG generator using canvas (if available) or fallback to data URL
// For a quick fix, we'll use a minimal PNG format

function createMinimalPNG(size) {
  // This creates a minimal valid PNG file with a gradient-ish purple color
  // It's a simple solid color square that's valid PNG format

  const width = size;
  const height = size;

  // PNG file structure (very simplified - solid purple square)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature

  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Chunk length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(2, 17); // Color type (RGB)
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace

  // Calculate CRC for IHDR
  const crc = require('zlib').crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(crc, 21);

  // For simplicity, create a small purple pixel data
  // We'll use a library-free approach with zlib
  const zlib = require('zlib');

  const pixelData = Buffer.alloc(height * (1 + width * 3));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    pixelData[pos++] = 0; // Filter type for this scanline
    for (let x = 0; x < width; x++) {
      // Purple gradient color (RGB)
      const r = Math.floor(102 + (118 - 102) * (x / width));
      const g = Math.floor(126 + (75 - 126) * (y / height));
      const b = Math.floor(234 + (162 - 234) * (x / width));

      pixelData[pos++] = r;
      pixelData[pos++] = g;
      pixelData[pos++] = b;
    }
  }

  const compressed = zlib.deflateSync(pixelData);

  // IDAT chunk (image data)
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = zlib.crc32(idat.slice(4, 8 + compressed.length));
  idat.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND chunk (image end)
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

console.log('🎨 Generating PNG icon files...\n');

try {
  for (const size of SIZES) {
    const png = createMinimalPNG(size);
    const filename = path.join(ICONS_DIR, `icon${size}.png`);
    fs.writeFileSync(filename, png);
    console.log(`✓ Created ${filename} (${size}x${size})`);
  }

  console.log('\n✅ All icons generated successfully!');
  console.log('📦 You can now load the extension in Chrome');
} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  process.exit(1);
}
