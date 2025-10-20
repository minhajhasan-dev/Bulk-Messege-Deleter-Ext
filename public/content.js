/* global chrome */

function samplePeople() {
  return [
    { id: 'u1', name: 'Alice Johnson', lastActivityTs: Date.now() - 1000 * 60 * 10, unread: true },
    { id: 'u2', name: 'Bob Smith', lastActivityTs: Date.now() - 1000 * 60 * 60 * 5 },
    { id: 'u3', name: 'Carol Lee', lastActivityTs: Date.now() - 1000 * 60 * 60 * 24 },
  ];
}

function sampleMessages(userId) {
  const base = Date.now() - 1000 * 60 * 60 * 24 * 3;
  return [
    { id: `${userId}-m1`, author: 'me', text: 'Hello there', hasAttachment: false, timestamp: base + 1000 * 60 * 10 },
    { id: `${userId}-m2`, author: 'them', text: 'Hi!', hasAttachment: false, timestamp: base + 1000 * 60 * 12 },
    { id: `${userId}-m3`, author: 'me', text: 'Picture from yesterday', hasAttachment: true, timestamp: base + 1000 * 60 * 1400 },
  ];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'getPeople') {
    sendResponse({ ok: true, people: samplePeople() });
    return true;
  }
  if (message && message.type === 'getMessagesForUser') {
    const { userId } = message.payload || {};
    sendResponse({ ok: true, messages: sampleMessages(userId || 'u') });
    return true;
  }
  return false;
});
