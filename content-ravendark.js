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

  /** Format modifier for inline roll: no spaces, e.g. +2 or -1 */
  function inlineMod(n) {
    const num = Number.isNaN(n) ? 0 : n;
    return num >= 0 ? `+${num}` : `${num}`;
  }

  /** Roll20 critical success (20) and critical failure (1) for d20 rolls */
  const D20_CRIT = 'cs20cf1';

  /**
   * Get d20 dice expression and label suffix from data-advantage.
   * advantage -> 2d20kh1 (keep highest), disadvantage -> 2d20kl1 (keep lowest), none -> 1d20.
   */
  function getD20AndLabel(advantage) {
    const adv = (advantage || 'none').toLowerCase();
    if (adv === 'advantage') return { dice: '2d20kh1', suffix: ' (Advantage)' };
    if (adv === 'disadvantage') return { dice: '2d20kl1', suffix: ' (Disadvantage)' };
    return { dice: '1d20', suffix: '' };
  }

  /**
   * Build Roll20 message from an element's data-roll-type and dataset.
   * Uses &{template:default} for styled output; falls back to /roll if template would be empty.
   */
  function formulaFromElement(el) {
    const type = el.getAttribute('data-roll-type');
    const ds = el.dataset;
    if (!type) return null;

    switch (type) {
      case 'ability': {
        const mod = ds.modifier != null ? parseInt(ds.modifier, 10) : 0;
        if (Number.isNaN(mod)) return null;
        const { dice, suffix } = getD20AndLabel(ds.advantage);
        const abilityName = (ds.ability || 'Check').toUpperCase();
        const roll = `[[${dice}${inlineMod(mod)}${D20_CRIT}]]`;
        return `&{template:default} {{name=${abilityName} (${mod >= 0 ? '+' : ''}${mod})${suffix}}} {{Roll=${roll}}}`;
      }
      case 'attack': {
        const statMod = parseInt(ds.statModifier, 10);
        const attackBonus = parseInt(ds.attackBonus, 10);
        const s = (n) => (Number.isNaN(n) ? 0 : n);
        const stat = s(statMod);
        const bonus = s(attackBonus);
        const { dice, suffix } = getD20AndLabel(ds.advantage);
        const weaponName = (ds.weaponName || 'Attack').trim();
        const roll = `[[${dice}${inlineMod(stat)}${inlineMod(bonus)}${D20_CRIT}]]`;
        const weaponLabel = weaponName ? ` {{Weapon=${weaponName}}}` : '';
        return `&{template:default} {{name=Attack Roll${suffix}}} {{Roll=${roll}}}${weaponLabel}`;
      }
      case 'spellcasting': {
        const statMod = ds.statModifier != null ? parseInt(ds.statModifier, 10) : null;
        const spellBonus = ds.spellCheckBonus != null ? parseInt(ds.spellCheckBonus, 10) : null;
        let mod = 0;
        if (statMod != null && !Number.isNaN(statMod)) mod += statMod;
        if (spellBonus != null && !Number.isNaN(spellBonus)) mod += spellBonus;
        if (mod === 0) {
          const fromDisplay = parseDisplayedModifier(el);
          if (fromDisplay !== null) mod = fromDisplay;
        }
        const { dice, suffix } = getD20AndLabel(ds.advantage);
        const statLabel = (ds.stat || 'Spell').toUpperCase();
        const roll = `[[${dice}${inlineMod(mod)}${D20_CRIT}]]`;
        return `&{template:default} {{name=Spellcasting${suffix}}} {{${statLabel}=${roll}}}`;
      }
      case 'damage': {
        const formula = (ds.formula || '').trim().replace(/\s/g, '');
        if (!formula) return null;
        const weaponName = (ds.weaponName || '').trim();
        const name = weaponName ? `Damage: ${weaponName}` : 'Damage';
        return `&{template:default} {{name=${name}}} {{Damage=[[${formula}]]}}`;
      }
      case 'spell-damage': {
        const bonus = ds.bonus != null ? parseInt(ds.bonus, 10) : 0;
        if (Number.isNaN(bonus)) return null;
        const roll = `[[1d6${inlineMod(bonus)}]]`;
        return `&{template:default} {{name=Spell Damage}} {{Damage=${roll}}}`;
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
