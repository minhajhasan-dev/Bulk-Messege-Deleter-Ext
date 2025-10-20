/* Safe wrapper around chrome.runtime APIs with optional dev shim for localhost.
 * - isExtensionEnv: detect if running inside a Chrome extension
 * - onMessageAdd / onMessageRemove: safe listener registration
 * - sendMessage: safe messaging (no-op outside extension unless dev shim enabled)
 * - connect: safe runtime.connect
 */

// Lightweight internal event emitter for the dev shim
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (message: any, sender?: unknown, sendResponse?: (response?: unknown) => void) => void;

const listeners = new Set<Listener>();
let devShimBootstrapped = false;

function getImportMetaEnv(): Record<string, unknown> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((import.meta as any) && (import.meta as any).env) || {};
  } catch {
    return {};
  }
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, protocol } = window.location;
  return (
    (protocol === 'http:' || protocol === 'https:') &&
    (/^(localhost|127\.0\.0\.1)$/i.test(hostname) || hostname.endsWith('.localhost'))
  );
}

export function isExtensionEnv(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any).chrome;
    return !!(c && c.runtime && (c.runtime.id || typeof c.runtime.sendMessage === 'function'));
  } catch {
    return false;
  }
}

function isDevShimEnabled(): boolean {
  const env = getImportMetaEnv();
  const flag = String(env.VITE_DEV_SHIM || '').toLowerCase();
  return !isExtensionEnv() && isLocalhost() && (flag === 'true' || flag === '1' || flag === 'yes');
}

export const devShimActive = isDevShimEnabled();

function bootstrapDevShimIfNeeded() {
  if (!devShimActive || devShimBootstrapped) return;
  devShimBootstrapped = true;

  // Send a small initial state message so the UI can render meaningful information in dev
  // after someone attaches a listener.
  setTimeout(() => {
    const payload = {
      site: 'localhost',
      status: 'idle',
      selectedIds: [],
      progress: { scanned: 0, deleted: 0, totalToDelete: 0 },
      threads: [],
      errors: [],
    };
    dispatchShimMessage({ type: 'state', payload });
  }, 50);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dispatchShimMessage(message: any) {
  listeners.forEach((l) => {
    try {
      l(message);
    } catch {
      // ignore listener errors in shim
    }
  });
}

export function onMessageAdd(cb: Listener): void {
  if (isExtensionEnv()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome.runtime.onMessage.addListener(cb);
    return;
  }
  if (devShimActive) {
    bootstrapDevShimIfNeeded();
    listeners.add(cb);
  }
}

export function onMessageRemove(cb: Listener): void {
  if (isExtensionEnv()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome.runtime.onMessage.removeListener(cb);
    return;
  }
  if (devShimActive) listeners.delete(cb);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendMessage(message: any): Promise<unknown> {
  if (isExtensionEnv()) {
    return new Promise((resolve) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).chrome.runtime.sendMessage(message, (resp: any) => {
          resolve(resp);
        });
      } catch (e) {
        resolve({ ok: false, error: String((e as Error).message || e) });
      }
    });
  }
  if (devShimActive) {
    // In the dev shim, just loop messages back to listeners and return a canned response for known types
    setTimeout(() => dispatchShimMessage(message), 0);
    if (message?.type === 'getState') {
      return { ok: true, state: { site: 'localhost', progress: {}, status: 'idle', threads: [], selectedIds: [], errors: [] } };
    }
    return { ok: true, echo: message };
  }
  return { ok: false, error: 'Not in extension environment' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function connect(name?: string): unknown {
  if (isExtensionEnv()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).chrome.runtime.connect(name ? { name } : undefined);
  }
  if (!devShimActive) return null;

  // Minimal Port-like shim
  const portListeners = new Set<(msg: unknown) => void>();
  const disconnectListeners = new Set<() => void>();

  const port = {
    name: name || 'dev-shim',
    onMessage: {
      addListener(fn: (msg: unknown) => void) {
        portListeners.add(fn);
      },
      removeListener(fn: (msg: unknown) => void) {
        portListeners.delete(fn);
      },
    },
    onDisconnect: {
      addListener(fn: () => void) {
        disconnectListeners.add(fn);
      },
      removeListener(fn: () => void) {
        disconnectListeners.delete(fn);
      },
    },
    postMessage(msg: unknown) {
      setTimeout(() => {
        portListeners.forEach((l) => l({ echo: msg }));
      }, 0);
    },
    disconnect() {
      disconnectListeners.forEach((l) => l());
      portListeners.clear();
      disconnectListeners.clear();
    },
  } as const;

  return port;
}
