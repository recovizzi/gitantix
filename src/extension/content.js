// Gitantix content script (bundled by tools/build.mjs).
//  - disguise on: the game is hidden and a GitHub / GitLab repository page is drawn on top (src/overlay/)
//  - remembers the last game opened and serves the popup's mini version: it plays through this tab (messages:
//    state / guess / word; "gx-changed" when the game changes). See specs/mini.md.
import * as overlay from '../overlay/main.js';
import { GAMES, readGame, present, ready, actions } from '../overlay/read.js';

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

// ------------------------------------------------------------------ the popup's mini version plays through this tab
if (game) {
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg?.to !== 'game' || msg.game !== game) return;
    if (!present()) { reply({ present: false }); return; }
    if (msg.type === 'state') reply({ present: true, ready: ready(), model: readGame() });
    else if (msg.type === 'guess') reply({ ok: actions.guess(msg.word) });   // the safe submit, see specs/sites.md
    else if (msg.type === 'word') reply({ ok: actions.word(msg.i) });
    else if (msg.type === 'toggle') reply({ ok: actions.toggle(msg.id) });
    else if (msg.type === 'share') reply({ ok: actions.share() });
    else if (msg.type === 'team') {   // load / create / join / leave: the game's own team panel, driven like the page does
      const op = { load: () => actions.loadTeam(), create: () => actions.createTeam(), join: () => actions.joinTeam(msg.code), leave: () => actions.leaveTeam() }[msg.op];
      Promise.resolve(op?.()).then(() => reply({ ok: true }), () => reply({ ok: false }));
      return true;   // answers asynchronously
    }
  });
  // tell an open popup that the game changed (nobody listens when it's closed: ignore the error)
  let timer = null;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => chrome.runtime.sendMessage({ type: 'gx-changed', game }).catch(() => {}), 120);
  };
  whenReady(() => new MutationObserver(changed).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] }));
}
