// Settings, saved in chrome.storage.sync (content.js applies them live).
const DEFAULTS = { flavor: 'github', mode: 'auto', disguise: true };
const form = document.querySelector('form');
chrome.storage.sync.get(DEFAULTS, s => {
  for (const [k, v] of Object.entries(s)) {
    const el = form.elements[k];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
});
form.addEventListener('change', e => {
  const el = e.target;
  chrome.storage.sync.set({ [el.name]: el.type === 'checkbox' ? el.checked : el.value });
});
