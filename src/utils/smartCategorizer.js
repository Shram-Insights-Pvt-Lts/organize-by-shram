/**
 * Smart Tab Categorizer
 * Hybrid approach: Domain Lookup → Semantic Match → Dynamic Groups → Others
 */

// Local implementation of cosine similarity to avoid external dependencies
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// ============================================================================
// GENERIC CATEGORIES (13 core categories + Others)
// ============================================================================

export const GENERIC_CATEGORIES = {
  AI: {
    color: "purple",
    keywords: [
      "ai",
      "chatbot",
      "assistant",
      "prompt",
      "llm",
      "gpt",
      "claude",
      "gemini",
      "copilot",
      "artificial intelligence",
      "machine learning",
    ],
  },
  "Social Media": {
    color: "blue",
    keywords: [
      "feed",
      "timeline",
      "followers",
      "post",
      "tweet",
      "like",
      "share",
      "profile",
      "social",
    ],
  },
  Entertainment: {
    color: "red",
    keywords: [
      "watch",
      "stream",
      "video",
      "movie",
      "music",
      "podcast",
      "episode",
      "play",
      "game",
      "gaming",
    ],
  },
  Travel: {
    color: "cyan",
    keywords: [
      "flight",
      "hotel",
      "booking",
      "trip",
      "vacation",
      "travel",
      "destination",
      "tour",
      "reservation",
    ],
  },
  Shopping: {
    color: "yellow",
    keywords: [
      "cart",
      "buy",
      "price",
      "product",
      "order",
      "shop",
      "checkout",
      "sale",
      "deal",
      "discount",
    ],
  },
  Finance: {
    color: "green",
    keywords: [
      "bank",
      "payment",
      "balance",
      "transaction",
      "money",
      "invest",
      "stock",
      "crypto",
      "wallet",
    ],
  },
  Development: {
    color: "grey",
    keywords: [
      "code",
      "repository",
      "pull request",
      "api",
      "developer",
      "programming",
      "debug",
      "git",
      "npm",
      "deploy",
    ],
  },
  Documents: {
    color: "orange",
    keywords: [
      "document",
      "spreadsheet",
      "presentation",
      "docs",
      "sheet",
      "slides",
      "pdf",
      "file",
      "edit",
    ],
  },
  Communication: {
    color: "pink",
    keywords: [
      "chat",
      "message",
      "meeting",
      "email",
      "inbox",
      "call",
      "video call",
      "conference",
      "slack",
      "teams",
    ],
  },
  Learning: {
    color: "cyan",
    keywords: [
      "course",
      "lesson",
      "tutorial",
      "education",
      "learn",
      "training",
      "class",
      "lecture",
      "study",
    ],
  },
  News: {
    color: "grey",
    keywords: [
      "news",
      "article",
      "breaking",
      "report",
      "headline",
      "latest",
      "update",
      "world",
      "politics",
    ],
  },
  Reference: {
    color: "blue",
    keywords: [
      "wiki",
      "documentation",
      "guide",
      "reference",
      "manual",
      "api docs",
      "definition",
      "encyclopedia",
    ],
  },
  Productivity: {
    color: "green",
    keywords: [
      "calendar",
      "todo",
      "task",
      "project",
      "plan",
      "schedule",
      "organize",
      "reminder",
      "deadline",
    ],
  },
  Others: {
    color: "grey",
    keywords: [],
  },
};

// ============================================================================
// DOMAIN → CATEGORY DICTIONARY (200+ domains)
// ============================================================================

