// Gitantix content script (bundled by tools/build.mjs).
// Base only: knows which game the page is, applies the settings as <html> attributes and remembers the last game
// opened (the popup's mini version will open it). The GitHub / GitLab disguise comes in src/overlay/ (see specs/).

export const GAMES = { 'cemantix.certitudes.org': 'cemantix', 'pedantix.certitudes.org': 'pedantix' };
export const DEFAULTS = { flavor: 'github', mode: 'auto', disguise: true };

const root = document.documentElement;
const game = GAMES[location.hostname];

function apply(s) {
  root.dataset.gxFlavor = s.flavor;
  root.dataset.gxMode = s.mode;
  root.dataset.gxDisguise = s.disguise ? 'on' : 'off';
}

if (game) {
  root.dataset.gxGame = game;
  chrome.storage.sync.get(DEFAULTS, apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') chrome.storage.sync.get(DEFAULTS, apply);
  });
  chrome.storage.local.set({ lastGame: game });
}
