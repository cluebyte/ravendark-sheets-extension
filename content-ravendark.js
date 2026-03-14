/**
 * RavenDark character sheet content script: injects a placeholder "Roll" button
 * and sends the roll formula to the background (which relays to Roll20).
 * Skeleton uses a hardcoded formula; later can use [data-roll-formula] or DOM selectors.
 */
(function () {
  const UUID_REGEX = /^\/characters\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const path = window.location.pathname;
  if (!UUID_REGEX.test(path)) {
    return;
  }

  const PLACEHOLDER_FORMULA = '/roll 1d20 + 5';

  function injectRollButton() {
    const root = document.getElementById('root') || document.querySelector('main') || document.body;
    if (!root) return;

    const existing = document.getElementById('ravendark-roll-toolbar');
    if (existing) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'ravendark-roll-toolbar';
    toolbar.className = 'ravendark-roll-toolbar';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ravendark-roll-btn';
    btn.textContent = 'Roll';
    btn.dataset.formula = PLACEHOLDER_FORMULA;

    btn.addEventListener('click', function () {
      const formula = btn.dataset.formula || PLACEHOLDER_FORMULA;
      chrome.runtime.sendMessage(
        { action: 'postToRoll20', formula },
        function (response) {
          if (chrome.runtime.lastError) {
            console.warn('RavenDark→Roll20:', chrome.runtime.lastError.message);
            return;
          }
          if (response && !response.success) {
            console.warn('RavenDark→Roll20:', response.error || 'Failed to send');
          }
        }
      );
    });

    toolbar.appendChild(btn);
    root.insertBefore(toolbar, root.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRollButton);
  } else {
    injectRollButton();
  }

  // Re-inject if DOM is replaced (e.g. SPA navigation)
  const observer = new MutationObserver(function () {
    if (!document.getElementById('ravendark-roll-toolbar')) {
      injectRollButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
