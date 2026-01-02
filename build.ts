#!/usr/bin/env bun

import { existsSync, rmSync, mkdirSync, cpSync } from "fs";
import { join } from "path";

const SRC_DIR = "src";
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
cpSync(join(SRC_DIR, "manifest.json"), join(DIST_DIR, "manifest.json"));

// Copy icons
console.log("🎨 Copying icons...");
cpSync(join(SRC_DIR, "icons"), join(DIST_DIR, "icons"), { recursive: true });

// Bundle popup.js with dependencies
console.log("📦 Bundling popup.js...");

// Use simple test file for debugging
const entrypoint = process.env.DEBUG
  ? join(SRC_DIR, "popup", "popup-simple.js")
  : join(SRC_DIR, "popup", "popup.js");

console.log("Using entrypoint:", entrypoint);

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir: DIST_DIR,
  target: "browser",
  format: "iife",
  minify: false,
  splitting: false,
  naming: "popup.js",
  external: [],
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

// Copy popup HTML and CSS
console.log("🎭 Copying popup HTML and CSS...");
cpSync(join(SRC_DIR, "popup", "popup.html"), join(DIST_DIR, "popup.html"));
cpSync(join(SRC_DIR, "popup", "popup.css"), join(DIST_DIR, "popup.css"));

// Copy background (simple, no bundling needed)
console.log("⚙️  Copying background service worker...");
cpSync(
  join(SRC_DIR, "background", "background.js"),
  join(DIST_DIR, "background.js")
);

console.log("✅ Build completed successfully!");
console.log(`📦 Extension ready in ${DIST_DIR}/`);
