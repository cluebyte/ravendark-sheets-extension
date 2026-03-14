/**
 * RavenDark character sheet content script: injects "Roll" buttons next to
 * elements with data-roll-type (ability, attack, damage, spellcasting, spell-damage)
 * and sends the computed formula to Roll20 via the background.
 */
(function () {
  const UUID_REGEX = /^\/characters\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const path = window.location.pathname;
  if (!UUID_REGEX.test(path)) {
    return;
  }

  const ROLL_BTN_CLASS = 'ravendark-roll-btn';
  const ROLL_BTN_MARKER = 'data-ravendark-roll-injected';

  /**
   * Parse displayed modifier from element text (e.g. "1d20 +2" or "+2"). Returns null if not found.
   */
  function parseDisplayedModifier(el) {
    const text = (el && el.textContent) ? el.textContent : '';
    const match = text.match(/1d20\s*([+-]\s*\d+)|([+-]\s*\d+)(?:\s|$)/);
    if (match) {
      const token = (match[1] || match[2] || '').replace(/\s/g, '');
      const n = parseInt(token, 10);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  /**
   * Build Roll20 /roll command from an element's data-roll-type and dataset.
   * Matches attributes from ravenloft-sheets: CombatBonusesSummary and CharacterStatBlock.
   */
  function formulaFromElement(el) {
    const type = el.getAttribute('data-roll-type');
    const ds = el.dataset;
    if (!type) return null;

    switch (type) {
      case 'ability': {
        const mod = ds.modifier != null ? parseInt(ds.modifier, 10) : 0;
        if (Number.isNaN(mod)) return null;
        const sign = mod >= 0 ? '+' : '';
        return `/roll 1d20 ${sign}${mod}`;
      }
      case 'attack': {
        const statMod = parseInt(ds.statModifier, 10);
        const attackBonus = parseInt(ds.attackBonus, 10);
        const s = (n) => (Number.isNaN(n) ? 0 : n);
        const stat = s(statMod);
        const bonus = s(attackBonus);
        const sign1 = stat >= 0 ? '+' : '';
        const sign2 = bonus >= 0 ? '+' : '';
        return `/roll 1d20 ${sign1}${stat} ${sign2}${bonus}`;
      }
      case 'spellcasting': {
        const statMod = ds.statModifier != null ? parseInt(ds.statModifier, 10) : null;
        const spellBonus = ds.spellCheckBonus != null ? parseInt(ds.spellCheckBonus, 10) : null;
        const useSplit = statMod != null && spellBonus != null && !Number.isNaN(statMod) && !Number.isNaN(spellBonus) && (statMod !== 0 || spellBonus !== 0);
        if (useSplit) {
          const s1 = statMod >= 0 ? '+' : '';
          const s2 = spellBonus >= 0 ? '+' : '';
          return `/roll 1d20 ${s1}${statMod} ${s2}${spellBonus}`;
        }
        let mod = ds.modifier != null ? parseInt(ds.modifier, 10) : 0;
        if (Number.isNaN(mod)) mod = 0;
        if (mod === 0) {
          const displayed = parseDisplayedModifier(el);
          if (displayed !== null) mod = displayed;
        }
        const sign = mod >= 0 ? '+' : '';
        return `/roll 1d20 ${sign}${mod}`;
      }
      case 'damage': {
        const formula = (ds.formula || '').trim();
        if (!formula) return null;
        return `/roll ${formula}`;
      }
      case 'spell-damage': {
        const bonus = ds.bonus != null ? parseInt(ds.bonus, 10) : 0;
        if (Number.isNaN(bonus)) return null;
        const sign = bonus >= 0 ? '+' : '';
        return `/roll 1d6 ${sign}${bonus}`;
      }
      default:
        return null;
    }
  }

  function sendToRoll20(formula) {
    try {
      chrome.runtime.sendMessage(
        { action: 'postToRoll20', formula },
        function (response) {
          if (chrome.runtime.lastError) {
            console.warn('[RavenDark→Roll20] sendMessage error:', chrome.runtime.lastError.message);
            return;
          }
        if (response && !response.success) {
          console.warn('[RavenDark→Roll20] Roll20 reported:', response.error || 'Failed to send');
        } else if (response && response.success) {
          console.log('[RavenDark→Roll20] Sent to Roll20 OK');
        }
        }
      );
    } catch (err) {
      const msg = err && err.message ? String(err.message) : '';
      if (msg.includes('Extension context invalidated') || msg.includes('invalidated')) {
        console.warn('[RavenDark→Roll20] Extension was reloaded or updated. Refresh this character sheet page (F5) and try again.');
      } else {
        throw err;
      }
    }
  }

  function injectButtonInto(el) {
    if (el.getAttribute(ROLL_BTN_MARKER) === 'true') return;
    if (!formulaFromElement(el)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = ROLL_BTN_CLASS;
    btn.textContent = 'Roll';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const container = btn.closest('[data-roll-type]');
      const formula = container ? formulaFromElement(container) : null;
      if (!formula) {
        console.warn('[RavenDark→Roll20] Could not get formula from container');
        return;
      }
      console.log('[RavenDark→Roll20] Roll clicked, formula:', formula);
      sendToRoll20(formula);
    });

    el.setAttribute(ROLL_BTN_MARKER, 'true');
    const isAbility = el.getAttribute('data-roll-type') === 'ability';
    if (isAbility) {
      const row = document.createElement('div');
      row.className = 'ravendark-roll-row';
      row.appendChild(btn);
      el.appendChild(row);
    } else {
      el.appendChild(btn);
    }
  }

  function scanAndInject() {
    const roots = document.querySelectorAll('#root, main');
    const root = roots.length > 0 ? roots[0] : document.body;
    const rollables = root.querySelectorAll('[data-roll-type]');
    rollables.forEach(injectButtonInto);
  }

  function run() {
    scanAndInject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Re-scan when DOM changes (SPA / React re-renders, e.g. expanding Combat Panel)
  const observer = new MutationObserver(function () {
    scanAndInject();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
