/*
  Messenger scanner content script placeholder.
*/
import { sendMessage } from '@/shared/messaging/bus';

(async function init() {
  try {
    await sendMessage({ type: 'PING', payload: { time: Date.now() } });
    // eslint-disable-next-line no-console
    console.log('[msgr:scanner] initialized');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[msgr:scanner] failed to initialize', e);
  }
})();
