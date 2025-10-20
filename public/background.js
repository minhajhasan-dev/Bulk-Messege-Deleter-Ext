/* global chrome */
/*
  Background service worker for Bulk Message Deleter
  Coordinates scan/deletion between popup UI and content scripts.
*/

// State shape stored in chrome.storage.session under key 'bmd/state'
const STATE_KEY = 'bmd/state';

const defaultState = () => ({
  status: 'idle', // 'idle' | 'scanning' | 'deleting'
  site: null, // 'facebook' | 'messenger'
  filters: null,
  threads: [], // ThreadMeta[]
  selectedIds: [],
  progress: { scanned: 0, deleted: 0, totalToDelete: 0 },
  errors: [],
  dryRun: true,
});

async function getState() {
  const { [STATE_KEY]: state } = await chrome.storage.session.get(STATE_KEY);
  if (!state) {
    const fresh = defaultState();
    await chrome.storage.session.set({ [STATE_KEY]: fresh });
    return fresh;
  }
  return state;
}

async function setState(patch) {
  const current = await getState();
  const next = { ...current, ...patch };
  await chrome.storage.session.set({ [STATE_KEY]: next });
  // notify popup/content
  chrome.runtime.sendMessage({ type: 'state', payload: next }).catch(() => {});
  return next;
}

function inferSiteFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('messenger.com')) return 'messenger';
    if (u.hostname.includes('facebook.com')) return 'facebook';
  } catch (e) {
    // ignore
  }
  return null;
}

async function findTargetTab() {
  // Prefer active tab on messenger/facebook
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    const site = inferSiteFromUrl(tabs[0].url || '');
    if (site) return { tab: tabs[0], site };
  }
  // Otherwise pick any tab with those hosts
  const candidates = await chrome.tabs.query({ url: ['https://*.messenger.com/*', 'https://*.facebook.com/*'] });
  if (candidates && candidates[0]) {
    return { tab: candidates[0], site: inferSiteFromUrl(candidates[0].url || '') };
  }
  return null;
}

function applyFilters(threads, filters) {
  if (!filters) return threads;
  const {
    fromDate, toDate, unreadOnly, includeParticipants, excludeParticipants,
    keywords, groupOnly, oneToOneOnly, minSize, maxSize,
  } = filters;

  const includeSet = new Set((includeParticipants || []).map((s) => s.toLowerCase().trim()).filter(Boolean));
  const excludeSet = new Set((excludeParticipants || []).map((s) => s.toLowerCase().trim()).filter(Boolean));
  const keywordList = (keywords || []).map((s) => s.toLowerCase()).filter(Boolean);
  const fromTs = fromDate ? Date.parse(fromDate) : null;
  const toTs = toDate ? Date.parse(toDate) : null;

  return threads.filter((t) => {
    if (unreadOnly && !t.unread) return false;
    if (groupOnly && !t.isGroup) return false;
    if (oneToOneOnly && t.isGroup) return false;

    if (includeSet.size) {
      const names = t.participants.map((p) => p.toLowerCase());
      const ok = Array.from(includeSet).every((inc) => names.some((n) => n.includes(inc)));
      if (!ok) return false;
    }
    if (excludeSet.size) {
      const names = t.participants.map((p) => p.toLowerCase());
      const bad = Array.from(excludeSet).some((exc) => names.some((n) => n.includes(exc)));
      if (bad) return false;
    }

    if (keywordList.length) {
      const hay = `${(t.lastSnippet || '').toLowerCase()} ${(t.participants || []).join(' ').toLowerCase()}`;
      const has = keywordList.every((k) => hay.includes(k));
      if (!has) return false;
    }

    if ((fromTs && (t.lastActivityTs || 0) < fromTs) || (toTs && (t.lastActivityTs || 0) > toTs)) {
      return false;
    }

    if (typeof minSize === 'number' && t.sizeEstimate != null && t.sizeEstimate < minSize) return false;
    if (typeof maxSize === 'number' && t.sizeEstimate != null && t.sizeEstimate > maxSize) return false;

    return true;
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'getState') {
      sendResponse({ ok: true, state: await getState() });
      return;
    }

    if (msg?.type === 'reset') {
      await setState(defaultState());
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'startScan') {
      const { filters } = msg.payload || {};
      const target = await findTargetTab();
      if (!target) {
        const updated = await setState({ status: 'idle', errors: ['Open messenger.com or facebook.com in a tab to scan.'] });
        sendResponse({ ok: false, error: 'No target tab found', state: updated });
        return;
      }
      const site = target.site;
      await setState({ status: 'scanning', site, filters, threads: [], progress: { scanned: 0, deleted: 0, totalToDelete: 0 } });
      chrome.tabs.sendMessage(target.tab.id, { type: 'scanStart', payload: { filters } });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'stopScan') {
      const target = await findTargetTab();
      if (target) chrome.tabs.sendMessage(target.tab.id, { type: 'scanStop' });
      await setState({ status: 'idle' });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'deleteSelected') {
      const { dryRun = true, batchSize = 1 } = msg.payload || {};
      const state = await getState();
      const selectedIds = state.selectedIds || [];
      if (!selectedIds.length) {
        sendResponse({ ok: false, error: 'No selected threads to delete' });
        return;
      }
      const target = await findTargetTab();
      if (!target) {
        sendResponse({ ok: false, error: 'No target tab' });
        return;
      }
      await setState({ status: 'deleting', dryRun, progress: { ...state.progress, totalToDelete: selectedIds.length } });
      chrome.tabs.sendMessage(target.tab.id, { type: 'deleteStart', payload: { ids: selectedIds, dryRun, batchSize } });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'applyFilters') {
      const state = await getState();
      const filters = msg.payload?.filters ?? state.filters;
      const filtered = applyFilters(state.threads || [], filters || {});
      const selectedIds = filtered.map((t) => t.id);
      await setState({ filters, selectedIds });
      sendResponse({ ok: true, selectedCount: selectedIds.length });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message type' });
  })();
  return true; // keep channel open for async
});

// Handle content script progress
chrome.runtime.onMessage.addListener((msg, sender) => {
  (async () => {
    if (msg?.type === 'scanProgress') {
      const state = await getState();
      const incoming = msg.payload?.threads || [];
      const byId = new Map((state.threads || []).map((t) => [t.id, t]));
      incoming.forEach((t) => {
        const existing = byId.get(t.id);
        byId.set(t.id, { ...(existing || {}), ...t });
      });
      const threads = Array.from(byId.values());
      const progress = { ...state.progress, scanned: threads.length };
      await setState({ threads, progress });
      return;
    }

    if (msg?.type === 'scanComplete') {
      const state = await getState();
      const filtered = applyFilters(state.threads || [], state.filters || {});
      const selectedIds = filtered.map((t) => t.id);
      await setState({ status: 'idle', selectedIds });
      return;
    }

    if (msg?.type === 'deleteProgress') {
      const state = await getState();
      const { id, ok, error } = msg.payload || {};
      const deleted = state.progress.deleted + (ok ? 1 : 0);
      const errors = ok ? state.errors : [...(state.errors || []), `${id}: ${error || 'Unknown error'}`];
      await setState({ progress: { ...state.progress, deleted }, errors });
      return;
    }

    if (msg?.type === 'deleteComplete') {
      await setState({ status: 'idle' });
    }
  })();
});
