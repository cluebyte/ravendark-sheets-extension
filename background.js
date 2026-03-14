/**
 * Background service worker: relays "postToRoll20" from RavenDark content script
 * to the Roll20 tab's content script (sendToChat).
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'postToRoll20' || typeof msg.formula !== 'string') {
    return false;
  }

  (async () => {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://app.roll20.net/editor/*' });
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No Roll20 tab open' });
        return;
      }
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'sendToChat',
        formula: msg.formula,
      });
      sendResponse(response != null ? response : { success: true });
    } catch (err) {
      console.error('Background: Error sending to Roll20:', err);
      sendResponse({ success: false, error: err?.message || 'Failed to send to Roll20' });
    }
  })();

  return true; // keep channel open for async sendResponse
});
