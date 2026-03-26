# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser extension (Chrome/Firefox, Manifest V3) that bridges RavenDark Sheets (character sheet app) and Roll20 (TTRPG platform). It injects "Roll" buttons into RavenDark character sheets and sends the resulting roll formulas into Roll20's chat.

## No Build System

This is a plain browser extension — no bundler, no package manager, no transpilation. Files are loaded directly by the browser. To package for store submission:

```bash
zip -r ravendark-sheets-roll20.zip . -x '*.git*' -x '*node_modules*' -x '*.DS_Store' -x '*.md' -x '*.tgz'
```

## Architecture

Three-layer communication flow:

```
content-ravendark.js  →  background.js  →  content-roll20.js
   (RavenDark tab)    (service worker)      (Roll20 tab)
```

1. **`content-ravendark.js`** — Runs on `ravendark-sheets.vercel.app/characters/*`. Uses `MutationObserver` to detect elements with `data-roll-type` attributes, injects Roll buttons, and builds Roll20 formula strings. Sends `postToRoll20` message to the background.

2. **`background.js`** — Service worker. Receives `postToRoll20`, queries for the active Roll20 tab (filtering out character sheets/journals by URL), injects `content-roll20.js` if needed, then forwards a `sendToChat` message to the Roll20 tab.

3. **`content-roll20.js`** — Runs on `app.roll20.net/*`. Listens for `sendToChat`, searches the main document and same-origin iframes for the chat input using multiple fallback selectors, inserts the formula, and clicks send.

## Roll Types

The `data-roll-type` attribute on RavenDark elements determines the formula built:

| Type | Formula |
|---|---|
| `ability` | `/roll 1d20 + modifier` (supports advantage/disadvantage via 2d20kh1/kl1) |
| `attack` | `/roll 1d20 + stat modifier + attack bonus` |
| `damage` | `/roll <formula>` with weapon name and properties |
| `critical-damage` | `/roll <critical formula>` with weapon properties |
| `spellcasting` | `/roll 1d20 + spell modifier` |
| `spell-damage` | `/roll 1d6 + bonus` |

Roll20's `&{template:default}` is used to style output. Weapon properties are read from a JSON array in the dataset; `}}` characters are sanitized to avoid breaking the template syntax.

## Key Implementation Details

- **Resilient DOM selection**: `content-roll20.js` tries multiple selectors for Roll20's chat elements to survive Roll20 UI changes.
- **Iframe support**: Roll20's chat may be inside an iframe. `background.js` uses `allFrames: true` and `content-roll20.js` searches same-origin iframes via `getDocuments()`.
- **Script injection**: If Roll20 was open before the extension loaded, `background.js` dynamically injects `content-roll20.js` via `chrome.scripting.executeScript`.
- **No external data**: All communication is local within the user's browser between two tabs. No servers or APIs involved.
