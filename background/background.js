// ─── 1) Per‐tab stats management ────────────────────────────────────────
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

// Reset stats on every completed navigation
chrome.webNavigation.onCompleted.addListener(({ tabId }) => {
  resetStats(tabId);
});

// ─── 2) Dynamic DNR “ALLOW” rules for disabledSites ───────────────────
async function syncDNRAllowRules() {
  const { disabledSites = [] } = await chrome.storage.sync.get("disabledSites");

  // Remove any existing dynamic rules
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);
  if (removeIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
  }

  // Rebuild an ALLOW‐all rule per disabled host
  const allowRules = disabledSites.map((host, idx) => ({
    id: 10000 + idx,           // IDs reserved for dynamic allow rules
    priority: 100,             // higher than your static block rules
    action: { type: "allow" },
    condition: {
      urlFilter: "*",
      resourceTypes: [
        "main_frame","sub_frame","script","image",
        "stylesheet","xmlhttprequest","object","font","media"
      ],
      domains: [host]
    }
  }));

  if (allowRules.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: allowRules });
  }
}

// On install: seed disabledSites and sync DNR
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get("disabledSites");
  if (!Array.isArray(data.disabledSites)) {
    await chrome.storage.sync.set({ disabledSites: [] });
  }
  await syncDNRAllowRules();
});

// When disabledSites changes, rebuild DNR allow rules
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.disabledSites) {
    syncDNRAllowRules();
  }
});

// ─── 3) Message handling ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  // a) Per‐tab stats messages
  if (sender.tab && typeof sender.tab.id === 'number') {
    const tabId = sender.tab.id;
    const stats = ensureStats(tabId);

    switch (msg.type) {
      case 'ELEMENT_HIDDEN':
        stats.elementsHidden++;
        persistStats(tabId);
        return;
      case 'GAMBLING_AD_REPLACED':
        stats.gamblingReplaced++;
        persistStats(tabId);
        return;
      case 'REQUEST_BLOCKED':
        stats.requestsBlocked++;
        persistStats(tabId);
        return;
    }
  }

  // b) Global message to update replace‐ads flag in content script
  if (msg.type === 'UPDATE_REPLACE_FLAG') {
    // find the active tab and forward
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tabId = tabs[0]?.id;
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, msg);
      }
    });
  }
});
