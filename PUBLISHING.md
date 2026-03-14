# Publishing the extension

Checklists to get **RavenDark Sheets to Roll20** ready for the Chrome Web Store and Firefox Add-ons (AMO).

---

# Chrome Web Store

## 1. Developer account

- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- Sign in with a Google account and pay the **one-time $5 registration fee**.
- Use an email you’ll keep; the developer email cannot be changed later.

## 2. Extension assets

### Icons (required)

- Add PNGs in the `icons/` folder: **icon16.png**, **icon48.png**, **icon128.png** (see `icons/README.md`).
- **128×128** is required for the store; 48 and 16 are used in Chrome’s UI.
- Use a single, recognizable design at all sizes.

### Store listing assets

Prepare these for the dashboard when you create the listing:

| Asset                     | Requirement                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Screenshots**           | At least one. Prefer **1280×800** or **640×400**. Show the Roll buttons on a character sheet and/or Roll20 receiving a roll. |
| **Promo tile** (optional) | **440×280** for featured placement.                                                                                          |
| **Marquee** (optional)    | **1400×560** for large promo.                                                                                                |

## 3. Privacy policy

The store requires a **privacy policy URL** for extensions that use permissions like `tabs` and `host_permissions`.

- Host a short page that states you **do not collect, store, or transmit user data** (see `PRIVACY_POLICY.md` in this repo for a template).
- Put the URL in the Chrome Web Store Developer Dashboard under your extension’s **Privacy practices** (or store listing).

## 4. Package the extension

Create a **ZIP** of the extension only (no repo metadata or build artifacts):

```bash
# From the project root (copy the whole line including the closing quote):
zip -r ravendark-sheets-roll20.zip . -x '*.git*' -x '*node_modules*' -x '*.DS_Store' -x '*.md' -x '*.tgz'
```

Or manually zip:

- `manifest.json`
- `background.js`
- `content-ravendark.js`, `content-ravendark.css`
- `content-roll20.js`
- `icons/` (with icon16.png, icon48.png, icon128.png)

Do **not** include: `.git/`, `node_modules/`, `README.md`, `PUBLISHING.md`, or other non-extension files (unless you want them; they’re not needed for the package).

**Note:** If you omit `*.md` from the zip, the package is smaller; the store doesn’t require markdown files.

**Icons:** The manifest references `icons/icon16.png`, `icon48.png`, and `icon128.png`. You must add these PNGs before publishing. If you load the extension unpacked before the icons exist, Chrome may show errors; temporarily remove the `"icons"` block from `manifest.json` for local testing only, then restore it and add the icon files before building the store ZIP.

## 5. Store listing content

In the Developer Dashboard, when creating or editing the item:

- **Short description** (max 132 chars): e.g. _Add Roll buttons on RavenDark character sheets and send roll commands to Roll20 chat._
- **Detailed description**: Explain what the extension does, that it needs a RavenDark character sheet and a Roll20 tab, and how to use the Roll buttons. You can adapt the main sections from `README.md`.
- **Category**: e.g. “Productivity” or “Fun”.
- **Language**: Select the primary language.

## 6. Permission justifications (Chrome)

When the dashboard asks why the extension needs each permission, you can use the text below.

**tabs**  
Used to find the user’s Roll20 game tab and send the roll to it. The extension calls `chrome.tabs.query()` to get tabs with `https://app.roll20.net/*`, picks the main game tab (excluding character/journal popouts), and uses `chrome.tabs.sendMessage()` to send the roll formula to that tab’s content script. Tab URLs are only used to identify the Roll20 tab; they are not read, stored, or sent elsewhere.

**scripting**  
Used only on Roll20 (`https://app.roll20.net/*`). Two uses: (1) **Inject content script** — if the user had Roll20 open before installing or reloading the extension, the Roll20 content script is not loaded yet; the extension uses `chrome.scripting.executeScript()` to inject the Roll20 content script into that tab so the first roll works without requiring a refresh. (2) **Run in all frames** — Roll20’s chat can live in an iframe; when the main frame does not find the chat input, the extension runs a small function in all frames via `chrome.scripting.executeScript(..., allFrames: true)` to find the chat and send the roll. No scripts are run on any other sites.

**Host: `https://ravendark-sheets.vercel.app/characters/*`**  
The extension adds “Roll” buttons on RavenDark character sheet pages and handles clicks there. It needs access to this host so the content script (JS + CSS) can run on character URLs: find elements with `data-roll-type`, inject the buttons, and when the user clicks a button, read the roll formula from the element’s data attributes and send it to the background script. No data is sent to any server other than the user’s Roll20 tab; RavenDark is only used as the page where the UI is shown and where the user triggers a roll.

**Host: `https://app.roll20.net/*`**  
The extension sends the chosen roll formula into the Roll20 game’s chat. It needs access to this host so that: (1) the content script can run on Roll20 pages and, when the background tells it to, insert the formula into the chat input and click send; and (2) the background script can use the tabs and scripting APIs (with this host permission) to find the correct Roll20 tab, optionally inject the content script if the tab was opened before the extension was loaded, and run code in all frames when the chat is in an iframe. Access is limited to Roll20; the extension does not read, store, or transmit Roll20 content beyond sending the user’s chosen formula into the chat.

