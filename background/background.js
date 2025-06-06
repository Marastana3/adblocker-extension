// background/background.js

let tabStats = {}; 

// Whenever a navigation completes, reset that tab’s stats:
chrome.webNavigation.onCompleted.addListener((navDetails) => {
  const tabId = navDetails.tabId;
  tabStats[tabId] = { requestsBlocked: 0, elementsHidden: 0, gamblingReplaced: 0 };
  chrome.storage.local.set({ [`stats_${tabId}`]: tabStats[tabId] });
});

// Listen for messages from content.js (ELEMENT_HIDDEN, GAMBLING_AD_REPLACED):
chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (tabId == null) return;

  if (!tabStats[tabId]) {
    tabStats[tabId] = { requestsBlocked: 0, elementsHidden: 0, gamblingReplaced: 0 };
  }

  if (msg.type === "ELEMENT_HIDDEN") {
    tabStats[tabId].elementsHidden++;
  } else if (msg.type === "GAMBLING_AD_REPLACED") {
    tabStats[tabId].gamblingReplaced++;
  }

  // Persist updated stats so popup can read them:
  chrome.storage.local.set({ [`stats_${tabId}`]: tabStats[tabId] });
});

// (Optional) If you want to dynamically add/remove blocking rules at runtime,
// you’d do something like this:
// chrome.declarativeNetRequest.updateDynamicRules({
//   addRules: [ /* rule objects like in ad_rules.json */ ],
//   removeRuleIds: [ /* IDs to remove */ ]
// });
