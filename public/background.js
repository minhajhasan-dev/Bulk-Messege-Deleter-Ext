/* global chrome */

chrome.runtime.onInstalled.addListener(() => {
  // Optional: setup on install
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const u = new URL(tab.url);
      const host = u.hostname;
      if (/messenger\.com$/.test(host) || /facebook\.com$/.test(host)) {
        chrome.sidePanel.setOptions({
          tabId,
          path: 'index.html',
          enabled: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward to content script in the active tab if needed in future.
  if (message && message.type === 'getState') {
    sendResponse({ ok: true, state: { site: 'unknown', status: 'idle', progress: {}, selectedIds: [], threads: [], errors: [] } });
    return true;
  }
  sendResponse({ ok: true });
  return true;
});
