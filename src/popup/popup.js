// Use simple keyword-based grouping (reliable, fast, works everywhere)
import { groupTabs } from "../utils/simpleGrouper.js";
import { categorizeTabs } from "../utils/smartCategorizer.js";

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
const COLOR_HEX = {
  grey: "#5f6368",
  blue: "#1a73e8",
  red: "#d93025",
  yellow: "#f9ab00",
  green: "#188038",
  pink: "#d01884",
  purple: "#9334e6",
  cyan: "#007b83",
  orange: "#e8710a",
};
let groups = [],
  ungroupedTabs = [],
  expandedGroups = new Set(),
  draggedTab = null,
  nextGroupId = 0,
  savedScrollTop = 0,
  tabGroupsSupported = true,
  allWindowsMode = false,
  targetWindowId = null;
document.addEventListener("DOMContentLoaded", checkMultipleWindows);
async function checkMultipleWindows() {
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
    if (windows.length > 1) {
      showWindowChoice(windows.length);
    } else {
      targetWindowId = windows[0]?.id || null;
      init();
    }
  } catch (e) {
    init();
  }
}
function showWindowChoice(windowCount) {
  const root = document.getElementById("root");
  root.innerHTML =
    '<div class="container"><div class="header"><h1>Smart Tab Grouper</h1><p class="subtitle">Multiple windows detected</p></div><div class="window-choice"><p class="choice-question">You have ' +
    windowCount +
    ' windows open. Which tabs should I organize?</p><div class="choice-buttons"><button class="btn btn-secondary choice-btn" id="currentWindowBtn"><span class="choice-icon">🪟</span><span class="choice-label">Current Window Only</span></button><button class="btn btn-primary choice-btn" id="allWindowsBtn"><span class="choice-icon">📚</span><span class="choice-label">All Windows</span><span class="choice-hint">Will combine into one window</span></button></div></div></div>';
  document
    .getElementById("currentWindowBtn")
    .addEventListener("click", async () => {
      allWindowsMode = false;
      const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
      for (const w of windows) {
        if (w.focused) {
          targetWindowId = w.id;
          break;
        }
      }
      if (!targetWindowId && windows.length > 0) targetWindowId = windows[0].id;
      init();
    });
  document
    .getElementById("allWindowsBtn")
    .addEventListener("click", async () => {
      allWindowsMode = true;
      const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
      for (const w of windows) {
        if (w.focused) {
          targetWindowId = w.id;
          break;
        }
      }
      if (!targetWindowId && windows.length > 0) targetWindowId = windows[0].id;
      init();
    });
}
async function init() {
  render("loading", 0);
  try {
    updateProgress(5, "Checking browser...");
    try {
      const r = await chrome.runtime.sendMessage({
        action: "checkTabGroupsSupport",
      });
      tabGroupsSupported = r && r.supported;
    } catch (e) {
      tabGroupsSupported = typeof chrome.tabGroups !== "undefined";
    }
    updateProgress(10, "Getting tabs...");
    let tabs;
    if (allWindowsMode) {
      tabs = await chrome.tabs.query({ windowType: "normal" });
    } else if (targetWindowId) {
      tabs = await chrome.tabs.query({ windowId: targetWindowId });
    } else {
      tabs = await chrome.tabs.query({
        lastFocusedWindow: true,
        windowType: "normal",
      });
    }
    if (tabs.length === 0) {
      render("error", "No tabs found.");
      return;
    }
    updateProgress(30, "Analyzing pages...");
    const tabData = await extractTabDataWithContent(tabs);
    updateProgress(50, "Categorizing tabs...");

    // Use smart categorizer with hybrid approach
    // Falls back to domain lookup + keyword matching (no embeddings for speed)
    const smartResult = await categorizeTabs(tabData, {
      getEmbedding: null, // Disable embeddings for now (fast mode)
      similarityThreshold: 0.7,
      minClusterSize: 2,
    });

    updateProgress(70, "Finalizing groups...");

    // Use smart categorizer results
    groups = smartResult.groups;
    ungroupedTabs = smartResult.others; // "Others" category becomes ungrouped
    nextGroupId = groups.length;
    updateProgress(100, "Done!");
    setTimeout(() => render("groups"), 150);
  } catch (error) {
    console.error("Error:", error);
    render("error", error.message);
  }
}
function updateProgress(p, m) {
  const b = document.getElementById("progress-bar"),
    t = document.getElementById("progress-text");
  if (b) b.style.width = p + "%";
  if (t) t.textContent = m;
}
async function extractTabDataWithContent(tabs) {
  const bd = tabs.map((t) => ({
    id: t.id,
    windowId: t.windowId,
    title: t.title || "Untitled",
    url: t.url || "",
    favicon: t.favIconUrl || "",
    domain: extractDomain(t.url),
    subdomain: extractSubdomain(t.url),
    pageContent: "",
    keywords: extractKeywords(t.title, t.url, ""),
    category: detectCategory(t.title, t.url, ""),
  }));
  const st = Date.now(),
    TPT = 150,
    MTT = 2000;
  const cp = tabs.map(async (t, i) => {
    if (Date.now() - st > MTT) return null;
    if (
      !t.url ||
      t.url.startsWith("chrome://") ||
      t.url.startsWith("chrome-extension://")
    )
      return null;
    try {
      const r = await Promise.race([
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: () => {
            const md =
              document.querySelector('meta[name="description"]')?.content || "";
            const h1 =
              document.querySelector("h1")?.textContent?.trim().slice(0, 100) ||
              "";
            return (md + " " + h1).slice(0, 300);
          },
        }),
        new Promise((r) => setTimeout(() => r(null), TPT)),
      ]);
      if (r && r[0]?.result) return { index: i, content: r[0].result };
    } catch (e) {}
    return null;
  });
  const rs = await Promise.race([
    Promise.all(cp),
    new Promise((r) => setTimeout(() => r([]), MTT)),
  ]);
  if (Array.isArray(rs))
    rs.forEach((r) => {
      if (r && r.content) {
        const t = bd[r.index];
        t.pageContent = r.content;
        t.keywords = extractKeywords(t.title, t.url, r.content);
        t.category = detectCategory(t.title, t.url, r.content);
      }
    });
  return bd;
}
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}
function extractSubdomain(url) {
  try {
    const p = new URL(url).hostname.split(".");
    return p.length > 2 ? p[0] : "";
  } catch {
    return "";
  }
}
function detectCategory(title, url, pc = "") {
  const tl = title.toLowerCase(),
    cl = pc.toLowerCase();
  const cats = {
    Documents: [
      "document",
      "spreadsheet",
      "presentation",
      "sheet",
      "slides",
      "word",
      "excel",
      "pdf",
    ],
    Design: [
      "figma",
      "design",
      "canva",
      "sketch",
      "adobe",
      "prototype",
      "mockup",
      "wireframe",
    ],
    Research: [
      "research",
      "study",
      "paper",
      "journal",
      "analysis",
      "thesis",
      "academic",
    ],
    Communication: [
      "chat",
      "message",
      "meeting",
      "calendar",
      "zoom",
      "teams",
      "conference",
    ],
    Reading: ["article", "blog", "post", "story", "guide", "tutorial", "news"],
    Shopping: [
      "cart",
      "checkout",
      "shop",
      "buy",
      "price",
      "product",
      "order",
      "sale",
    ],
    Development: [
      "pull request",
      "issue",
      "commit",
      "code",
      "repository",
      "debug",
      "api",
      "developer",
      "javascript",
      "python",
      "react",
    ],
    Email: ["inbox", "compose", "draft", "sent", "email", "mail"],
    Video: ["watch", "video", "episode", "movie", "stream", "subscribe"],
    Music: ["playlist", "album", "song", "artist", "music", "spotify"],
    Finance: ["balance", "transaction", "payment", "invoice", "bank", "credit"],
    AI: [
      "chatgpt",
      "claude",
      "ai",
      "prompt",
      "assistant",
      "copilot",
      "gemini",
      "llm",
    ],
    Social: [
      "feed",
      "timeline",
      "profile",
      "followers",
      "post",
      "comment",
      "share",
    ],
    Learning: [
      "course",
      "lesson",
      "learn",
      "education",
      "training",
      "certification",
    ],
  };
  let best = null,
    bScore = 0;
  for (const [c, kws] of Object.entries(cats)) {
    let s = 0;
    for (const k of kws) {
      if (tl.includes(k)) s += 3;
      else if (cl.includes(k)) s += 1;
    }
    if (s > bScore) {
      bScore = s;
      best = c;
    }
  }
  if (bScore >= 2) return best;
  const dc = {
    Development: ["github.com", "gitlab.com", "stackoverflow.com", "localhost"],
    Social: [
      "facebook.com",
      "twitter.com",
      "x.com",
      "instagram.com",
      "linkedin.com",
      "reddit.com",
    ],
    Video: ["youtube.com", "netflix.com", "twitch.tv"],
    Email: ["mail.google.com", "outlook."],
    Documents: ["docs.google.com", "sheets.google.com", "slides.google.com"],
    AI: ["chat.openai.com", "claude.ai"],
    Shopping: ["amazon.com", "ebay.com"],
  };
  const ul = url.toLowerCase();
  for (const [c, ds] of Object.entries(dc)) {
    if (ds.some((d) => ul.includes(d))) return c;
  }
  return null;
}
function extractKeywords(title, url, pc = "") {
  const ct = (title + " " + pc)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 20);
  const sw = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "it",
    "this",
    "that",
    "from",
    "as",
    "are",
    "was",
    "were",
    "be",
    "been",
    "has",
    "have",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "your",
    "my",
    "our",
    "their",
    "his",
    "her",
    "its",
    "new",
    "all",
    "one",
    "two",
    "three",
    "http",
    "https",
    "www",
    "com",
    "org",
    "net",
    "io",
    "app",
    "web",
    "html",
    "untitled",
    "home",
    "page",
    "index",
    "about",
    "null",
    "undefined",
    "google",
    "chrome",
    "tab",
    "browser",
    "window",
    "view",
    "open",
    "close",
    "save",
    "edit",
    "delete",
    "click",
    "here",
    "more",
    "less",
    "back",
    "next",
    "first",
    "last",
    "login",
    "logout",
    "sign",
    "register",
    "account",
    "settings",
    "help",
    "just",
    "get",
    "see",
    "also",
    "use",
    "make",
    "know",
    "want",
    "need",
    "like",
    "way",
    "well",
    "after",
    "think",
  ]);
  const wc = {};
  ct.forEach((w) => {
    if (!sw.has(w)) wc[w] = (wc[w] || 0) + 1;
  });
  return Object.entries(wc)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}
