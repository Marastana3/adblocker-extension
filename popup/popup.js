const reqCountEl   = document.getElementById('reqCount');
const elCountEl    = document.getElementById('elCount');
const quoteCountEl = document.getElementById('quoteCount');
const replaceToggle = document.getElementById('replaceToggle');
const disableBtn    = document.getElementById('disableDomain');

let currentTabId, currentDomain;

async function initPopup() {
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  currentDomain = new URL(tab.url).hostname;

  
  chrome.storage.local.get(
    [`stats_${currentTabId}`, 'replaceGamblingAds', 'disabledDomains'],
    data => {
      const stats = data[`stats_${currentTabId}`] || {};
      reqCountEl.textContent   = `Requests blocked: ${stats.requestsBlocked || 0}`;
      elCountEl.textContent    = `Elements hidden: ${stats.elementsHidden || 0}`;
      quoteCountEl.textContent = `Gambling ads replaced: ${stats.gamblingReplaced || 0}`;

      
      replaceToggle.checked = !!data.replaceGamblingAds;
      
      const disabledList = data.disabledDomains || [];
      const isDisabled   = disabledList.includes(currentDomain);
      disableBtn.textContent = isDisabled
        ? 'Enable on this domain'
        : 'Disable on this domain';
    }
  );
}

replaceToggle.addEventListener('change', () => {
  const newVal = replaceToggle.checked;
  chrome.runtime.sendMessage({ type: 'UPDATE_REPLACE_FLAG', value: newVal })
});


disableBtn.addEventListener('click', () => {
  chrome.storage.local.get('disabledDomains', data => {
    const list = new Set(data.disabledDomains || []);
    if (list.has(currentDomain)) {
      list.delete(currentDomain);
    } else {
      list.add(currentDomain);
    }
    chrome.storage.local.set({ disabledDomains: Array.from(list) }, () => {
      initPopup();
      chrome.tabs.reload(currentTabId);
    });
  });
});

document.addEventListener('DOMContentLoaded', initPopup);