export const DOMAIN_CATEGORY_MAP = {
  // ========== AI Tools ==========
  "chat.openai.com": "AI",
  "chatgpt.com": "AI",
  "manus.im": "AI",
  "openai.com": "AI",
  "claude.ai": "AI",
  "anthropic.com": "AI",
  "gemini.google.com": "AI",
  "bard.google.com": "AI",
  "perplexity.ai": "AI",
  "poe.com": "AI",
  "copilot.microsoft.com": "AI",
  "huggingface.co": "AI",
  "replicate.com": "AI",
  "midjourney.com": "AI",
  "stability.ai": "AI",
  "runway.ml": "AI",
  "character.ai": "AI",
  "inflection.ai": "AI",
  "pi.ai": "AI",
  "you.com": "AI",
  "phind.com": "AI",
  "deepl.com": "AI",
  "grammarly.com": "AI",
  "jasper.ai": "AI",
  "copy.ai": "AI",
  "writesonic.com": "AI",
  "notion.so/ai": "AI",

  // ========== Social Media ==========
  "facebook.com": "Social Media",
  "fb.com": "Social Media",
  "twitter.com": "Social Media",
  "x.com": "Social Media",
  "instagram.com": "Social Media",
  "linkedin.com": "Social Media",
  "reddit.com": "Social Media",
  "tiktok.com": "Social Media",
  "threads.net": "Social Media",
  "mastodon.social": "Social Media",
  "tumblr.com": "Social Media",
  "pinterest.com": "Social Media",
  "snapchat.com": "Social Media",
  "discord.com": "Social Media",
  "quora.com": "Social Media",
  "bluesky.app": "Social Media",
  "bsky.app": "Social Media",

  // ========== Entertainment ==========
  "youtube.com": "Entertainment",
  "youtu.be": "Entertainment",
  "netflix.com": "Entertainment",
  "spotify.com": "Entertainment",
  "open.spotify.com": "Entertainment",
  "twitch.tv": "Entertainment",
  "disneyplus.com": "Entertainment",
  "primevideo.com": "Entertainment",
  "hulu.com": "Entertainment",
  "hbomax.com": "Entertainment",
  "max.com": "Entertainment",
  "peacocktv.com": "Entertainment",
  "crunchyroll.com": "Entertainment",
  "funimation.com": "Entertainment",
  "soundcloud.com": "Entertainment",
  "vimeo.com": "Entertainment",
  "dailymotion.com": "Entertainment",
  "pandora.com": "Entertainment",
  "deezer.com": "Entertainment",
  "tidal.com": "Entertainment",
  "apple.com/music": "Entertainment",
  "music.apple.com": "Entertainment",
  "steam.com": "Entertainment",
  "steampowered.com": "Entertainment",
  "epicgames.com": "Entertainment",
  "xbox.com": "Entertainment",
  "playstation.com": "Entertainment",
  "ign.com": "Entertainment",
  "imdb.com": "Entertainment",
  "rottentomatoes.com": "Entertainment",

  // ========== Travel ==========
  "booking.com": "Travel",
  "airbnb.com": "Travel",
  "expedia.com": "Travel",
  "tripadvisor.com": "Travel",
  "kayak.com": "Travel",
  "skyscanner.com": "Travel",
  "hotels.com": "Travel",
  "agoda.com": "Travel",
  "vrbo.com": "Travel",
  "hostelworld.com": "Travel",
  "priceline.com": "Travel",
  "hotwire.com": "Travel",
  "orbitz.com": "Travel",
  "travelocity.com": "Travel",
  "cheapflights.com": "Travel",
  "google.com/maps": "Travel",
  "maps.google.com": "Travel",
  "google.com/travel": "Travel",
  "waze.com": "Travel",
  "uber.com": "Travel",
  "lyft.com": "Travel",
  "rome2rio.com": "Travel",
  "lonelyplanet.com": "Travel",
  "viator.com": "Travel",
  "getyourguide.com": "Travel",
  // Airlines
  "delta.com": "Travel",
  "united.com": "Travel",
  "aa.com": "Travel",
  "southwest.com": "Travel",
  "jetblue.com": "Travel",
  "emirates.com": "Travel",
  "britishairways.com": "Travel",
  "airindia.com": "Travel",
  "makemytrip.com": "Travel",
  "goibibo.com": "Travel",
  "cleartrip.com": "Travel",
  "ixigo.com": "Travel",
  "yatra.com": "Travel",

  // ========== Shopping ==========
  "amazon.com": "Shopping",
  "amazon.in": "Shopping",
  "amazon.co.uk": "Shopping",
  "amazon.de": "Shopping",
  "ebay.com": "Shopping",
  "flipkart.com": "Shopping",
  "walmart.com": "Shopping",
  "target.com": "Shopping",
  "etsy.com": "Shopping",
  "alibaba.com": "Shopping",
  "aliexpress.com": "Shopping",
  "wish.com": "Shopping",
  "shopify.com": "Shopping",
  "bestbuy.com": "Shopping",
  "newegg.com": "Shopping",
  "costco.com": "Shopping",
  "homedepot.com": "Shopping",
  "lowes.com": "Shopping",
  "ikea.com": "Shopping",
  "wayfair.com": "Shopping",
  "overstock.com": "Shopping",
  "zappos.com": "Shopping",
  "asos.com": "Shopping",
  "shein.com": "Shopping",
  "zara.com": "Shopping",
  "hm.com": "Shopping",
  "uniqlo.com": "Shopping",
  "nike.com": "Shopping",
  "adidas.com": "Shopping",
  "myntra.com": "Shopping",
  "ajio.com": "Shopping",
  "nykaa.com": "Shopping",
  "meesho.com": "Shopping",

  // ========== Finance ==========
  "paypal.com": "Finance",
  "stripe.com": "Finance",
  "coinbase.com": "Finance",
  "robinhood.com": "Finance",
  "binance.com": "Finance",
  "kraken.com": "Finance",
  "razorpay.com": "Finance",
  "paytm.com": "Finance",
  "phonepe.com": "Finance",
  "gpay.app": "Finance",
  "venmo.com": "Finance",
  "cashapp.com": "Finance",
  "wise.com": "Finance",
  "revolut.com": "Finance",
  "chase.com": "Finance",
  "bankofamerica.com": "Finance",
  "wellsfargo.com": "Finance",
  "citi.com": "Finance",
  "capitalone.com": "Finance",
  "discover.com": "Finance",
  "americanexpress.com": "Finance",
  "fidelity.com": "Finance",
  "schwab.com": "Finance",
  "etrade.com": "Finance",
  "tdameritrade.com": "Finance",
  "vanguard.com": "Finance",
  "mint.com": "Finance",
  "ynab.com": "Finance",
  "personalcapital.com": "Finance",
  "nerdwallet.com": "Finance",
  "creditkarma.com": "Finance",
  "zerodha.com": "Finance",
  "groww.in": "Finance",
  "upstox.com": "Finance",
  "kite.zerodha.com": "Finance",
  "moneycontrol.com": "Finance",
  "tradingview.com": "Finance",
  "investing.com": "Finance",
  "yahoo.com/finance": "Finance",
  "finance.yahoo.com": "Finance",

  // ========== Development ==========
  "github.com": "Development",
  "gitlab.com": "Development",
  "bitbucket.org": "Development",
  "stackoverflow.com": "Development",
  "stackexchange.com": "Development",
  "npmjs.com": "Development",
  "pypi.org": "Development",
  "rubygems.org": "Development",
  "crates.io": "Development",
  "packagist.org": "Development",
  "nuget.org": "Development",
  "maven.apache.org": "Development",
  "vercel.com": "Development",
  "netlify.com": "Development",
  "heroku.com": "Development",
  "render.com": "Development",
  "railway.app": "Development",
  "fly.io": "Development",
  "digitalocean.com": "Development",
  "aws.amazon.com": "Development",
  "console.aws.amazon.com": "Development",
  "cloud.google.com": "Development",
  "console.cloud.google.com": "Development",
  "azure.microsoft.com": "Development",
  "portal.azure.com": "Development",
  "firebase.google.com": "Development",
  "supabase.com": "Development",
  "planetscale.com": "Development",
  "mongodb.com": "Development",
  "redis.com": "Development",
  "docker.com": "Development",
  "hub.docker.com": "Development",
  "kubernetes.io": "Development",
  "terraform.io": "Development",
  localhost: "Development",
  "127.0.0.1": "Development",
  "codepen.io": "Development",
  "codesandbox.io": "Development",
  "replit.com": "Development",
  "jsfiddle.net": "Development",
  "glitch.com": "Development",
  "devdocs.io": "Development",
  "regex101.com": "Development",
  "jsonformatter.org": "Development",
  "jwt.io": "Development",

  // ========== Documents ==========
  "docs.google.com": "Documents",
  "sheets.google.com": "Documents",
  "slides.google.com": "Documents",
  "drive.google.com": "Documents",
  "notion.so": "Documents",
  "coda.io": "Documents",
  "airtable.com": "Documents",
  "dropbox.com": "Documents",
  "box.com": "Documents",
  "onedrive.live.com": "Documents",
  "sharepoint.com": "Documents",
  "office.com": "Documents",
  "office365.com": "Documents",
  "evernote.com": "Documents",
  "onenote.com": "Documents",
  "confluence.atlassian.com": "Documents",
  "paper.dropbox.com": "Documents",
  "quip.com": "Documents",
  "zoho.com/docs": "Documents",
  "canva.com": "Documents",
  "figma.com": "Documents",
  "miro.com": "Documents",
  "lucidchart.com": "Documents",
  "diagrams.net": "Documents",
  "draw.io": "Documents",
  "overleaf.com": "Documents",
  "typst.app": "Documents",

  // ========== Communication ==========
  "mail.google.com": "Communication",
  "gmail.com": "Communication",
  "outlook.live.com": "Communication",
  "outlook.office.com": "Communication",
  "outlook.com": "Communication",
  "mail.yahoo.com": "Communication",
  "protonmail.com": "Communication",
  "proton.me": "Communication",
  "tutanota.com": "Communication",
  "fastmail.com": "Communication",
  "slack.com": "Communication",
  "app.slack.com": "Communication",
  "teams.microsoft.com": "Communication",
  "zoom.us": "Communication",
  "meet.google.com": "Communication",
  "whereby.com": "Communication",
  "webex.com": "Communication",
  "gotomeeting.com": "Communication",
  "whatsapp.com": "Communication",
  "web.whatsapp.com": "Communication",
  "telegram.org": "Communication",
  "web.telegram.org": "Communication",
  "signal.org": "Communication",
  "messenger.com": "Communication",
  "intercom.com": "Communication",
  "crisp.chat": "Communication",
  "zendesk.com": "Communication",
  "freshdesk.com": "Communication",
  "helpscout.com": "Communication",

  // ========== Learning ==========
  "coursera.org": "Learning",
  "udemy.com": "Learning",
  "edx.org": "Learning",
  "khanacademy.org": "Learning",
  "skillshare.com": "Learning",
  "pluralsight.com": "Learning",
  "linkedin.com/learning": "Learning",
  "lynda.com": "Learning",
  "codecademy.com": "Learning",
  "freecodecamp.org": "Learning",
  "leetcode.com": "Learning",
  "hackerrank.com": "Learning",
  "codewars.com": "Learning",
  "exercism.org": "Learning",
  "brilliant.org": "Learning",
  "masterclass.com": "Learning",
  "duolingo.com": "Learning",
  "memrise.com": "Learning",
  "babbel.com": "Learning",
  "busuu.com": "Learning",
  "udacity.com": "Learning",
  "datacamp.com": "Learning",
  "treehouse.com": "Learning",
  "frontendmasters.com": "Learning",
  "egghead.io": "Learning",
  "laracasts.com": "Learning",
  "mit.edu": "Learning",
  "stanford.edu": "Learning",
  "harvard.edu": "Learning",
  "berkeley.edu": "Learning",
  "classroom.google.com": "Learning",

  // ========== News ==========
  "news.google.com": "News",
  "cnn.com": "News",
  "bbc.com": "News",
  "bbc.co.uk": "News",
  "nytimes.com": "News",
  "theguardian.com": "News",
  "reuters.com": "News",
  "apnews.com": "News",
  "wsj.com": "News",
  "washingtonpost.com": "News",
  "forbes.com": "News",
  "bloomberg.com": "News",
  "cnbc.com": "News",
  "foxnews.com": "News",
  "nbcnews.com": "News",
  "abcnews.go.com": "News",
  "cbsnews.com": "News",
  "usatoday.com": "News",
  "huffpost.com": "News",
  "vice.com": "News",
  "vox.com": "News",
  "buzzfeed.com": "News",
  "theatlantic.com": "News",
  "economist.com": "News",
  "time.com": "News",
  "newsweek.com": "News",
  "techcrunch.com": "News",
  "theverge.com": "News",
  "wired.com": "News",
  "arstechnica.com": "News",
  "engadget.com": "News",
  "gizmodo.com": "News",
  "mashable.com": "News",
  "cnet.com": "News",
  "zdnet.com": "News",
  "venturebeat.com": "News",
  "thenextweb.com": "News",
  "hindustantimes.com": "News",
  "timesofindia.indiatimes.com": "News",
  "ndtv.com": "News",
  "indianexpress.com": "News",
  "thehindu.com": "News",

  // ========== Reference ==========
  "wikipedia.org": "Reference",
  "en.wikipedia.org": "Reference",
  "developer.mozilla.org": "Reference",
  "mdn.io": "Reference",
  "w3schools.com": "Reference",
  "devdocs.io": "Reference",
  "docs.python.org": "Reference",
  "docs.rust-lang.org": "Reference",
  "go.dev": "Reference",
  "typescriptlang.org": "Reference",
  "reactjs.org": "Reference",
  "react.dev": "Reference",
  "vuejs.org": "Reference",
  "angular.io": "Reference",
  "svelte.dev": "Reference",
  "nextjs.org": "Reference",
  "nodejs.org": "Reference",
  "expressjs.com": "Reference",
  "fastify.io": "Reference",
  "django-project.com": "Reference",
  "flask.palletsprojects.com": "Reference",
  "rubyonrails.org": "Reference",
  "laravel.com": "Reference",
  "spring.io": "Reference",
  "dart.dev": "Reference",
  "flutter.dev": "Reference",
  "kotlinlang.org": "Reference",
  "swift.org": "Reference",
  "cppreference.com": "Reference",
  "docs.microsoft.com": "Reference",
  "learn.microsoft.com": "Reference",
  "cloud.google.com/docs": "Reference",
  "docs.aws.amazon.com": "Reference",
  "merriam-webster.com": "Reference",
  "dictionary.com": "Reference",
  "thesaurus.com": "Reference",
  "britannica.com": "Reference",
  "wolframalpha.com": "Reference",
  "mathworld.wolfram.com": "Reference",
  "arxiv.org": "Reference",
  "scholar.google.com": "Reference",
  "pubmed.ncbi.nlm.nih.gov": "Reference",
  "researchgate.net": "Reference",
  "semanticscholar.org": "Reference",

  // ========== Productivity ==========
  "calendar.google.com": "Productivity",
  "trello.com": "Productivity",
  "asana.com": "Productivity",
  "todoist.com": "Productivity",
  "monday.com": "Productivity",
  "clickup.com": "Productivity",
  "basecamp.com": "Productivity",
  "linear.app": "Productivity",
  "height.app": "Productivity",
  "shortcut.com": "Productivity",
  "jira.atlassian.com": "Productivity",
  "youtrack.jetbrains.com": "Productivity",
  "wrike.com": "Productivity",
  "smartsheet.com": "Productivity",
  "teamwork.com": "Productivity",
  "clockify.me": "Productivity",
  "toggl.com": "Productivity",
  "harvest.com": "Productivity",
  "zapier.com": "Productivity",
  "ifttt.com": "Productivity",
  "make.com": "Productivity",
  "n8n.io": "Productivity",
  "calendly.com": "Productivity",
  "doodle.com": "Productivity",
  "when2meet.com": "Productivity",
  "1password.com": "Productivity",
  "lastpass.com": "Productivity",
  "bitwarden.com": "Productivity",
  "dashlane.com": "Productivity",
  "buffer.com": "Productivity",
  "hootsuite.com": "Productivity",
  "later.com": "Productivity",
  "loom.com": "Productivity",
  "screencastify.com": "Productivity",
};

