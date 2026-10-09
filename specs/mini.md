# Milestone 2: the mini version in the popup

Clicking the extension icon opens a **small GitHub / GitLab page** of the **game opened last** (content.js stores
`lastGame` in `chrome.storage.local`), without the page's furniture: compact header (repo switch, day, open the full page,
friends / team 👥, settings ⚙), close ✕ in the panel, guess box, messages, then only the game — Pédantix adds a square history button by the guess box (the words tried, shown on hover
or keyboard focus) — Cémantix's results (emoji, temperature, ‰,
proximity bar per line, latest guess on top) or Pédantix's text with holes. **Resizable** with grips in the bottom
corners (size kept in `chrome.storage.local.miniSize`).

## Where it's drawn: a floating panel in the current tab (decided 2026-10-09)

An action popup's frame (square corners, the browser's shadow, opaque background) is drawn by the browser: an
extension can't round it or put a shadow outside it. So the icon has **no `default_popup`**: `background.js`
(`action.onClicked`, permissions `activeTab` + `scripting`) injects `panel.js` into the current tab. The panel is a
fixed card (shadow root, inline `!important` position) with rounded corners and an outer shadow, framing
`popup.html?embed` (a web-accessible resource: an extension frame keeps the extension APIs, and pages' CSP doesn't
block it — checked on github.com). Bottom-corner grips resize it (left grip moves the left edge), clamped to the
viewport without its scrollbar; a second click on the icon, ✕, Esc or "open the full page" closes it (the frame posts
`{ gitantix: 'close' }`, checked against the frame's window).

Where extensions can't run (edge:// / chrome:// pages, new tab page, stores) the injection fails: the classic popup
is set for that tab (`action.setPopup`, reset when the tab loads another page) and opened (`action.openPopup`, else a
small popup window). The classic popup is flush (no inner card).

## How it plays: through a tab of the game (decided 2026-10-09)

The popup (`src/extension/popup.js`, bundled) renders with the page's own renderer (`render.js` `miniShell`,
`miniHeader` + `cemantixGame` / `pedantixGame`) in a shadow root, and **talks to the game's tab**:

- it finds the most recently used tab of the game that answers (`chrome.tabs.query`, host permissions; each probe
  gives up after 1.5 s), otherwise **reloads** the most recent one (a tab opened before the extension was reloaded,
  or put to sleep by the browser, has no live content script: it never answers), otherwise opens one in the
  background (`chrome.tabs.create({ active: false })`); then it waits until that tab's content script answers;
- the game is drawn as soon as the tab answers; a guess typed while the game is still starting is retried for a few
  seconds;
- messages to the tab (`{ to: 'game', game, type }`): `state` → `{ present, ready, model }` (the same model as the
  page's disguise), `guess` (the content script submits it **the safe way**, specs/sites.md), `word` (Pédantix length
  hint), `toggle`, `share`;
- the tab sends `{ type: 'gx-changed', game }` (debounced) when the game's DOM changes; the popup then asks `state`.

So the guesses, the team and the storage are the real game's, shared with the full page.

### Rejected: framing the game in the popup

The obvious design (an `<iframe>` of the game in the popup, our content script drawing a mini layout inside) does
not work: both sites send `X-Frame-Options: SAMEORIGIN`, and **`declarativeNetRequest` rules don't apply to requests
started by the extension's own pages** (tested in Chromium 131: even an unconditional session rule removing the
header leaves the frame blocked). `tabIds` conditions are only allowed in session rules (a static rule with it
makes the whole manifest invalid: the extension doesn't load). Don't try again.

### Notes

- The classic popup can't be resized by the browser itself; its window follows the body size (max 800 × 600), so its
  grips resize the body.
- The background tab stays open after the popup closes (reused next time).
- `pnpm smoke` opens `popup.html` as a page, plays one word through the tab, creates a team from the popup, and
  reconnects after `chrome.runtime.reload()` (the orphaned-tab case), then injects the floating panel into a
  game tab and checks the game is drawn in it.
