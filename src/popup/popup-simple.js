// Temporary test file without embeddings to isolate the issue

const CHROME_COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
];

console.log("Extension loaded successfully!");
console.log("Chrome APIs available:", typeof chrome !== 'undefined');

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("root");
  root.innerHTML = '<div style="padding: 20px;"><h1>Debug Test</h1><p>Extension loaded without errors!</p></div>';

  // Test Chrome API access
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    console.log("Found tabs:", tabs.length);
    root.innerHTML += `<p>Found ${tabs.length} tabs in current window</p>`;
  });
});
