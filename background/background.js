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

chrome.webNavigation.onCompleted.addListener(({ tabId }) => {
  resetStats(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
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

  if (!sender.tab) {
    if (msg.type === 'UPDATE_REPLACE_FLAG') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs[0]?.id;
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, msg);
          chrome.tabs.reload(tabId);
        }
      });
      return;
    }

    if (msg.type === 'TOGGLE_DISABLE_DOMAIN') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs[0]?.id;
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, msg);
        }
      });
      return;
    }
  }
});
