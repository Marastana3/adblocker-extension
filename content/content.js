// Wrap everything in an async IIFE so we can await chrome.storage calls
(async () => {
  const host = location.hostname;

  // 1) Early‐exit if user has disabled this domain
  const { disabledSites = [] } = 
    await chrome.storage.sync.get({ disabledSites: [] });
  if (disabledSites.includes(host)) {
    console.log("InspireBlock: disabled on", host);
    return;
  }

  // 2) Load the replace-ads flag from local storage
  let { replaceGamblingAds = true } = 
    await chrome.storage.local.get({ replaceGamblingAds: true });

  // 3) Your selectors & assets
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
    '#x-strawberry_sticky_posts_widget-54 img',
    'ins.adsbygoogle',          
    'ins[class*="adsbygoogle"]',
    '.adsbygoogle',             
    '.ads-placeholder',        
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

  // 4) Safe style injection (wait for <head>)
  const style = document.createElement('style');
  style.textContent = hideSelectors
    .map(sel => `${sel} { display: none !important; }`)
    .join('\n');

  function injectStyles() {
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head && !head.contains(style)) {
      head.appendChild(style);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  // 5) Purge cross-origin iframes
  function purgeThirdPartyIframes() {
    document.querySelectorAll('iframe[src]').forEach(iframe => {
      try {
        if (new URL(iframe.src).origin !== location.origin) {
          iframe.remove();
        }
      } catch {
        iframe.remove();
      }
    });
  }
  purgeThirdPartyIframes();
  new MutationObserver(purgeThirdPartyIframes)
    .observe(document.documentElement, { childList: true, subtree: true });

  // 6) Hide or replace nodes
  function replaceNodeWithQuote(node) {
    const quote = motivationalQuotes[
      Math.floor(Math.random() * motivationalQuotes.length)
    ];
    const placeholder = document.createElement('div');
    placeholder.className = 'quote-replacement';
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

    // Generic hide selectors
    for (const sel of hideSelectors) {
      if (node.matches(sel)) {
        node.style.display = 'none';
        chrome.runtime.sendMessage({ type: 'ELEMENT_HIDDEN' });
        return;
      }
    }

    // Gambling ads
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

  // Special image-by-src handling
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

  // Initial scan
  function initialScan() {
    document.querySelectorAll('img').forEach(img => hideBySrc(img));
    const allSelectors = hideSelectors.concat(gamblingSelectors).join(', ');
    document.querySelectorAll(allSelectors).forEach(el => handleNode(el));
  }
  initialScan();

  // Observe new nodes
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === 'IMG') hideBySrc(node);
        handleNode(node);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // 7) Listen for replace-flag toggles
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'UPDATE_REPLACE_FLAG') {
      replaceGamblingAds = !!msg.value;
      // persist the new setting
      chrome.storage.local.set({ replaceGamblingAds });
      // re-scan to apply the new mode
      initialScan();
    }
  });

  console.log("InspireBlock content script active on", location.href);
})();
