/*
  Facebook scanner content script placeholder.
  In production, this would scan the DOM and extract threads or other artifacts.
*/
import { sendMessage } from '@/shared/messaging/bus';

(async function init() {
  try {
    await sendMessage({ type: 'PING', payload: { time: Date.now() } });
    // eslint-disable-next-line no-console
    console.log('[fb:scanner] initialized');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[fb:scanner] failed to initialize', e);
  }
})();