// ============================================================================
// MAIN CATEGORIZATION FUNCTION
// ============================================================================

/**
 * Categorize tabs using the hybrid pipeline:
 * 1. Domain lookup → Generic categories
 * 2. Semantic match → Existing categories
 * 3. Cluster similar → New dynamic categories
 * 4. Unique tabs → "Others"
 *
 * @param {Array} tabs - Array of tab objects
 * @param {Object} options - Configuration options
 * @param {Function} options.getEmbedding - Function to get embeddings (optional)
 * @param {number} options.similarityThreshold - Threshold for semantic matching (default: 0.7)
 * @param {number} options.minClusterSize - Minimum tabs to form a new category (default: 2)
 * @returns {Promise<Object>} - { groups: Array, others: Array }
 */
export async function categorizeTabs(tabs, options = {}) {
  const {
    getEmbedding = null,
    similarityThreshold = 0.7,
    minClusterSize = 2,
  } = options;

  console.log(
    `[SmartCategorizer] Starting categorization of ${tabs.length} tabs`
  );

  // Result containers
  const categoryGroups = {}; // categoryName -> { tabs: [], color: string }
  const uncategorized = []; // Tabs that didn't match domain

  // Initialize all generic categories (empty)
  for (const [name, config] of Object.entries(GENERIC_CATEGORIES)) {
    categoryGroups[name] = {
      name,
      color: config.color,
      tabs: [],
      tabIds: [],
    };
  }

  // ========== Phase 1: Domain Lookup ==========
  console.log("[SmartCategorizer] Phase 1: Domain lookup");

  for (const tab of tabs) {
    const category = categoryFromDomain(tab);

    if (category) {
      categoryGroups[category].tabs.push(tab);
      categoryGroups[category].tabIds.push(tab.id);
    } else {
      uncategorized.push(tab);
    }
  }

  console.log(
    `[SmartCategorizer] Phase 1 complete: ${
      tabs.length - uncategorized.length
    } categorized, ${uncategorized.length} uncategorized`
  );

  // If we have embeddings capability and uncategorized tabs, do semantic matching
  if (getEmbedding && uncategorized.length > 0) {
    // ========== Phase 2: Semantic Match to Existing Categories ==========
    console.log("[SmartCategorizer] Phase 2: Semantic matching");

    const stillUncategorized = [];

    for (const tab of uncategorized) {
      const match = await matchToExistingCategories(
        tab,
        categoryGroups,
        getEmbedding,
        similarityThreshold
      );

      if (match) {
        categoryGroups[match].tabs.push(tab);
        categoryGroups[match].tabIds.push(tab.id);
      } else {
        stillUncategorized.push(tab);
      }
    }

    console.log(
      `[SmartCategorizer] Phase 2 complete: ${
        uncategorized.length - stillUncategorized.length
      } matched, ${stillUncategorized.length} still uncategorized`
    );

    // ========== Phase 3: Cluster Similar Uncategorized Tabs ==========
    if (stillUncategorized.length >= minClusterSize) {
      console.log("[SmartCategorizer] Phase 3: Clustering uncategorized tabs");

      const clusters = await clusterUncategorizedTabs(
        stillUncategorized,
        getEmbedding,
        similarityThreshold
      );

      for (const cluster of clusters) {
        if (cluster.length >= minClusterSize) {
          // Create new dynamic category
          const categoryName = generateCategoryName(cluster);
          categoryGroups[categoryName] = {
            name: categoryName,
            color: "grey",
            tabs: cluster,
            tabIds: cluster.map((t) => t.id),
          };
        } else {
          // Add to Others
          for (const tab of cluster) {
            categoryGroups["Others"].tabs.push(tab);
            categoryGroups["Others"].tabIds.push(tab.id);
          }
        }
      }
    } else {
      // All uncategorized go to Others
      for (const tab of stillUncategorized) {
        categoryGroups["Others"].tabs.push(tab);
        categoryGroups["Others"].tabIds.push(tab.id);
      }
    }
  } else {
    // No embeddings - use keyword-based matching for uncategorized
    console.log("[SmartCategorizer] Phase 2 (fallback): Keyword matching");

    for (const tab of uncategorized) {
      const match = keywordMatch(tab);

      if (match) {
        categoryGroups[match].tabs.push(tab);
        categoryGroups[match].tabIds.push(tab.id);
      } else {
        categoryGroups["Others"].tabs.push(tab);
        categoryGroups["Others"].tabIds.push(tab.id);
      }
    }
  }

  // ========== Format Output ==========
  const groups = [];
  let groupId = 0;

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

  for (const [name, group] of Object.entries(categoryGroups)) {
    if (group.tabs.length > 0 && name !== "Others") {
      groups.push({
        id: `group-${groupId++}`,
        name: group.name,
        color: CHROME_COLORS.includes(group.color) ? group.color : "grey",
        tabs: group.tabs,
        tabIds: group.tabIds,
      });
    }
  }

  // Sort groups by tab count (descending)
  groups.sort((a, b) => b.tabs.length - a.tabs.length);

  const others = categoryGroups["Others"].tabs;

  console.log(
    `[SmartCategorizer] Complete: ${groups.length} groups, ${others.length} in Others`
  );

  return { groups, others };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Look up category from domain
 * @param {Object} tab - Tab object with url/domain
 * @returns {string|null} - Category name or null
 */
function categoryFromDomain(tab) {
  if (!tab.url) return null;

  try {
    const url = new URL(tab.url);
    const hostname = url.hostname.replace("www.", "");

    // Check for exact domain match
    if (DOMAIN_CATEGORY_MAP[hostname]) {
      return DOMAIN_CATEGORY_MAP[hostname];
    }

    // Check for partial matches (e.g., 'google.com/maps')
    const fullPath = hostname + url.pathname;
    for (const [domain, category] of Object.entries(DOMAIN_CATEGORY_MAP)) {
      if (fullPath.startsWith(domain) || hostname.endsWith(domain)) {
        return category;
      }
    }

    // Check for subdomain matches (e.g., 'app.slack.com' should match 'slack.com')
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join(".");
      if (DOMAIN_CATEGORY_MAP[baseDomain]) {
        return DOMAIN_CATEGORY_MAP[baseDomain];
      }
    }
  } catch (e) {
    // Invalid URL
  }

  return null;
}

