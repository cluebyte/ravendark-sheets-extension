# RavenDark Sheets to Roll20

A browser extension that adds **Roll** buttons on [RavenDark Sheets](https://ravendark-sheets.vercel.app) character pages. Clicking a roll button sends a roll command (e.g. `/roll 1d20 + 5`) to the [Roll20](https://app.roll20.net/editor/) chat.

Works on **Chrome** and **Firefox** (Manifest V3).

## Requirements

- A character sheet open at `https://ravendark-sheets.vercel.app/characters/<uuid>`.
- A Roll20 game open in another tab at `https://app.roll20.net/editor/` (or any URL under `app.roll20.net/editor/*`). The extension sends the roll to the first matching tab.

## Installation (unpacked)

### Chrome

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.

### Firefox

1. Open `about:debugging`.
2. Click **This Firefox** → **Load Temporary Add-on**.
3. Select any file in this project (e.g. `manifest.json`).

## Usage

1. Open a RavenDark character sheet (`/characters/<uuid>`).
2. Open your Roll20 game in another tab.
3. On the character sheet, use the **Roll** buttons injected next to rollable values (ability scores, attack roll, damage, critical damage, spellcasting check, spell damage). Each button sends the appropriate formula to Roll20 chat.

## How roll buttons are added

The extension looks for elements with `data-roll-type` on the sheet (set by the RavenDark app) and injects a "Roll" button into each. The Roll20 formula is derived from the element’s data attributes:

| Type | Attributes | Formula sent to Roll20 |
|------|------------|------------------------|
| `ability` | `data-ability`, `data-modifier` | `/roll 1d20 + <modifier>` |
| `attack` | `data-modifier`, `data-stat`, etc. | `/roll 1d20 + <modifier>` |
| `damage` | `data-formula`, `data-weapon-name` | `/roll <formula>` (e.g. 1d8+2) |
| `critical-damage` | `data-formula`, `data-weapon-name` | `/roll <formula>` (e.g. 2d12+1) |
| `spellcasting` | `data-modifier`, `data-stat` | `/roll 1d20 + <modifier>` |
| `spell-damage` | `data-bonus` | `/roll 1d6 + <bonus>` |

A MutationObserver re-scans the DOM when the page changes (e.g. expanding the Combat panel) so new roll areas get a button.

## Debugging

If clicks don't reach Roll20 chat, open the browser console in three places:

1. **RavenDark tab** (character sheet): DevTools → Console. You should see `[RavenDark→Roll20] Roll clicked, formula: ...` and either success or an error from the background.
2. **Extension background**: `chrome://extensions` → RavenDark Sheets to Roll20 → "Service worker" (inspect). Look for `[RavenDark→Roll20] Background: Roll20 tabs found: N` and any error (e.g. "Receiving end does not exist" means the Roll20 content script did not load in that tab).
3. **Roll20 tab**: DevTools → Console on the Roll20 page. You should see `[RavenDark→Roll20] Roll20: Received sendToChat` and either "Sent to chat" or "Chat input not found" / "Send button not found".

Common causes: no Roll20 tab open; Roll20 changed their chat DOM (selectors in `content-roll20.js` may need updating). If the Roll20 tab was opened before the extension was loaded, the extension will try to inject the Roll20 script automatically on first roll; if that still fails, refresh the Roll20 tab and try again. If you see "Extension context invalidated", you reloaded the extension while the character sheet was open—refresh the character sheet tab (F5) so the page gets a valid extension context.

## Limitations
- **Roll20 tab required**: The roll is sent only if a tab with `https://app.roll20.net/editor/*` is open. If none is found, the extension does nothing (no queue).
- **Roll20 DOM**: The extension uses `textarea[title="Text Chat Input"]` and `#chatSendBtn` on Roll20. If Roll20 changes their markup, these selectors may need to be updated.

## Links

- [RavenDark Sheets](https://ravendark-sheets.vercel.app)
- [Roll20](https://app.roll20.net/editor/)
