import { getLicenseStatus, ensureTrialInitialized } from '@/shared/license';
import { track, initTelemetry } from '@/shared/telemetry';
import type { AnyOutgoingMessage } from '@/shared/messaging/types';

chrome.runtime.onInstalled.addListener(async () => {
  await ensureTrialInitialized();
  await initTelemetry();
});

chrome.runtime.onMessage.addListener((message: AnyOutgoingMessage, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'PING': {
        sendResponse({ ok: true, time: Date.now() });
        return;
      }
      case 'GET_LICENSE_STATUS': {
        const status = await getLicenseStatus();
        sendResponse(status);
        return;
      }
      case 'TELEMETRY_EVENT': {
        await track({ event: message.payload?.event ?? 'unknown', props: message.payload?.props });
        sendResponse({ ok: true });
        return;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown message', message);
        sendResponse({ ok: false });
        return;
      }
    }
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Background handler error', err);
    sendResponse({ ok: false, error: String(err) });
  });

  // keep channel open for async response
  return true;
});
