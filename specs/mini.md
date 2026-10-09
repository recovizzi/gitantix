# Milestone 2: the mini version in the popup (first notes)

Start only once milestone 1 is complete.

Goal: clicking the extension icon opens a **small GitHub-style page** of the **game opened last** (content.js stores
`lastGame` in `chrome.storage.local`), without the page's furniture: guess box + Pédantix text with holes or
Cémantix best results (emoji, temperature, score ‰, proximity bar per line), and a settings button. **Resizable**.

Open questions to settle then:

- Popups have a fixed max size (Chrome ~800×600) and can't be resized by the user: a resizable panel probably means
  a **side panel** (`chrome.sidePanel`, Chrome/Edge 114+; Firefox `sidebar_action`) or a small extension window
  (`chrome.windows.create({type: 'popup'})`, resizable) opened from the action.
- Playing from outside the page: the game must run somewhere. Options: an offscreen / hidden tab of the game that
  the panel drives through messages (keeps the anti-automation rule: submit by native bound `requestSubmit` in the
  game tab), or calling the APIs directly (rejected: it bypasses the game state, teams and storage).
- Shared state: the game tab's `localStorage` (guesses) is the source of truth; the panel renders from messages.
