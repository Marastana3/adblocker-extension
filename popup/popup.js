const reqCountEl    = document.getElementById('reqCount');
const elCountEl     = document.getElementById('elCount');
const quoteCountEl  = document.getElementById('quoteCount');
const replaceToggle = document.getElementById('replaceToggle');
const disableBtn    = document.getElementById('disableDomain');

let currentTabId, currentDomain;

document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  // 1) figure out which tab/domain we’re on
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url) return;
  currentTabId = tab.id;
  currentDomain = new URL(tab.url).hostname;

  // 2) fetch local stats + replace flag
  const localData = await chrome.storage.local.get([
    `stats_${currentTabId}`,
    'replaceGamblingAds'
  ]);
  const stats = localData[`stats_${currentTabId}`] || {};
  reqCountEl.textContent   = `Requests blocked: ${stats.requestsBlocked || 0}`;
  elCountEl.textContent    = `Elements hidden: ${stats.elementsHidden || 0}`;
  quoteCountEl.textContent = `Gambling ads replaced: ${stats.gamblingReplaced || 0}`;
  replaceToggle.checked    = !!localData.replaceGamblingAds;

  // 3) fetch sync-list of disabled sites
  const syncData = await chrome.storage.sync.get({ disabledSites: [] });
  const isDisabled = syncData.disabledSites.includes(currentDomain);
  disableBtn.textContent = isDisabled
    ? 'Enable on this domain'
    : 'Disable on this domain';

  // 4) wire listeners now that we know the context
  replaceToggle.addEventListener('change', onReplaceToggle);
  disableBtn.addEventListener('click', onDisableToggle);
}

async function onReplaceToggle() {
  const newVal = replaceToggle.checked;
  await chrome.storage.local.set({ replaceGamblingAds: newVal });
  // optionally notify background/content if needed:
  chrome.runtime.sendMessage({ type: 'UPDATE_REPLACE_FLAG', value: newVal });
}

async function onDisableToggle() {
  // flip currentDomain in storage.sync.disabledSites
  const { disabledSites = [] } = await chrome.storage.sync.get({ disabledSites: [] });
  const set = new Set(disabledSites);

  if (set.has(currentDomain)) set.delete(currentDomain);
  else set.add(currentDomain);

  await chrome.storage.sync.set({ disabledSites: Array.from(set) });
  // reload the tab so background/content sees the new setting
  chrome.tabs.reload(currentTabId);
  // refresh button text
  const nowDisabled = set.has(currentDomain);
  disableBtn.textContent = nowDisabled
    ? 'Enable on this domain'
    : 'Disable on this domain';
}

