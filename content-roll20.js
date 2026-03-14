/**
 * Roll20 content script: receives "sendToChat" messages and posts the formula
 * to the Roll20 chat input. Tries multiple selectors; searches main doc and same-origin iframes.
 */
function getDocuments() {
  const docs = [document];
  try {
    const frames = document.querySelectorAll('iframe');
    for (const f of frames) {
      try {
        if (f.contentDocument) docs.push(f.contentDocument);
      } catch (_) {}
    }
  } catch (_) {}
  return docs;
}

function findChatInput() {
  const selectors = [
    'textarea[title="Text Chat Input"]',
    '[title="Text Chat Input"]',
    '.ui-autocomplete-input[title="Text Chat Input"]',
    '#textchat-input textarea',
    '#textchat-input [title="Text Chat Input"]',
    '[id*="textchat"] textarea',
    'textarea[placeholder*="Chat"]',
    'textarea[placeholder*="Message"]',
  ];
  for (const doc of getDocuments()) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
  }
  for (const doc of getDocuments()) {
    const sendBtn = doc.getElementById('chatSendBtn');
    if (sendBtn) {
      const container = sendBtn.closest('form') || sendBtn.parentElement;
      if (container) {
        const textarea = container.querySelector('textarea, [title="Text Chat Input"], [role="textbox"]');
        if (textarea) return textarea;
      }
    }
  }
  return null;
}

function findSendButton() {
  const selectors = [
    '#chatSendBtn',
    '#textchat-input button[type="submit"]',
    '#textchat-input .btn',
    '[id*="textchat"] button[type="submit"]',
    'button[aria-label*="Send"]',
    'button[title*="Send"]',
  ];
  for (const doc of getDocuments()) {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
  }
  return null;
}

function sendMessageToChat(text) {
  const chatInput = findChatInput();
  if (!chatInput) {
    const err = 'Chat input not found. Open Roll20, focus the chat box, then try again. (If the game just loaded, wait a moment.)';
    console.debug('[RavenDark→Roll20] Roll20:', err);
    return { success: false, error: err };
  }
  chatInput.value = text;
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));

  const sendBtn = findSendButton();
  if (!sendBtn) {
    const err = 'Send button not found. Make sure the chat panel is visible on the Roll20 page.';
    console.debug('[RavenDark→Roll20] Roll20:', err);
    return { success: false, error: err };
  }
  sendBtn.click();
  console.debug('[RavenDark→Roll20] Roll20: Sent to chat:', text);
  return { success: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'sendToChat' || typeof msg.formula !== 'string') {
    return false;
  }
  console.debug('[RavenDark→Roll20] Roll20: Received sendToChat, formula:', msg.formula);
  const result = sendMessageToChat(msg.formula);
  sendResponse(result);
  return false;
});