/**
 * Match tab to existing categories using keywords
 * @param {Object} tab - Tab object
 * @returns {string|null} - Category name or null
 */
function keywordMatch(tab) {
  const text = `${tab.title || ""} ${tab.pageContent || ""}`.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [category, config] of Object.entries(GENERIC_CATEGORIES)) {
    if (category === "Others" || config.keywords.length === 0) continue;

    let score = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        score += keyword.length > 5 ? 2 : 1; // Longer keywords = stronger signal
      }
    }

    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

/**
 * Match tab to existing categories using semantic similarity
 * @param {Object} tab - Tab object
 * @param {Object} categoryGroups - Existing category groups
 * @param {Function} getEmbedding - Embedding function
 * @param {number} threshold - Similarity threshold
 * @returns {Promise<string|null>} - Category name or null
 */
async function matchToExistingCategories(
  tab,
  categoryGroups,
  getEmbedding,
  threshold
) {
  const tabText = `${tab.title || ""} ${tab.domain || ""} ${
    tab.pageContent || ""
  }`.slice(0, 500);
  const tabEmbedding = await getEmbedding(tabText);

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const [categoryName, group] of Object.entries(categoryGroups)) {
    if (categoryName === "Others" || group.tabs.length === 0) continue;

    // Compare with representative tabs from this category (up to 3)
    const representativeTabs = group.tabs.slice(0, 3);

    for (const repTab of representativeTabs) {
      const repText = `${repTab.title || ""} ${repTab.domain || ""} ${
        repTab.pageContent || ""
      }`.slice(0, 500);
      const repEmbedding = await getEmbedding(repText);

      const similarity = cosineSimilarity(tabEmbedding, repEmbedding);

      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = categoryName;
      }
    }
  }

  return bestMatch;
}

