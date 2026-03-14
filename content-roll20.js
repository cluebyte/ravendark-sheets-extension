/**
 * Roll20 content script: receives "sendToChat" messages and posts the formula
 * to the Roll20 chat input. Uses the same selectors as rc-sheets-extension:
 * - Chat input: textarea[title="Text Chat Input"]
 * - Send button: #chatSendBtn
 * - Dispatch 'input' event so Roll20's UI updates.
 */
function sendMessageToChat(text) {
  const chatInput = document.querySelector('textarea[title="Text Chat Input"]');
  if (!chatInput) {
    console.warn('RavenDark→Roll20: Chat input not found');
    return false;
  }
  chatInput.value = text;
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));

  const sendBtn = document.querySelector('#chatSendBtn');
  if (sendBtn) {
    sendBtn.click();
    return true;
  }
  console.warn('RavenDark→Roll20: Send button (#chatSendBtn) not found');
  return false;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'sendToChat' || typeof msg.formula !== 'string') {
    return false;
  }
  const success = sendMessageToChat(msg.formula);
  sendResponse({ success });
  return false;
});
