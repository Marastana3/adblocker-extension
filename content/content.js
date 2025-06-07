console.log("Content script running on", window.location.href);

// content/content.js

// 1. Load the “replace gambling ads” flag from storage
let replaceGamblingAds = false;
chrome.storage.local.get("replaceGamblingAds", data => {
  replaceGamblingAds = !!data.replaceGamblingAds;
});
chrome.storage.onChanged.addListener(changes => {
  if (changes.replaceGamblingAds) {
    replaceGamblingAds = changes.replaceGamblingAds.newValue;
  }
});

// 2. Define the selectors
const hideSelectors = [
  // Classes that *start* or *end* with an ad token, not just contain “ad” anywhere:
  '[class^="ad-"]',      // ad-banner, ad_container
  '[class$="-ad"]',      // sidebar-ad, footer-ad
  '[class*=" ad-"]',     // “top ad-banner”
  '[class*="-ad "]',     // “sidebar-ad widget”

  // IDs that start or end with “ad”
  '[id^="ad-"]',
  '[id$="-ad"]',

  // data attributes used by many ad frameworks
  '[data-ad-slot]',
  '[data-adunit]',
  '[data-ad]',

  // Iframes loading from ad domains
  'iframe[src*="ads."], iframe[src*="doubleclick."], iframe[src*="googlesyndication."]',

  // Scripts from known ad servers
  'script[src*="adservice"]',
  'script[src*="googlesyndication"]'
];


const gamblingSelectors = [
  'iframe[src*="bet365"], iframe[src*="pokerstars"], iframe[src*="casino"],',
  '[class*=" ad-gambling"]', 
  '[data-ad-type="gambling"]',   
  'iframe[src*="slots"],',     
];

// 3. Quotes array
const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "Success is not final; failure is not fatal.",
  "Hardships often prepare ordinary people for extraordinary destiny.",
  "The only way to achieve the impossible is to believe it is possible.",
  "Don’t watch the clock; do what it does. Keep going."
];

// 4. Helper to replace a node with a random quote
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

// 5. Scan & handle a single node
function handleNode(node) {
  if (!(node instanceof HTMLElement)) return;

  // General ads: hide
  if (hideSelectors.some(sel => node.matches(sel))) {
    node.style.display = 'none';
    chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
    return;
  }

  // Gambling ads: hide or replace
  if (gamblingSelectors.some(sel => node.matches(sel))) {
    if (replaceGamblingAds) {
      replaceNodeWithQuote(node);
    } else {
      node.remove();
      chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
    }
  }
}

// 6. Initial page‐load pass
function initialScan() {
  hideSelectors.concat(gamblingSelectors).forEach(sel => {
    document.querySelectorAll(sel).forEach(node => handleNode(node));
  });
}

// 7. Inject CSS to pre‐hide general ads (optional but faster)
const style = document.createElement('style');
style.textContent = hideSelectors
  .map(sel => `${sel} { display: none !important; }`)
  .join('\n');
document.head.appendChild(style);

// 8. Watch for dynamically injected ads
const observer = new MutationObserver(muts => {
  muts.forEach(m => {
    m.addedNodes.forEach(handleNode);
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// 9. Kick off the initial scan
initialScan();

// 10. Log for debugging
console.log("Content script running on", window.location.href);
