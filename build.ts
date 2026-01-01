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

// Copy popup files
console.log("🎭 Copying popup files...");
cpSync(join(SRC_DIR, "popup", "popup.html"), join(DIST_DIR, "popup.html"));
cpSync(join(SRC_DIR, "popup", "popup.js"), join(DIST_DIR, "popup.js"));
cpSync(join(SRC_DIR, "popup", "popup.css"), join(DIST_DIR, "popup.css"));

// Copy background
console.log("⚙️  Copying background service worker...");
cpSync(
  join(SRC_DIR, "background", "background.js"),
  join(DIST_DIR, "background.js")
);

console.log("✅ Build completed successfully!");
console.log(`📦 Extension ready in ${DIST_DIR}/`);
