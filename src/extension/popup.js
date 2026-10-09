// The popup is the mini version (specs/mini.md): a small GitHub / GitLab page of the last game opened, without the
// page's furniture. The game itself runs in a tab of the site (the one open, or a background tab we open): this
// page renders what that tab's content script reads and sends it the guesses (it submits them the safe way).
// The popup window follows the body size (browsers cap it at 800 × 600), resizable with the grips.
import * as R from '../overlay/render.js';
import css from '../overlay/overlay.css';

// popup.html?embed: inside the floating panel of a page (panel.js) instead of the toolbar popup
const EMBED = new URLSearchParams(location.search).has('embed');
if (EMBED) document.documentElement.classList.add('embed');
const close = () => EMBED ? parent.postMessage({ gitantix: 'close' }, '*') : window.close();
const SITE = g => `https://${g}.certitudes.org/`;
const DEFAULTS = { flavor: 'github', mode: 'auto', disguise: true };
const MIN = { w: 340, h: 360 }, MAX = { w: 800, h: 600 };
const st = { sort: 'temp', menu: null, expanded: false, lastSent: null, copied: false, teamBusy: false };
let opts = DEFAULTS, game = 'cemantix', tabId = null, model = null, ready = false, status = 'Connecting…';
let ui = null, lastHtml = {}, note = null;   // note: why the floating panel couldn't open on this page (background.js)

// ------------------------------------------------------------------ the game's tab
const send = msg => chrome.tabs.sendMessage(tabId, { to: 'game', game, ...msg });
const post = msg => { send(msg).catch(() => {}); };   // fire and forget (the tab may be gone)
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** `send` that gives up after `ms` (a tab asleep may never answer). */
const ask = (msg, ms = 1500) => Promise.race([send(msg).catch(() => null), sleep(ms).then(() => null)]);

/** The game's tab: the most recently used one that answers, or a new background tab. A tab opened before the
 *  extension was (re)loaded or put to sleep by the browser has no live content script: it is reloaded. */
async function connect(g) {
  game = g; tabId = null; model = null; status = `Opening ${g}…`; render();
  chrome.storage.local.set({ lastGame: g });
  const tabs = (await chrome.tabs.query({ url: `${SITE(g)}*` })).sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  let tab = null;
  for (const t of tabs) {
    if (t.discarded) continue;
    tabId = t.id;
    if (await ask({ type: 'state' })) { tab = t; break; }
  }
  if (!tab && tabs[0]) { tab = tabs[0]; await chrome.tabs.reload(tab.id); }
  if (!tab) tab = await chrome.tabs.create({ url: SITE(g), active: false });
  if (game !== g) return;
  tabId = tab.id;
  for (let k = 0; k < 80; k++) {
    if (game !== g) return;   // switched meanwhile
    const r = await ask({ type: 'state' });
    if (r?.present) { status = null; model = r.model; ready = r.ready; render(); if (r.ready) return; }
    await sleep(250);
  }
  if (!model) { status = `Couldn't reach ${g}. Reload its page, then try again.`; render(); }
}

async function refresh() {
  if (!tabId) return;
  const r = await send({ type: 'state' }).catch(() => null);
  if (!r?.present) return;
  model = r.model; ready = r.ready; status = null;
  render();
}

