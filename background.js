/**
 * URL path substrings that indicate a Roll20 tab is NOT the main game table (no chat).
 * Tabs whose url contains any of these are excluded when choosing where to send rolls.
 */
const ROLL20_MAIN_TAB_EXCLUSIONS = [
  '/editor/character/',  // character sheet popout
  '/journal/',           // journal / handout window
];

function isMainGameTab(url) {
  if (!url || !url.startsWith('https://app.roll20.net/')) return false;
  return !ROLL20_MAIN_TAB_EXCLUSIONS.some((pattern) => url.includes(pattern));
}

/**
 * Run in each frame of the Roll20 tab to find chat and send. Used when the content
 * script (main frame) can't find the chat because it lives in an iframe.
 */
function sendToChatInFrame(formula) {
  const input =
    document.querySelector('textarea[title="Text Chat Input"]') ||
    document.querySelector('[title="Text Chat Input"]');
  if (!input) return { success: false, error: 'Chat input not found' };
  input.value = formula;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const btn = document.querySelector('#chatSendBtn');
  if (!btn) return { success: false, error: 'Send button not found' };
  btn.click();
  return { success: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'postToRoll20' || typeof msg.formula !== 'string') {
    return false;
  }

  (async () => {
    try {
      let tabs = await chrome.tabs.query({ url: 'https://app.roll20.net/*' });
      if (tabs.length === 0) {
        const allTabs = await chrome.tabs.query({});
        const roll20Tabs = allTabs.filter((t) => t.url && t.url.includes('roll20'));
        console.log('[RavenDark→Roll20] Background: No tabs matched https://app.roll20.net/*. All tabs with "roll20" in URL:', roll20Tabs.length, roll20Tabs.map((t) => ({ id: t.id, url: t.url, title: t.title })));
      } else {
        console.log('[RavenDark→Roll20] Background: Roll20 tabs found:', tabs.length);
        tabs.forEach((t, i) => {
          console.log('[RavenDark→Roll20] Background: Tab', i, '| id:', t.id, '| url:', t.url, '| title:', t.title || '(no title)');
        });
      }
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No Roll20 tab open. Open a Roll20 game in another tab.' });
        return;
      }
      // Prefer the main game table (has chat); exclude character sheets, journals, etc.
      const mainTab = tabs.find((t) => isMainGameTab(t.url));
      const tab = mainTab || tabs[0];
      const tabId = tab.id;
      const tabUrl = tab.url;
      console.log('[RavenDark→Roll20] Background: Using tab id', tabId, '| url:', tabUrl);
      let response;

      try {
        console.log('[RavenDark→Roll20] Background: Sending message to tab', tabId, 'formula:', msg.formula);
        response = await chrome.tabs.sendMessage(tabId, {
          action: 'sendToChat',
          formula: msg.formula,
        });
      } catch (sendErr) {
        const errMsg = sendErr?.message || '';
        if (errMsg.includes('Receiving end does not exist') || errMsg.includes('Could not establish connection')) {
          console.log('[RavenDark→Roll20] Background: Content script not in tab', tabId, '- injecting and retrying');
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['content-roll20.js'],
            });
            await new Promise((r) => setTimeout(r, 150));
            response = await chrome.tabs.sendMessage(tabId, {
              action: 'sendToChat',
              formula: msg.formula,
            });
          } catch (injectErr) {
            console.error('[RavenDark→Roll20] Background: Inject/retry failed:', injectErr);
            sendResponse({
              success: false,
              error: 'Roll20 tab found but extension could not connect. Refresh the Roll20 tab (F5), then try again.',
            });
            return;
          }
        } else {
          throw sendErr;
        }
      }

      if (response && !response.success && response.error && response.error.includes('Chat input not found')) {
        console.log('[RavenDark→Roll20] Background: Chat not in main frame, trying all frames');
        const results = await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          func: sendToChatInFrame,
          args: [msg.formula],
        });
        const firstSuccess = results?.find((r) => r.result && r.result.success);
        const firstError = results?.find((r) => r.result && !r.result.success);
        response = firstSuccess ? firstSuccess.result : firstError ? firstError.result : response;
      }

      console.log('[RavenDark→Roll20] Background: Roll20 response:', response);
      sendResponse(response != null ? response : { success: true });
    } catch (err) {
      console.error('[RavenDark→Roll20] Background: Error:', err);
      sendResponse({ success: false, error: err?.message || 'Failed to send to Roll20' });
    }
  })();

  return true; // keep channel open for async sendResponse
});
