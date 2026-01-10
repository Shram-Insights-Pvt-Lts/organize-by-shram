# Privacy Policy for Organize by Shram

**Effective Date:** January 10, 2026
**Last Updated:** January 10, 2026

## Overview

Organize by Shram is a privacy-first Chrome extension that automatically organizes browser tabs into logical groups using local AI. This privacy policy explains how the extension works and what data it accesses.

## Our Privacy Commitment

**We do not collect, store, or transmit any of your personal data or browsing information.** All tab organization and AI processing happens entirely within your browser. Your privacy is our top priority.

## Data Processing

### What Data the Extension Accesses

The extension accesses the following information locally in your browser:
- **Tab Titles**: The titles of your open browser tabs
- **Tab URLs**: The web addresses of your open tabs
- **Tab Group Information**: Whether tabs are grouped and their group properties

### How This Data is Used

This information is processed **entirely locally** in your browser to:
1. Generate AI-powered semantic embeddings using WebAssembly models
2. Cluster similar tabs together using domain matching and semantic similarity
3. Create organized tab groups with meaningful names and colors
4. Allow you to clear tab groups when needed

### Data Storage

- **No Remote Storage**: No data is ever sent to external servers or stored in the cloud
- **No Persistent Storage**: Tab information is only processed in memory during organization
- **Local Model Caching**: AI models are downloaded once from the MLC-AI CDN and cached locally by your browser for performance

## Permissions Explanation

The extension requires the following Chrome permissions to function:

### 1. `tabs` Permission
- **Purpose**: Read tab titles, URLs, and window information
- **Usage**: Required to analyze which tabs should be grouped together
- **Privacy**: Only reads metadata; does not access page content, cookies, or browsing history

### 2. `tabGroups` Permission
- **Purpose**: Create and manage browser tab groups
- **Usage**: Organizes tabs into groups and assigns names/colors
- **Privacy**: Only modifies tab group settings; does not access tab content

### 3. `offscreen` Permission
- **Purpose**: Run WebAssembly AI models in a background context
- **Usage**: Chrome service workers cannot execute WASM, so we use an offscreen document to host the local AI model
- **Privacy**: Processes data entirely locally; no network communication

### 4. `host_permissions` (`<all_urls>`)
- **Purpose**: Read tab metadata across all websites
- **Usage**: Required to access tab titles and URLs regardless of which sites you visit
- **Privacy**: Only reads tab properties; never accesses page content or injects scripts

## Third-Party Services

### AI Model Distribution
- **Service**: MLC-AI model hosting via Hugging Face CDN
- **URL**: https://huggingface.co/mlc-ai/
- **Purpose**: One-time download of the AI embedding model (snowflake-arctic-embed)
- **Data Transmitted**: None. Only the model files are downloaded to your browser
- **Frequency**: First use only (subsequent uses load from browser cache)

The extension uses the WebLLM library by MLC-AI to run the "snowflake-arctic-embed-m-q0f32-MLC" model entirely in your browser. This model is approximately 140MB and is cached locally after the first download.

## What We Don't Do

We explicitly **DO NOT**:
- ❌ Collect or store your browsing history
- ❌ Track which websites you visit
- ❌ Send your tab data to any server
- ❌ Use analytics or telemetry
- ❌ Share data with third parties
- ❌ Display advertisements
- ❌ Require user accounts or authentication
- ❌ Access page content, forms, or passwords
- ❌ Inject scripts into web pages

## Technical Architecture

The extension uses a **privacy-by-design architecture**:

1. **Local AI Processing**: All machine learning happens in your browser using WebAssembly
2. **No Backend Servers**: The extension has no backend infrastructure to send data to
3. **Manifest V3 Compliant**: Built using Chrome's latest security-focused extension platform
4. **Open Source**: Code is publicly available for audit at https://github.com/Shram-Insights-Pvt-Lts/organize-by-shram

## Data Security

Since no data leaves your device:
- Your tab information is only accessible to your browser
- Processing happens in isolated extension contexts
- No network requests contain user data (except the one-time model download)
- Browser security mechanisms protect all operations

## Children's Privacy

The extension does not knowingly collect information from anyone, including children under 13. Since we don't collect any data at all, COPPA compliance is inherent to our design.

## Changes to This Policy

We may update this privacy policy occasionally. Changes will be reflected by updating the "Last Updated" date at the top of this document. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Your Rights

Since we don't collect or store any of your data, there is no data to:
- Request access to
- Request deletion of
- Request correction of
- Request portability of

Your data stays on your device and is never transmitted to us.

## Contact Information

If you have questions about this privacy policy or the extension's privacy practices:

- **GitHub Issues**: https://github.com/Shram-Insights-Pvt-Lts/organize-by-shram/issues
- **Email**: [Your contact email here]
- **Developer**: Shram Insights Pvt Ltd

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- Chrome Extension Platform Best Practices
- General Data Protection Regulation (GDPR) principles (by design - no data collection)
- California Consumer Privacy Act (CCPA) (by design - no data collection)

## Transparency

We believe in radical transparency about privacy:
- Our source code is open and auditable
- This privacy policy is version-controlled in our repository
- We use no obfuscation or hidden functionality
- The extension does exactly what it claims to do

---

**Summary**: Organize by Shram is a completely local, privacy-first extension. Your tab data never leaves your browser. We don't collect, store, or transmit any personal information. Ever.

For technical details about how the extension works, see our [README.md](README.md).
