// background.js

// In‐memory stats cache
const tabStats = {};

function ensureStats(tabId) {
  if (!tabStats[tabId]) {
    tabStats[tabId] = { requestsBlocked: 0, elementsHidden: 0, gamblingReplaced: 0 };
  }
  return tabStats[tabId];
}

function persistStats(tabId) {
  chrome.storage.local.set({ [`stats_${tabId}`]: tabStats[tabId] });
}

function resetStats(tabId) {
  tabStats[tabId] = { requestsBlocked: 0, elementsHidden: 0, gamblingReplaced: 0 };
  persistStats(tabId);
}

// ────────────────────────────────────────────────────────────────────────
// 1) Reset stats on each navigation
// ────────────────────────────────────────────────────────────────────────
chrome.webNavigation.onCompleted.addListener(({ tabId }) => {
  resetStats(tabId);
});

// ────────────────────────────────────────────────────────────────────────
// 2) Handle messages from content & popup
// ────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  // A) Stats messages from content script
  if (sender.tab && typeof sender.tab.id === 'number') {
    const tabId = sender.tab.id;
    const stats = ensureStats(tabId);

    if (msg.type === 'ELEMENT_HIDDEN') {
      stats.elementsHidden++;
      persistStats(tabId);
      return;
    }
    if (msg.type === 'GAMBLING_AD_REPLACED') {
      stats.gamblingReplaced++;
      persistStats(tabId);
      return;
    }
    if (msg.type === 'REQUEST_BLOCKED') {
      stats.requestsBlocked++;
      persistStats(tabId);
      return;
    }
  }

  // B) Control messages from popup (sender.tab will be undefined)
  if (!sender.tab) {
    // 1) Replace-ads toggle
    if (msg.type === 'UPDATE_REPLACE_FLAG') {
      // Forward to the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id != null) {
          chrome.tabs.sendMessage(tabs[0].id, msg);
        }
      });
      return;
    }

    // 2) Disable/enable on this domain (optional)
    if (msg.type === 'TOGGLE_DISABLE_DOMAIN') {
      // Forward to active tab too, if you handle it in content.js
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.id != null) {
          chrome.tabs.sendMessage(tabs[0].id, msg);
        }
      });
      return;
    }
  }
});
