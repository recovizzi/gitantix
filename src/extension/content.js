// Gitantix content script (bundled by tools/build.mjs).
//  - disguise on: the game is hidden and a GitHub / GitLab repository page is drawn on top (src/overlay/)
//  - remembers the last game opened (the popup's mini version will open it, see specs/mini.md)
import * as overlay from '../overlay/main.js';
import { GAMES } from '../overlay/read.js';

export const DEFAULTS = { flavor: 'github', mode: 'auto', disguise: true };
const root = document.documentElement;
const game = GAMES[location.hostname];

const save = change => chrome.storage.sync.set(change);
let settings = null;

function apply(s) {
  settings = s;
  root.dataset.gxFlavor = s.flavor;
  root.dataset.gxMode = s.mode;
  if (!s.disguise) { overlay.unmount(); return; }
  whenReady(() => mountWhenGame());
}

function whenReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/** The game's form is in the HTML: mount at once; the game itself initialises on window load (read.js ready()). */
function mountWhenGame(tries = 50) {
  if (!settings?.disguise) return;
  if (overlay.mount(settings, save)) return;
  if (tries > 0) setTimeout(() => mountWhenGame(tries - 1), 100);
  else root.classList.remove('gx-pending');
}

if (game) {
  root.dataset.gxGame = game;
  chrome.storage.local.set({ lastGame: game });
  // hide the game until the disguise draws (never for more than 5 s)
  chrome.storage.sync.get(DEFAULTS, s => {
    if (s.disguise) { root.classList.add('gx-pending'); setTimeout(() => root.classList.remove('gx-pending'), 5000); }
    apply(s);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    chrome.storage.sync.get(DEFAULTS, s => {
      const was = settings;
      settings = s;
      root.dataset.gxFlavor = s.flavor;
      root.dataset.gxMode = s.mode;
      if (!s.disguise) overlay.unmount();
      else if (!was?.disguise) apply(s);
      else overlay.update(s);
    });
  });
}