/**
 * Cluster uncategorized tabs by similarity
 * @param {Array} tabs - Uncategorized tabs
 * @param {Function} getEmbedding - Embedding function
 * @param {number} threshold - Similarity threshold
 * @returns {Promise<Array<Array>>} - Array of clusters
 */
async function clusterUncategorizedTabs(tabs, getEmbedding, threshold) {
  if (tabs.length === 0) return [];

  // Generate embeddings for all uncategorized tabs
  const embeddings = [];
  for (const tab of tabs) {
    const text = `${tab.title || ""} ${tab.domain || ""} ${
      tab.pageContent || ""
    }`.slice(0, 500);
    embeddings.push(await getEmbedding(text));
  }

  // Greedy clustering
  const assigned = new Set();
  const clusters = [];

  for (let i = 0; i < tabs.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [tabs[i]];
    assigned.add(i);

    for (let j = i + 1; j < tabs.length; j++) {
      if (assigned.has(j)) continue;

      // Check similarity with cluster members
      let maxSimilarity = 0;
      for (let k = 0; k < cluster.length && k < 3; k++) {
        const clusterIdx = tabs.indexOf(cluster[k]);
        const similarity = cosineSimilarity(
          embeddings[clusterIdx],
          embeddings[j]
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      if (maxSimilarity >= threshold) {
        cluster.push(tabs[j]);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Generate a category name from a cluster of tabs
 * @param {Array} tabs - Tabs in the cluster
 * @returns {string} - Category name
 */
function generateCategoryName(tabs) {
  // Try common domain
  const domains = tabs.map((t) => t.domain).filter(Boolean);
  const domainCounts = {};
  domains.forEach((d) => {
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });

  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];

  if (topDomain && topDomain[1] >= Math.ceil(tabs.length / 2)) {
    // Format domain as name
    const name = topDomain[0].split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Try common keywords from titles
  const allWords = tabs
    .flatMap((t) => (t.title || "").toLowerCase().split(/\s+/))
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const wordCounts = {};
  allWords.forEach((w) => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });

  const topWord = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])[0];

  if (topWord && topWord[1] >= 2) {
    return topWord[0].charAt(0).toUpperCase() + topWord[0].slice(1);
  }

  return "Related";
}

// Common stop words to filter out
const STOP_WORDS = new Set([
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
  "http",
  "https",
  "www",
  "com",
  "org",
  "net",
  "home",
  "page",
  "index",
  "about",
  "login",
  "sign",
  "just",
  "get",
  "see",
]);
