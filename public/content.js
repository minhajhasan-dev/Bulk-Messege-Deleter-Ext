/* global chrome */
/* Content script for Bulk Message Deleter
 - Scans Messenger/Facebook conversation list using MutationObserver and scrolling
 - Computes metadata and sends progress to background
 - Performs guarded deletion automation with retries/backoff
*/

(function () {
  const STATE = {
    scanning: false,
    deleting: false,
  };

  // Overlay/toasts
  function ensureOverlay() {
    if (document.getElementById('bmd-overlay-root')) return;
    const root = document.createElement('div');
    root.id = 'bmd-overlay-root';
    const cssUrl = chrome.runtime.getURL('overlay.css');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.documentElement.appendChild(link);
    document.documentElement.appendChild(root);
  }

  function toast(msg, type = 'info', timeout = 2500) {
    ensureOverlay();
    const root = document.getElementById('bmd-overlay-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `bmd-toast ${type}`;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, timeout);
  }

  // Utils
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const nowTs = () => Date.now();

  function visible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).display !== 'none';
  }

  async function waitForSelector(selector, { timeout = 10000, root = document } = {}) {
    const start = nowTs();
    while (nowTs() - start < timeout) {
      const el = root.querySelector(selector);
      if (el) return el;
      await sleep(100);
    }
    return null;
  }

  async function retry(fn, { tries = 3, baseDelay = 400, factor = 2, jitter = 0.25 } = {}) {
    let lastErr;
    for (let i = 0; i < tries; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await fn(i);
      } catch (e) {
        lastErr = e;
        const delay = Math.round(baseDelay * (factor ** i) * (1 + (Math.random() * jitter)));
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
      }
    }
    throw lastErr || new Error('retry: failed');
  }

  function text(el) {
    return (el?.textContent || '').trim();
  }

  function parseThreadIdFromHref(href = '') {
    try {
      const u = new URL(href, location.origin);
      // messenger.com/t/<id>
      const tMatch = u.pathname.match(/\/t\/([^/?#]+)/);
      if (tMatch) return tMatch[1];
      // facebook.com/messages/t/<id>
      const fMatch = u.pathname.match(/\/messages\/t\/([^/?#]+)/);
      if (fMatch) return fMatch[1];
      // sometimes ref param holds id
      const ref = u.searchParams.get('thread_id') || u.searchParams.get('tid');
      if (ref) return ref;
    } catch (e) {
      // ignore
    }
    return null;
  }

  function detectSite() {
    const host = location.hostname;
    if (host.includes('messenger.com')) return 'messenger';
    if (host.includes('facebook.com')) return 'facebook';
    return 'unknown';
  }

  function parseLastActivityTs(container) {
    // Look for time/datetime or relative time text
    const timeEl = container.querySelector('time, abbr[title], span[title]');
    if (timeEl) {
      const dt = timeEl.getAttribute('datetime') || timeEl.getAttribute('title');
      if (dt) {
        const ts = Date.parse(dt);
        if (!Number.isNaN(ts)) return ts;
      }
    }
    // Fallback: search for patterns like "h", "m", "d" near the item
    const txt = text(container);
    const rel = /\b(\d{1,2})\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks|y|year|years)\b/i.exec(txt);
    if (rel) {
      const num = parseInt(rel[1], 10);
      const unit = rel[2].toLowerCase();
      const ms = unit.startsWith('m') ? num * 60 * 1000
        : unit.startsWith('h') ? num * 60 * 60 * 1000
          : unit.startsWith('d') ? num * 24 * 60 * 60 * 1000
            : unit.startsWith('w') ? num * 7 * 24 * 60 * 60 * 1000
              : num * 365 * 24 * 60 * 60 * 1000;
      return Date.now() - ms;
    }
    return null;
  }

  function parseParticipants(container) {
    // Heuristic: first line of text or aria-label may contain names
    const labelled = container.getAttribute('aria-label') || '';
    const candidates = [];
    if (labelled) candidates.push(labelled);
    const nameEl = container.querySelector('h1, h2, h3, strong');
    if (nameEl) candidates.push(text(nameEl));
    const lines = text(container).split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines[0]) candidates.push(lines[0]);
    const raw = candidates.find((s) => s && /[,•]| and /.test(s)) || candidates[0] || '';
    const parts = raw.split(/,|•| and /i).map((s) => s.trim()).filter(Boolean);
    // Remove common words
    const cleaned = parts.map((p) => p.replace(/^you:?\s*/i, 'You')).filter(Boolean);
    return cleaned.length ? cleaned : (lines[0] ? [lines[0]] : []);
  }

  function isGroupFromParticipants(participants) {
    const uniq = Array.from(new Set(participants.map((p) => p.toLowerCase())));
    return uniq.length > 2; // 3+ names => group
  }

  function detectUnread(container) {
    if (!container) return false;
    if (/unread/i.test(container.getAttribute('aria-label') || '')) return true;
    const badge = container.querySelector('[aria-label*="unread" i], [aria-label*="Unread" i]');
    if (badge) return true;
    // Bold text heuristic
    const strong = container.querySelector('strong, b');
    if (strong) return true;
    return false;
  }

  function detectAttachments(container) {
    const txt = text(container).toLowerCase();
    return /(photo|video|file|attachment)/i.test(txt);
  }

  function extractSnippet(container) {
    // Try to find preview line: often the second line
    const divs = Array.from(container.querySelectorAll('div, span')).map((d) => text(d)).filter(Boolean);
    if (divs.length > 1) return divs[1];
    return divs[0] || text(container).slice(0, 140);
  }

  function buildThreadMetaFromEntry(aEl) {
    const container = aEl.closest('[role="row"], li, [role="listitem"], div');
    const id = parseThreadIdFromHref(aEl.getAttribute('href') || '') || text(aEl).slice(0, 80);
    const participants = parseParticipants(container || aEl);
    const lastActivityTs = parseLastActivityTs(container || aEl);
    const unread = detectUnread(container || aEl);
    const lastSnippet = extractSnippet(container || aEl);
    const isGroup = isGroupFromParticipants(participants);
    const hasAttachments = detectAttachments(container || aEl);
    const source = detectSite();

    return {
      id,
      url: aEl.href || aEl.getAttribute('href'),
      participants,
      isGroup,
      unread,
      lastActivityTs,
      lastSnippet,
      sizeEstimate: null, // optional later
      hasAttachments,
      source,
    };
  }

  function getScrollContainer() {
    // Try to find the left column conversation list scroll area
    const candidates = [
      document.querySelector('[role="navigation"] [role="grid"]'),
      document.querySelector('[role="navigation"]'),
      document.querySelector('aside [role="grid"]'),
      document.querySelector('aside'),
      document.querySelector('[data-pagelet*="Messages"]'),
    ].filter(Boolean);
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY)) return el;
    }
    return document.scrollingElement || document.documentElement;
  }

  async function incrementalScrollCollect(onItem) {
    const seen = new Set();
    const observer = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          const anchors = n.matches('a') ? [n] : Array.from(n.querySelectorAll('a'));
          anchors.forEach((a) => {
            const href = a.getAttribute('href') || '';
            if (/\/t\//.test(href) || /\/messages\/t\//.test(href)) {
              const id = parseThreadIdFromHref(href);
              if (id && !seen.has(id)) {
                seen.add(id);
                onItem(a);
              }
            }
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Seed with current items
    Array.from(document.querySelectorAll('a[href*="/t/"], a[href*="/messages/t/"]')).forEach((a) => {
      const id = parseThreadIdFromHref(a.getAttribute('href') || '');
      if (id && !seen.has(id)) {
        seen.add(id);
        onItem(a);
      }
    });

    const scrollEl = getScrollContainer();
    let stablePasses = 0;
    let lastCount = seen.size;
    for (let i = 0; i < 100 && STATE.scanning; i += 1) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
      // eslint-disable-next-line no-await-in-loop
      await sleep(700);
      const nowCount = seen.size;
      if (nowCount === lastCount) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
      }
      lastCount = nowCount;
      if (stablePasses >= 3) break; // no new items after a few passes
    }

    observer.disconnect();
  }

  async function startScan(filters) {
    if (STATE.scanning) return;
    STATE.scanning = true;
    toast('Scanning conversations...', 'info');

    const buffer = [];
    const flush = () => {
      if (!buffer.length) return;
      chrome.runtime.sendMessage({ type: 'scanProgress', payload: { threads: buffer.splice(0, buffer.length) } }).catch(() => {});
    };

    const onItem = (a) => {
      try {
        const meta = buildThreadMetaFromEntry(a);
        buffer.push(meta);
        if (buffer.length >= 15) flush();
      } catch (e) {
        // ignore individual parse errors
      }
    };

    await incrementalScrollCollect(onItem);
    flush();

    STATE.scanning = false;
    chrome.runtime.sendMessage({ type: 'scanComplete' }).catch(() => {});
    toast('Scan complete', 'success');
  }

  function stopScan() {
    STATE.scanning = false;
  }

  // Deletion engine
  function findThreadAnchorById(id) {
    const anchors = Array.from(document.querySelectorAll('a[href*="/t/"], a[href*="/messages/t/"]'));
    return anchors.find((a) => parseThreadIdFromHref(a.getAttribute('href') || '') === id) || null;
  }

  function queryAllVisible(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(visible);
  }

  function findElementByText(selectors, matcher) {
    const sel = Array.isArray(selectors) ? selectors.join(',') : selectors;
    const els = queryAllVisible(sel);
    for (const el of els) {
      const t = text(el);
      if (typeof matcher === 'string') {
        if (t.toLowerCase().includes(matcher.toLowerCase())) return el;
      } else if (matcher.test(t)) return el;
    }
    return null;
  }

  async function openThread(id) {
    let anchor = findThreadAnchorById(id);
    if (!anchor) {
      // try to scroll to load more
      const scrollEl = getScrollContainer();
      for (let i = 0; i < 20 && !anchor; i += 1) {
        scrollEl.scrollTo({ top: 0 }); // try top first
        // eslint-disable-next-line no-await-in-loop
        await sleep(200);
        anchor = findThreadAnchorById(id);
        if (anchor) break;
        scrollEl.scrollTo({ top: scrollEl.scrollHeight });
        // eslint-disable-next-line no-await-in-loop
        await sleep(600);
        anchor = findThreadAnchorById(id);
      }
    }
    if (!anchor) throw new Error('Thread not found in list');
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    // Wait for main chat input to appear
    const main = await waitForSelector('[contenteditable="true"], textarea, [role="main"]');
    if (!main) throw new Error('Thread view did not load');
  }

  async function tryOpenDeleteMenu() {
    // Multiple strategies
    const candidates = [
      // Messenger header buttons
      'div[role="banner"] [aria-label*="Actions" i]',
      'div[role="banner"] [aria-label*="More" i]',
      'div[role="banner"] [aria-label*="Conversation information" i]',
      'header [aria-label*="Actions" i]',
      'header [aria-label*="More" i]',
      'header [aria-label*="Conversation information" i]',
      // Generic menu button with three dots
      'button[aria-label*="Actions" i]',
      'button[aria-label*="More" i]'
    ];

    for (const sel of candidates) {
      const btn = document.querySelector(sel);
      if (btn && visible(btn)) {
        btn.click();
        // wait for menu/panel
        // eslint-disable-next-line no-await-in-loop
        await sleep(300);
        // Did a panel or menu appear?
        const menu = document.querySelector('[role="menu"], [data-visualcompletion], [role="dialog"], [aria-modal="true"]');
        if (menu) return true;
      }
    }

    // Try keyboard shortcuts (may do nothing)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', keyCode: 46, which: 46, bubbles: true }));
    await sleep(200);
    return !!document.querySelector('[role="dialog"], [aria-modal="true"]');
  }

  async function clickDeleteInMenu() {
    // Look for a menu item or button that says Delete chat/Delete conversation
    const targets = [
      () => findElementByText(['[role="menuitem"]', 'button'], /delete chat|delete conversation|delete/i),
      () => findElementByText(['div[role="menu"] *', '[role="dialog"] button', 'button'], /delete chat|delete conversation|delete/i),
    ];
    for (const fn of targets) {
      const el = fn();
      if (el) {
        el.click();
        await sleep(300);
        return true;
      }
    }
    return false;
  }

  async function confirmDeletion() {
    const confirmBtn = findElementByText(['[role="dialog"] button', 'button'], /delete|confirm/i);
    if (!confirmBtn) return false;
    confirmBtn.click();
    await sleep(500);
    return true;
  }

  async function deleteThread(id, { dryRun }) {
    if (dryRun) {
      toast(`Dry-run: would delete thread ${id}`, 'info');
      return true;
    }
    await openThread(id);
    await retry(async () => {
      const opened = await tryOpenDeleteMenu();
      if (!opened) throw new Error('Could not open actions menu');
    }, { tries: 3, baseDelay: 500 });

    const clicked = await retry(async () => {
      const ok = await clickDeleteInMenu();
      if (!ok) throw new Error('Delete menu item not found');
      return ok;
    }, { tries: 3, baseDelay: 500 });
    if (!clicked) throw new Error('Failed to click delete');

    const confirmed = await retry(async () => {
      const ok = await confirmDeletion();
      if (!ok) throw new Error('Confirm delete button not found');
      return ok;
    }, { tries: 3, baseDelay: 700 });

    if (!confirmed) throw new Error('Failed to confirm');
    toast(`Deleted thread ${id}`, 'success');
    return true;
  }

  async function startDelete(ids, { dryRun = true, batchSize = 1 }) {
    if (STATE.deleting) return;
    STATE.deleting = true;
    toast(`${dryRun ? 'Previewing (dry-run)' : 'Deleting'} ${ids.length} thread(s)...`, 'info', 3000);
    const queue = ids.slice();
    let inFlight = 0;

    async function next() {
      if (!STATE.deleting) return;
      if (!queue.length) return;
      if (inFlight >= Math.max(1, batchSize)) return;
      const id = queue.shift();
      inFlight += 1;
      try {
        // eslint-disable-next-line no-await-in-loop
        const ok = await deleteThread(id, { dryRun });
        chrome.runtime.sendMessage({ type: 'deleteProgress', payload: { id, ok } }).catch(() => {});
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'deleteProgress', payload: { id, ok: false, error: String(e?.message || e) } }).catch(() => {});
      } finally {
        inFlight -= 1;
        next();
      }
    }

    const tick = setInterval(() => {
      if (!STATE.deleting) {
        clearInterval(tick);
        return;
      }
      next();
      if (!queue.length && inFlight === 0) {
        clearInterval(tick);
        STATE.deleting = false;
        chrome.runtime.sendMessage({ type: 'deleteComplete' }).catch(() => {});
        toast('Deletion finished', 'success');
      }
    }, 200);
  }

  // Listen to messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      if (msg?.type === 'scanStart') {
        STATE.scanning = true;
        await startScan(msg.payload?.filters || {});
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'scanStop') {
        stopScan();
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === 'deleteStart') {
        const { ids, dryRun, batchSize } = msg.payload || {};
        await startDelete(ids || [], { dryRun: !!dryRun, batchSize: batchSize || 1 });
        sendResponse({ ok: true });
        return;
      }
      // unknown command
      sendResponse({ ok: false });
    })();
    return true;
  });

  // Announce ready
  setTimeout(() => {
    toast('Bulk Message Deleter content script active', 'info', 1200);
  }, 1000);
})();