## 7. Submit for review

1. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), click **New item**.
2. Upload your **ZIP** file.
3. Fill in **Store listing** (description, screenshots, icon, privacy policy URL, etc.).
4. Complete any **Distribution** and **Privacy** questions.
5. Submit. Review often takes from a few hours to a few days.

## 8. After approval

- You can update the extension by uploading a new ZIP and submitting again (bump `version` in `manifest.json` for each release).
- Keep the listing accurate: if Roll20 or RavenDark change and you update the extension, update the description if needed.

## Quick checklist

- [ ] Developer account registered ($5)
- [ ] Icons added in `icons/` (16, 48, 128 PNG)
- [ ] At least one screenshot (1280×800 or 640×400)
- [ ] Privacy policy hosted and URL set in dashboard
- [ ] ZIP built without `.git`, `node_modules`, and optional `.md` files
- [ ] Store listing filled (short + detailed description, category)
- [ ] Permission justifications provided (see §6; copy from this doc if needed)
- [ ] Package submitted and submitted for review

## Links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Publish your extension](https://developer.chrome.com/docs/webstore/publish/)
- [Program policies](https://developer.chrome.com/docs/webstore/program-policies/)

---

# Firefox Add-ons (AMO)

The same Manifest V3 package works for Firefox. Use the same ZIP you build for Chrome (see “Package the extension” above), or build a separate one with the same contents.

## 1. Developer account

**Firefox manifest requirements (already in this repo):** The manifest includes (1) `browser_specific_settings.gecko.id` — required by AMO for MV3; replace `ravendark-sheets-roll20@example.org` with your own add-on ID (e.g. `your-addon@yourdomain.com` or a GUID) and keep it the same for all future updates. (2) `background.scripts` — Firefox uses this as a fallback when `background.service_worker` is present; Chrome uses the service worker and ignores `scripts`. The same `background.js` runs in both.

- Go to [Firefox Add-ons](https://addons.mozilla.org) and sign in (or create a [Mozilla account](https://accounts.firefox.com)).
- Open [Developer Hub](https://addons.mozilla.org/developers/) and complete your **developer profile**.
- Set a **display name** (shown on your add-on listing).
- Use a **non-disposable email**; temporary/disposable addresses are blocked.
- No fee; publishing on AMO is free.

## 2. Add-on assets

- **Icons:** The same `icons/` folder (16, 48, 128 PNG) works. On AMO’s listing form you can also upload **32×32** and **64×64** for the store page (optional; AMO can use your manifest icon).
- **Screenshots:** At least one recommended. **1280×800** (or 1.6:1 ratio). Same ideas as Chrome: show Roll buttons on the sheet and/or Roll20 receiving a roll.

## 3. Privacy policy

- If your add-on transmits user data, AMO requires a privacy policy. This extension does not; you can still host the policy from `PRIVACY_POLICY.md` and paste the URL in the listing.
- Add the URL in the submission form under **Privacy Policy**.

## 4. Package

- Same as Chrome: ZIP containing `manifest.json`, `background.js`, content scripts, `content-ravendark.css`, and `icons/` (with the three PNGs). No `.git`, `node_modules`, or extra files.
- You can use the **same ZIP** for both Chrome and Firefox.

## 5. Submit for review

1. In the [Developer Hub](https://addons.mozilla.org/developers/), click **Submit a New Add-on**.
2. Choose **On this site** (AMO).
3. Upload your **ZIP** (or .xpi).
4. Select **No** for “Does your add-on use any minified, obfuscated or otherwise machine-generated code?” (unless you add build steps that minify).
5. Fill in **Listing**:
   - **Summary** (short description).
   - **Description** (detailed; adapt from README).
   - **Categories** (up to 2 for Firefox, 2 for Android if applicable).
   - **Support email** and optionally **Support URL**.
   - **Privacy policy URL** (if you host one).
6. Add **Notes for reviewers** if needed (e.g. “No test account; uses public RavenDark Sheets and Roll20”).
7. Choose a **License** (e.g. MPL 2.0, MIT).
8. Submit. Mozilla will **sign** the add-on after review (required for distribution). Review often takes a few days.

## 6. After approval

- New versions: upload a new ZIP with a higher `version` in `manifest.json` and submit again.
- Keep the listing and description accurate when you change the extension.

## Quick checklist (Firefox)

- [ ] Use `{024354d9-8d6c-4150-b17a-ef29cb781326}` for your GUID
- [ ] Mozilla/developer account and profile (display name, non-disposable email)
- [ ] Same package ZIP as Chrome (or equivalent) with icons
- [ ] At least one screenshot (1280×800 or 1.6:1)
- [ ] Privacy policy URL in listing (recommended even if no data collection)
- [ ] Listing filled (summary, description, categories, support email, license)
- [ ] Notes for reviewers if needed
- [ ] Submitted for review (Mozilla signs after approval)

## Links (Firefox)

- [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Create an appealing listing](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing)
