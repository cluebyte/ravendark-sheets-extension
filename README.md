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
3. On the character sheet, use the **Roll** button injected by the extension (at the top of the page).
4. The roll (skeleton: `/roll 1d20 + 5`) is sent to the Roll20 chat.

## Limitations

- **Skeleton formula**: The initial build uses a single placeholder button with a fixed formula (`/roll 1d20 + 5`). Button placement and formula source can later be tuned to the real sheet DOM (e.g. `[data-roll-formula]` or configurable selectors).
- **Roll20 tab required**: The roll is sent only if a tab with `https://app.roll20.net/editor/*` is open. If none is found, the extension does nothing (no queue).
- **Roll20 DOM**: The extension uses `textarea[title="Text Chat Input"]` and `#chatSendBtn` on Roll20. If Roll20 changes their markup, these selectors may need to be updated.

## Links

- [RavenDark Sheets](https://ravendark-sheets.vercel.app)
- [Roll20](https://app.roll20.net/editor/)