// groupTabs is now imported from simpleGrouper.js
function formatGroupName(n) {
  return n
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .substring(0, 25);
}
async function loadPatterns() {
  try {
    const r = await chrome.storage.local.get("groupingPatterns");
    return r.groupingPatterns || [];
  } catch {
    return [];
  }
}
async function savePatterns(groups) {
  const p = groups.map((g) => ({
    name: g.name,
    keywords: g.tabs.flatMap((t) => t.keywords).slice(0, 20),
    color: g.color,
  }));
  try {
    const e = await loadPatterns();
    await chrome.storage.local.set({
      groupingPatterns: [...e, ...p].slice(-50),
    });
  } catch (e) {}
}
function saveScrollPosition() {
  const c = document.querySelector(".groups-container");
  savedScrollTop = c ? c.scrollTop : 0;
  return savedScrollTop;
}
function restoreScrollPosition(st) {
  const ts = st !== undefined ? st : savedScrollTop;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const c = document.querySelector(".groups-container");
      if (c) c.scrollTop = ts;
    });
  });
}
function createNewGroup() {
  const g = {
    id: "group-" + nextGroupId++,
    name: "New Group",
    color: CHROME_COLORS[groups.length % CHROME_COLORS.length],
    tabs: [],
    tabIds: [],
  };
  groups.push(g);
  expandedGroups.add(g.id);
  render("groups");
}
function deleteTab(tid, gid) {
  const st = saveScrollPosition();
  const g = groups.find((x) => x.id === gid);
  if (!g) return;
  const i = g.tabs.findIndex((t) => t.id === tid);
  if (i === -1) return;
  const [t] = g.tabs.splice(i, 1);
  g.tabIds = g.tabs.map((x) => x.id);
  ungroupedTabs.push(t);
  if (g.tabs.length === 0) {
    groups = groups.filter((x) => x.id !== gid);
    expandedGroups.delete(gid);
  }
  render("groups");
  restoreScrollPosition(st);
}
function deleteGroup(gid) {
  const st = saveScrollPosition();
  const g = groups.find((x) => x.id === gid);
  if (!g) return;
  ungroupedTabs.push(...g.tabs);
  groups = groups.filter((x) => x.id !== gid);
  expandedGroups.delete(gid);
  render("groups");
  restoreScrollPosition(st);
}
function render(state, data) {
  const root = document.getElementById("root");
  if (state === "loading") {
    root.innerHTML =
      '<div class="container"><div class="header"><h1>Smart Tab Grouper</h1><p class="subtitle">Analyzing your tabs...</p></div><div class="loading"><div class="progress-container"><div class="progress-bar" id="progress-bar" style="width:' +
      (data || 0) +
      '%"></div></div><span id="progress-text" class="progress-text">Starting...</span></div></div>';
    return;
  }
  if (state === "error") {
    root.innerHTML =
      '<div class="container"><div class="header"><h1>Smart Tab Grouper</h1></div><div class="empty-state"><p>Error: ' +
      data +
      "</p></div></div>";
    return;
  }
  const tg = groups.reduce((s, g) => s + g.tabs.length, 0);
  const gwt = groups.filter((g) => g.tabs.length > 0).length;
  const modeLabel = allWindowsMode ? " (all windows)" : "";
  const warn = !tabGroupsSupported
    ? '<div class="browser-warning"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 5v5h-1.5V5h1.5z"/></svg><span>Tab Groups API not supported. Use Chrome, Edge, or Brave.</span></div>'
    : "";
  root.innerHTML =
    '<div class="container"><div class="header"><h1>Smart Tab Grouper</h1><p class="subtitle">' +
    tg +
    " tabs in " +
    gwt +
    " groups" +
    (ungroupedTabs.length > 0
      ? ", " + ungroupedTabs.length + " ungrouped"
      : "") +
    modeLabel +
    "</p>" +
    warn +
    '</div><div class="groups-container">' +
    (groups.length === 0 && ungroupedTabs.length === 0
      ? '<div class="empty-state"><p>No tabs to organize</p></div>'
      : "") +
    groups.map((g) => renderGroup(g)).join("") +
    (ungroupedTabs.length > 0 ? renderUngrouped() : "") +
    '<button class="add-group-btn" id="addGroupBtn">+ New Group</button></div><div class="footer"><button class="btn btn-secondary" id="refreshBtn">Refresh</button><button class="btn btn-primary" id="createGroupsBtn"' +
    (gwt === 0 || !tabGroupsSupported ? " disabled" : "") +
    ">" +
    (!tabGroupsSupported
      ? "Not Supported"
      : "Create " + gwt + " Group" + (gwt !== 1 ? "s" : "")) +
    "</button></div></div>";
  attachEventListeners();
}
function renderGroup(g) {
  const ex = expandedGroups.has(g.id);
  return (
    '<div class="group-card' +
    (ex ? " expanded" : "") +
    '" data-group-id="' +
    g.id +
    '"><div class="group-header"><div class="group-color" style="background:' +
    COLOR_HEX[g.color] +
    '" data-group-id="' +
    g.id +
    '" data-action="color"></div><input type="text" class="group-name" value="' +
    escapeHtml(g.name) +
    '" data-group-id="' +
    g.id +
    '" data-action="rename"><span class="group-count">' +
    g.tabs.length +
    '</span><button class="delete-group-btn" data-group-id="' +
    g.id +
    '" data-action="delete-group" title="Delete group">×</button><div class="expand-icon" data-group-id="' +
    g.id +
    '" data-action="toggle"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div></div><div class="tabs-list">' +
    g.tabs.map((t) => renderTab(t, g.id, true)).join("") +
    "</div></div>"
  );
}
function renderUngrouped() {
  const ex = expandedGroups.has("ungrouped");
  return (
    '<div class="group-card ungrouped' +
    (ex ? " expanded" : "") +
    '" data-group-id="ungrouped"><div class="group-header"><div class="group-color" style="background:#9aa0a6"></div><span class="group-name-static">Ungrouped</span><span class="group-count">' +
    ungroupedTabs.length +
    '</span><div class="expand-icon" data-group-id="ungrouped" data-action="toggle"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div></div><div class="tabs-list">' +
    ungroupedTabs.map((t) => renderTab(t, "ungrouped", false)).join("") +
    "</div></div>"
  );
}
function renderTab(t, gid, sd) {
  return (
    '<div class="tab-item" draggable="true" data-tab-id="' +
    t.id +
    '" data-group-id="' +
    gid +
    '"><img class="tab-favicon" src="' +
    (t.favicon || "icons/icon16.png") +
    '" alt="" onerror="this.src=\'icons/icon16.png\'"><div class="tab-info"><div class="tab-title">' +
    escapeHtml(t.title) +
    '</div><div class="tab-url">' +
    escapeHtml(t.domain) +
    "</div></div>" +
    (sd
      ? '<button class="delete-tab-btn" data-tab-id="' +
        t.id +
        '" data-group-id="' +
        gid +
        '" data-action="delete-tab" title="Remove">×</button>'
      : "") +
    "</div>"
  );
}
function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}
function attachEventListeners() {
  document.querySelectorAll(".group-header").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (
        e.target.closest("input") ||
        e.target.closest("button") ||
        e.target.closest('[data-action="color"]')
      )
        return;
      const st = saveScrollPosition();
      const gid = el.closest(".group-card").dataset.groupId;
      if (expandedGroups.has(gid)) expandedGroups.delete(gid);
      else expandedGroups.add(gid);
      render("groups");
      restoreScrollPosition(st);
    });
  });
  document.querySelectorAll('[data-action="rename"]').forEach((el) => {
    el.addEventListener("change", (e) => {
      const g = groups.find((x) => x.id === e.target.dataset.groupId);
      if (g) g.name = e.target.value;
    });
  });
  document.querySelectorAll('[data-action="color"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showColorPicker(e.currentTarget);
    });
  });
  document.querySelectorAll('[data-action="delete-tab"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTab(
        parseInt(e.currentTarget.dataset.tabId),
        e.currentTarget.dataset.groupId
      );
    });
  });
  document.querySelectorAll('[data-action="delete-group"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteGroup(e.currentTarget.dataset.groupId);
    });
  });
  document.querySelectorAll(".tab-item").forEach((el) => {
    el.addEventListener("dragstart", handleDragStart);
    el.addEventListener("dragend", handleDragEnd);
  });
  document.querySelectorAll(".group-card").forEach((el) => {
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);
  });
  document
    .getElementById("refreshBtn")
    ?.addEventListener("click", checkMultipleWindows);
  document
    .getElementById("createGroupsBtn")
    ?.addEventListener("click", createGroups);
  document
    .getElementById("addGroupBtn")
    ?.addEventListener("click", createNewGroup);
}
function showColorPicker(element) {
  document.querySelector(".color-picker")?.remove();
  const gid = element.dataset.groupId;
  const group = groups.find((g) => g.id === gid);
  const picker = document.createElement("div");
  picker.className = "color-picker";
  picker.innerHTML = CHROME_COLORS.map(
    (c) =>
      '<div class="color-option' +
      (group.color === c ? " selected" : "") +
      '" style="background:' +
      COLOR_HEX[c] +
      '" data-color="' +
      c +
      '"></div>'
  ).join("");
  const rect = element.getBoundingClientRect();
  picker.style.left = rect.left + "px";
  picker.style.top = rect.bottom + 4 + "px";
  document.body.appendChild(picker);
  picker.querySelectorAll(".color-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      group.color = opt.dataset.color;
      picker.remove();
      render("groups");
    });
  });
  setTimeout(
    () =>
      document.addEventListener(
        "click",
        function h(e) {
          if (!picker.contains(e.target)) {
            picker.remove();
            document.removeEventListener("click", h);
          }
        },
        { once: true }
      ),
    0
  );
}
function handleDragStart(e) {
  draggedTab = {
    tabId: parseInt(e.target.dataset.tabId),
    sourceGroupId: e.target.dataset.groupId,
  };
  e.target.classList.add("dragging");
}
function handleDragEnd(e) {
  e.target.classList.remove("dragging");
  document
    .querySelectorAll(".group-card")
    .forEach((el) => el.classList.remove("drag-over"));
  draggedTab = null;
}
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}
function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  if (!draggedTab) return;
  const targetGid = e.currentTarget.dataset.groupId;
  if (targetGid === draggedTab.sourceGroupId) return;
  let tab = null;
  if (draggedTab.sourceGroupId === "ungrouped") {
    const idx = ungroupedTabs.findIndex((t) => t.id === draggedTab.tabId);
    if (idx !== -1) [tab] = ungroupedTabs.splice(idx, 1);
  } else {
    const srcG = groups.find((g) => g.id === draggedTab.sourceGroupId);
    if (srcG) {
      const idx = srcG.tabs.findIndex((t) => t.id === draggedTab.tabId);
      if (idx !== -1) {
        [tab] = srcG.tabs.splice(idx, 1);
        srcG.tabIds = srcG.tabs.map((t) => t.id);
        if (srcG.tabs.length === 0) {
          groups = groups.filter((g) => g.id !== srcG.id);
          expandedGroups.delete(srcG.id);
        }
      }
    }
  }
  if (!tab) return;
  if (targetGid === "ungrouped") {
    ungroupedTabs.push(tab);
  } else {
    const tgtG = groups.find((g) => g.id === targetGid);
    if (tgtG) {
      tgtG.tabs.push(tab);
      tgtG.tabIds = tgtG.tabs.map((t) => t.id);
      expandedGroups.add(targetGid);
    }
  }
  render("groups");
}
async function createGroups() {
  const validGroups = groups.filter((g) => g.tabs.length > 0);
  if (validGroups.length === 0) return;
  const btn = document.getElementById("createGroupsBtn");
  btn.disabled = true;
  btn.textContent = "Creating...";
  try {
    await savePatterns(validGroups);
    if (allWindowsMode && targetWindowId) {
      btn.textContent = "Consolidating...";
      const allTabIds = [];
      validGroups.forEach((g) => {
        g.tabs.forEach((tab) => {
          if (tab.windowId !== targetWindowId) allTabIds.push(tab.id);
        });
      });
      ungroupedTabs.forEach((tab) => {
        if (tab.windowId !== targetWindowId) allTabIds.push(tab.id);
      });
      if (allTabIds.length > 0) {
        try {
          await chrome.tabs.move(allTabIds, {
            windowId: targetWindowId,
            index: -1,
          });
        } catch (e) {
          console.error("Error moving tabs:", e);
        }
      }
    }
    const groupsData = validGroups.map((g) => ({
      name: g.name,
      color: g.color,
      tabIds: g.tabIds,
    }));
    const ungroupedTabIds = ungroupedTabs.map((t) => t.id);
    const response = await chrome.runtime.sendMessage({
      action: "createTabGroups",
      groups: groupsData,
      ungroupedTabIds: ungroupedTabIds,
      arrangeGroupsFirst: true,
    });
    if (response?.notSupported) {
      alert("Tab Groups API is not supported in this browser.");
      btn.disabled = false;
      btn.textContent = "Not Supported";
      return;
    }
    if (response && response.success) {
      window.close();
    } else {
      throw new Error(response?.errors?.join(", ") || "Unknown error");
    }
  } catch (error) {
    console.error("Error:", error);
    btn.disabled = false;
    btn.textContent = "Create Groups";
    alert("Error: " + error.message);
  }
}
