// content.js

// ────────────────────────────────────────────────────────────────────────
// 1) SETTINGS & PATTERNS
// ────────────────────────────────────────────────────────────────────────

// “Replace gambling ads” toggle (will be loaded from storage)
let replaceGamblingAds = true;

// Ad-hiding selectors
const hideSelectors = [
  '[class^="ad-"]',
  '[class$="-ad"]',
  '[class*=" ad-"]',
  '[class*="-ad "]',
  '[id^="ad-"]',
  '[id$="-ad"]',
  '[data-ad-slot]',
  '[data-adunit]',
  '[data-ad]',
  'iframe[src*="ads."]',
  'iframe[src*="doubleclick."]',
  'iframe[src*="googlesyndication."]',
  'script[src*="adservice"]',
  'script[src*="googlesyndication"]',
  'iframe#websports-iframe',
  'div.widget-text-widget#x-custom_html-2',
  '[id^="x-strawberry_sticky_posts_widget-"][data-template^="Puzzle"] img',
  '#x-strawberry_sticky_posts_widget-54 img'
];

// Gambling-ad selectors
const gamblingSelectors = [
  'iframe[src*="bet365"]',
  'iframe[src*="pokerstars"]',
  'iframe[src*="casino"]',
  '[class*="ad-gambling"]',
  'iframe[src*="slots"]'
];

// Motivational quotes
const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "Success is not final; failure is not fatal.",
  "Hardships often prepare ordinary people for extraordinary destiny.",
  "The only way to achieve the impossible is to believe it is possible.",
  "Don’t watch the clock; do what it does. Keep going."
];

// Exact “puzzle-logo” regex for sponsor images
const puzzleLogoRegex = /logo-puzzle-(bet365|unibet|888sport|pokerstars|stanleybet|superbet|betano)\.(?:webp|jpe?g|png)$/i;


// ────────────────────────────────────────────────────────────────────────
// 2) HELPERS
// ────────────────────────────────────────────────────────────────────────

function replaceNodeWithQuote(node) {
  const quote = motivationalQuotes[
    Math.floor(Math.random() * motivationalQuotes.length)
  ];
  const placeholder = document.createElement("div");
  placeholder.className = "quote-replacement";
  placeholder.textContent = quote;
  placeholder.style.cssText = `
    background: #f0f0f0;
    color: #333;
    font-style: italic;
    margin: 8px;
    padding: 6px 8px;
    border-left: 4px solid #007ACC;
  `;
  node.replaceWith(placeholder);
  chrome.runtime.sendMessage({ type: 'GAMBLING_AD_REPLACED' });
}

function handleNode(node) {
  if (!(node instanceof HTMLElement)) return;

  // 1) Hide general ads
  for (const sel of hideSelectors) {
    if (node.matches(sel)) {
      node.style.display = 'none';
      chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
      return;
    }
  }

  // 2) Replace or hide gambling ads
  for (const sel of gamblingSelectors) {
    if (node.matches(sel)) {
      if (replaceGamblingAds) {
        replaceNodeWithQuote(node);
      } else {
        node.remove();
        chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
      }
      return;
    }
  }
}

// Sponsor-logo hide by filename
function hideBySrc(img) {
  const widget = img.closest('[id^="x-strawberry_sticky_posts_widget"]');
  if (!widget) return false;

  const src = img.src || '';
  if (puzzleLogoRegex.test(src)) {
    if (replaceGamblingAds) {
      replaceNodeWithQuote(img);
    } else {
      img.remove();
      chrome.runtime.sendMessage({ type: 'SPONSOR_REPLACED' });
    }
    return true;
  }
  return false;
}



// ────────────────────────────────────────────────────────────────────────
// 3) INITIAL SCAN & CSS INJECTION
// ────────────────────────────────────────────────────────────────────────

// Pre-hide via CSS for a flash-free experience
const style = document.createElement('style');
style.textContent = hideSelectors
  .map(sel => `${sel} { display: none !important; }`)
  .join('\n');
document.head.appendChild(style);

function initialScan() {
  // 1) Sponsor images:
  document.querySelectorAll('img').forEach(img => hideBySrc(img));

  // 2) Ads & gambling:
  const allSelectors = hideSelectors.concat(gamblingSelectors).join(', ');
  document.querySelectorAll(allSelectors).forEach(el => handleNode(el));
}

// ────────────────────────────────────────────────────────────────────────
// 4) MUTATION OBSERVER FOR DYNAMIC CONTENT
// ────────────────────────────────────────────────────────────────────────

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.tagName === 'IMG') {
        hideBySrc(node);
      }
      handleNode(node);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// ────────────────────────────────────────────────────────────────────────
// 5) WIRE UP STORAGE + MESSAGING
// ────────────────────────────────────────────────────────────────────────

// 5A) Load the flag before doing initialScan()
chrome.storage.local.get("replaceGamblingAds", data => {
  replaceGamblingAds = !!data.replaceGamblingAds;
  initialScan();
});

// 5B) Persist & react to changes from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_REPLACE_FLAG') {
    replaceGamblingAds = msg.value;

    // Persist new value so on reload it'll stick
    chrome.storage.local.set({ replaceGamblingAds });

    // Re-run on the current DOM
    initialScan();
  }
});

// ────────────────────────────────────────────────────────────────────────
// DEBUG
// ────────────────────────────────────────────────────────────────────────
console.log("InspireBlock content script injected on", window.location.href);
