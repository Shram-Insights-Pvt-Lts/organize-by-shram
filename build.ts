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

// Copy new tab page files
console.log("📄 Copying new tab page files...");
cpSync(join(SRC_DIR, "newtab.html"), join(DIST_DIR, "newtab.html"));
cpSync(join(SRC_DIR, "newtab.css"), join(DIST_DIR, "newtab.css"));
cpSync(join(SRC_DIR, "newtab.js"), join(DIST_DIR, "newtab.js"));

console.log("✅ Build completed successfully!");
console.log(`📦 Extension ready in ${DIST_DIR}/`);
