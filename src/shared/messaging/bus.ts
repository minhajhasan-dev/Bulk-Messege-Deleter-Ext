import type { AnyIncomingMessage, AnyOutgoingMessage, MessageHandler } from './types';

export function sendMessage<T = unknown>(message: AnyOutgoingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(err);
          return;
        }
        resolve(response as T);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function onMessage(handler: MessageHandler): () => void {
  const listener = (msg: AnyIncomingMessage, sender: chrome.runtime.MessageSender) => {
    // Fire and forget; errors should be handled in handler
    Promise.resolve(handler(msg, sender)).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('onMessage handler error', err);
    });
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => chrome.runtime.onMessage.removeListener(listener);
}
