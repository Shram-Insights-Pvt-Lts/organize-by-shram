#!/usr/bin/env bun

import { existsSync, rmSync, mkdirSync, cpSync } from "fs";
import { join } from "path";

const DIST_DIR = "dist";

// Clean dist directory
if (existsSync(DIST_DIR)) {
  console.log("🧹 Cleaning dist directory...");
  rmSync(DIST_DIR, { recursive: true });
}

// Create dist directory
mkdirSync(DIST_DIR, { recursive: true });
console.log("📁 Created dist directory");

// Copy manifest.json
console.log("📋 Copying manifest.json...");
cpSync("manifest.json", join(DIST_DIR, "manifest.json"));

// Copy icons from src/icons
console.log("🎨 Copying icons...");
if (existsSync("src/icons")) {
  cpSync("src/icons", join(DIST_DIR, "icons"), { recursive: true });
} else {
  console.log("⚠️  Icons directory not found, skipping...");
}

// Create models directory (WebLLM handles model downloading automatically)
console.log("📥 Setting up models directory...");
const modelDir = join(DIST_DIR, "models");
mkdirSync(modelDir, { recursive: true });


// Bundle background.js with lib/dbscan.js
console.log("📦 Bundling background.js...");
const backgroundResult = await Bun.build({
  entrypoints: ["background.js"],
  outdir: DIST_DIR,
  target: "browser",
  format: "esm",
  minify: false,
  splitting: false,
  naming: "background.js",
  external: [],
});

if (!backgroundResult.success) {
  console.error("Background build failed:", backgroundResult.logs);
  process.exit(1);
}

// Bundle offscreen.js with MediaPipe dependencies
console.log("📦 Bundling offscreen.js...");
const offscreenResult = await Bun.build({
  entrypoints: ["offscreen.js"],
  outdir: DIST_DIR,
  target: "browser",
  format: "esm",
  minify: false,
  splitting: false,
  naming: "offscreen.js",
  external: [],
});

if (!offscreenResult.success) {
  console.error("Offscreen build failed:", offscreenResult.logs);
  process.exit(1);
}

// Copy offscreen.html
console.log("📄 Copying offscreen.html...");
cpSync("offscreen.html", join(DIST_DIR, "offscreen.html"));

// Copy popup.html
console.log("🎭 Copying popup.html...");
cpSync("popup.html", join(DIST_DIR, "popup.html"));

// Copy popup.js (no bundling needed, it's vanilla JS)
console.log("📋 Copying popup.js...");
cpSync("popup.js", join(DIST_DIR, "popup.js"));

console.log("✅ Build completed successfully!");
console.log(`📦 Extension ready in ${DIST_DIR}/`);
console.log("\n📌 Next steps:");
console.log("  1. Open Chrome and go to chrome://extensions/");
console.log("  2. Enable 'Developer mode' (top right)");
console.log("  3. Click 'Load unpacked' and select the 'dist' folder");
