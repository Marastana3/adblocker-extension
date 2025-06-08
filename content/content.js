let replaceGamblingAds = true;

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

const gamblingSelectors = [
  'iframe[src*="bet365"]',
  'iframe[src*="pokerstars"]',
  'iframe[src*="casino"]',
  '[class*="ad-gambling"]',
  'iframe[src*="slots"]'
];

const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "Success is not final; failure is not fatal.",
  "Hardships often prepare ordinary people for extraordinary destiny.",
  "The only way to achieve the impossible is to believe it is possible.",
  "Don’t watch the clock; do what it does. Keep going."
];

const puzzleLogoRegex = /logo-puzzle-(bet365|unibet|888sport|pokerstars|stanleybet|superbet|betano)\.(?:webp|jpe?g|png)$/i;


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

  for (const sel of hideSelectors) {
    if (node.matches(sel)) {
      node.style.display = 'none';
      chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
      return;
    }
  }

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


const style = document.createElement('style');
style.textContent = hideSelectors
  .map(sel => `${sel} { display: none !important; }`)
  .join('\n');
document.head.appendChild(style);

function initialScan() {
  document.querySelectorAll('img').forEach(img => hideBySrc(img));

  const allSelectors = hideSelectors.concat(gamblingSelectors).join(', ');
  document.querySelectorAll(allSelectors).forEach(el => handleNode(el));
}

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

chrome.storage.local.get("replaceGamblingAds", data => {
  replaceGamblingAds = !!data.replaceGamblingAds;
  initialScan();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_REPLACE_FLAG') {
    replaceGamblingAds = msg.value;
    chrome.storage.local.set({ replaceGamblingAds });
    initialScan();
  }
});

//debug 
console.log("InspireBlock content script injected on", window.location.href);
