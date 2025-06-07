// Grab elements
const reqCountEl   = document.getElementById('reqCount');
const elCountEl    = document.getElementById('elCount');
const quoteCountEl = document.getElementById('quoteCount');
const replaceToggle = document.getElementById('replaceToggle');
const disableBtn    = document.getElementById('disableDomain');

let currentTabId, currentDomain;

// Initialize the popup UI
async function initPopup() {
  // 1) Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  currentDomain = new URL(tab.url).hostname;

  // 2) Load stats and settings from storage
  chrome.storage.local.get(
    [`stats_${currentTabId}`, 'replaceGamblingAds', 'disabledDomains'],
    data => {
      const stats = data[`stats_${currentTabId}`] || {};
      reqCountEl.textContent   = `Requests blocked: ${stats.requestsBlocked || 0}`;
      elCountEl.textContent    = `Elements hidden: ${stats.elementsHidden || 0}`;
      quoteCountEl.textContent = `Gambling ads replaced: ${stats.gamblingReplaced || 0}`;

      // Set the toggle
      replaceToggle.checked = !!data.replaceGamblingAds;

      // Set the disable/enable button text
      const disabledList = data.disabledDomains || [];
      const isDisabled   = disabledList.includes(currentDomain);
      disableBtn.textContent = isDisabled
        ? 'Enable on this domain'
        : 'Disable on this domain';
    }
  );
}

// When the checkbox changes, save the new setting and notify the content script
replaceToggle.addEventListener('change', () => {
  const newVal = replaceToggle.checked;
  // This must be chrome.runtime.sendMessage, *not* chrome.tabs.sendMessage
  chrome.runtime.sendMessage({ type: 'UPDATE_REPLACE_FLAG', value: newVal })
});


// When the disable/enable button is clicked, toggle the whitelist for this domain
disableBtn.addEventListener('click', () => {
  chrome.storage.local.get('disabledDomains', data => {
    const list = new Set(data.disabledDomains || []);
    if (list.has(currentDomain)) {
      list.delete(currentDomain);
    } else {
      list.add(currentDomain);
    }
    chrome.storage.local.set({ disabledDomains: Array.from(list) }, () => {
      // Refresh popup UI and reload the page
      initPopup();
      chrome.tabs.reload(currentTabId);
    });
  });
});

// Run on load
document.addEventListener('DOMContentLoaded', initPopup);