// ------------------------------------------------------------------ rendering (the page's renderer, mini layout)
function build() {
  document.querySelector('.gx-host')?.remove();
  const host = document.createElement('div');
  host.className = 'gx-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css.replace(/:host\s*\{\s*all: initial; position: fixed; inset: 0; z-index: \d+;/, ':host { all: initial; position: absolute; inset: 0;');
  const scroller = document.createElement('div');
  scroller.className = 'gx-scroll';
  scroller.innerHTML = R.miniShell(opts.flavor);
  shadow.append(style, scroller);
  document.body.prepend(host);
  const regions = Object.fromEntries([...scroller.querySelectorAll('[data-gx-region]')].map(el => [el.dataset.gxRegion, el]));
  ui = { host, shadow, regions, input: scroller.querySelector('[data-gx-input]'), flavor: opts.flavor };
  lastHtml = {};
  wire();
  ui.input.focus();
}

function put(name, html) {
  if (!ui.regions[name] || lastHtml[name] === html) return;
  lastHtml[name] = html;
  ui.regions[name].innerHTML = html;
}

function render() {
  if (!ui || ui.flavor !== opts.flavor) build();
  ui.host.dataset.flavor = opts.flavor;
  ui.host.dataset.mode = opts.mode;
  const i = R.makeIcon(opts.flavor);
  const m = model ?? { game, other: game === 'cemantix' ? 'pedantix' : 'cemantix', kind: game, rows: [], team: {}, error: '' };
  put('header', R.miniHeader(m, st, i, opts.flavor, { close: EMBED }));
  put('menu', R.menu(m, st, i, opts));
  if (status || !model) { put('flash', ''); put('win', ''); put('game', R.miniStatus(status ?? 'Connecting…', i)); return; }
  put('history', model ? R.miniHistory(m, i) : '');
  put('note', note ? `<div class="gx-flash gx-flash-warn">${i('alert')}<span>${note}</span></div>` : '');
  put('flash', ready ? R.flash(m, st, i) : R.miniStatus('The game is starting…', i));
  put('win', R.winBanner(m, i));
  put('game', m.kind === 'pedantix' ? R.pedantixGame(m, i) : R.cemantixGame(m, st, i));
}

function wire() {
  const { shadow, input } = ui;
  shadow.querySelector('[data-gx-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const word = input.value.trim();
    if (!word || !tabId) return;
    // the game may still be starting (or busy with the previous word): retry for a few seconds
    let r = null;
    for (let k = 0; k < 24 && !(r = await send({ type: 'guess', word }).catch(() => null))?.ok; k++) await sleep(250);
    if (!r?.ok) return;   // keep the word
    st.lastSent = word;
    input.value = '';
    input.focus();
  });
  // team (the game's own, driven in its tab): join with a code
  shadow.addEventListener('submit', e => {
    const join = e.target.closest?.('[data-gx-join]');
    if (!join) return;
    e.preventDefault();
    const code = join.querySelector('[data-gx-team-input]').value.trim();
    if (code) teamOp('join', code);
  });
  // the history button only shows a list on hover: clicking it must leave the focus in the guess box
  shadow.addEventListener('mousedown', e => { if (e.target.closest('[data-gx-history]')) e.preventDefault(); });
  shadow.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (st.menu) { st.menu = null; render(); input.focus(); } else if (EMBED) close();
  });
  shadow.addEventListener('change', e => {
    const t = e.target;
    if (t.matches?.('[data-gx-setting]')) chrome.storage.sync.set({ [t.dataset.gxSetting]: t.type === 'checkbox' ? t.checked : t.value });
    else if (t.matches?.('[data-gx-toggle]')) post({ type: 'toggle', id: t.dataset.gxToggle });
  });
  shadow.addEventListener('click', e => {
    if (st.menu && !e.target.closest('[data-gx-stop], [data-gx-action="menu"]')) { st.menu = null; render(); }
    const word = e.target.closest('.gx-w-hidden');
    if (word) { post({ type: 'word', i: word.dataset.gxWord }); return; }
    let el = e.target.closest('[data-gx-action]');
    const box = e.target.closest('[data-gx-stop]');
    if (el && box && el.contains(box)) el = null;
    if (!el) return;
    const a = el.dataset.gxAction, v = el.dataset.value;
    if (a === 'menu') { st.menu = st.menu === el.dataset.menu ? null : el.dataset.menu; st.copied = false; if (st.menu === 'team') send({ type: 'team', op: 'load' }).then(refresh, () => {}); }
    else if (a === 'menu-close') st.menu = null;
    else if (a === 'switch') { st.menu = null; if (v !== game) { connect(v); return; } }
    else if (a === 'sort') st.sort = v;
    else if (a === 'share') post({ type: 'share' });
    else if (a === 'team-create') teamOp('create');
    else if (a === 'team-leave') teamOp('leave');
    else if (a === 'copy-code') {
      const code = shadow.querySelector('[data-gx-team-code]')?.value;
      if (code) navigator.clipboard?.writeText(code).then(() => { st.copied = true; render(); }).catch(() => {});
    }
    else if (a === 'open-tab') { if (tabId) chrome.tabs.update(tabId, { active: true }).then(t => chrome.windows.update(t.windowId, { focused: true })).then(close, close); return; }
    else if (a === 'close') { close(); return; }
    else return;
    e.preventDefault();
    render();
    if (!st.menu) input.focus();
  });
}

async function teamOp(op, code) {
  st.teamBusy = true; render();
  await send({ type: 'team', op, code }).catch(() => null);
  setTimeout(() => { st.teamBusy = false; refresh(); }, 1500);
}

// ------------------------------------------------------------------ size
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function setSize(w, h) {
  if (EMBED) return;   // the panel sizes itself
  document.body.style.width = `${clamp(w, MIN.w, MAX.w)}px`;
  document.body.style.height = `${clamp(h, MIN.h, MAX.h)}px`;
}
for (const grip of document.querySelectorAll('.grip')) {
  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const dir = +grip.dataset.dir, x0 = e.screenX, y0 = e.screenY, w0 = document.body.offsetWidth, h0 = document.body.offsetHeight;
    const move = ev => setSize(w0 + dir * (ev.screenX - x0), h0 + (ev.screenY - y0));
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', () => {
      grip.removeEventListener('pointermove', move);
      chrome.storage.local.set({ miniSize: { w: document.body.offsetWidth, h: document.body.offsetHeight } });
    }, { once: true });
  });
}

// ------------------------------------------------------------------ start
chrome.runtime.onMessage.addListener(msg => { if (msg?.type === 'gx-changed' && msg.game === game) refresh(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  for (const [k, { newValue }] of Object.entries(changes)) opts = { ...opts, [k]: newValue };
  render();
});
chrome.storage.sync.get(DEFAULTS, s => {
  opts = s;
  chrome.storage.local.get({ lastGame: 'cemantix', miniSize: null, panelError: null }, ({ lastGame, miniSize, panelError }) => {
    if (!EMBED && panelError && Date.now() - panelError.at < 10000) {
      const esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
      note = `No floating panel on this page (${esc(panelError.message)}): the classic popup instead.`;
      chrome.storage.local.remove('panelError');
    }
    if (miniSize) setSize(miniSize.w, miniSize.h);
    render();
    connect(lastGame === 'pedantix' ? 'pedantix' : 'cemantix');
  });
});
