// Hides the game and draws a GitHub / GitLab repository page on top of it, in a shadow DOM (JetHub's approach).
// The game keeps running underneath: we read it (read.js) and drive its controls.
import { readGame, ready, present, actions, game } from './read.js';
import * as R from './render.js';
import css from './overlay.css';

const root = document.documentElement;
let ui = null;            // { host, shadow, scroller, regions, input }
let opts = null;          // settings: { flavor, mode, disguise }
let onSettings = null;    // saves a setting (content.js)
let scheduled = false;
let lastHtml = {};
// view state, kept across renders (per game for the recent list)
const EXPAND_KEY = `gitantix:expanded:${game()}`;
const st = {
  sort: 'temp', menu: null, expanded: (() => { try { return localStorage.getItem(EXPAND_KEY) === '1'; } catch { return false; } })(),
  lastSent: null, copied: false, teamBusy: false, sidebarOff: false,
};
const recall = { list: [], idx: -1 };   // ↑ / ↓ in the box: previous inputs (like the game's ⤺)

/** Called by content.js. Returns false when this page isn't a game we draw. */
export function mount(settings, save) {
  opts = settings; onSettings = save;
  if (!present()) { unmount(); return false; }
  if (!ui) build();
  applyOpts();
  render();
  return true;
}

/** Google's floating privacy badge forces its visibility with inline !important styles: only an inline
 *  !important of ours hides it (undone on unmount). The consent dialog itself (.fc-consent-root) stays. */
function hideStrays() {
  for (const el of document.body?.children ?? []) {
    if (!el.shadowRoot || el.classList.contains('fc-consent-root') || el.dataset.gxHidden) continue;
    el.dataset.gxHidden = '1';
    el.style.setProperty('display', 'none', 'important');
  }
}
function showStrays() {
  for (const el of document.querySelectorAll('[data-gx-hidden]')) { el.style.removeProperty('display'); delete el.dataset.gxHidden; }
}

export function unmount() {
  showStrays();
  root.classList.remove('gx-disguise', 'gx-pending');
  ui?.host.remove();
  ui = null; lastHtml = {};
}

export function update(settings) {
  const rebuild = settings.flavor !== opts?.flavor;
  opts = settings;
  if (!ui) return;
  if (rebuild) { unmount(); mount(settings, onSettings); return; }
  applyOpts();
  schedule();
}

function applyOpts() {
  ui.host.dataset.mode = opts.mode;
  ui.host.dataset.flavor = opts.flavor;
}

function build() {
  const host = document.createElement('gitantix-overlay');
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const scroller = document.createElement('div');
  scroller.className = 'gx-scroll';
  shadow.append(style, scroller);
  root.append(host);
  const m = readGame();
  scroller.innerHTML = R.shell(m, opts.flavor);
  const regions = Object.fromEntries([...scroller.querySelectorAll('[data-gx-region]')].map(el => [el.dataset.gxRegion, el]));
  ui = { host, shadow, scroller, regions, input: scroller.querySelector('[data-gx-input]') };
  root.classList.add('gx-disguise');
  root.classList.remove('gx-pending');
  wire();
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] });
  setFavicon();
  setTimeout(() => ui?.input.focus(), 50);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; if (ui) render(); });
}

function put(name, html) {
  if (!ui.regions[name] || lastHtml[name] === html) return;
  lastHtml[name] = html;
  ui.regions[name].innerHTML = html;
}

function render() {
  hideStrays();
  const m = readGame();
  const i = R.makeIcon(opts.flavor);
  put('header', R.header(m, st, i, opts.flavor));
  put('sidebar', st.sidebarOff ? '' : R.sidebar(m, i));
  put('repohead', R.repoHead(m, i, opts.flavor));
  put('toolbar', R.toolbar(m, i, opts.flavor));
  put('menu', R.menu(m, st, i, opts));
  put('dialog', R.dialog(m.dialog, i));
  put('flash', R.flash(m, st, i));
  put('win', R.winBanner(m, i));
  put('game', m.kind === 'pedantix' ? R.pedantixGame(m, i) : R.cemantixGame(m, st, i));
  put('side', R.side(m, st, i));
  ui.input.disabled = !ready();
  document.title = R.title(m, opts.flavor);
}

function setFavicon() {
  const svg = R.makeIcon(opts.flavor)(opts.flavor === 'gitlab' ? 'tanuki' : 'mark-github').replace(/^<svg[^>]*>|<\/svg>$/g, '');
  const fill = opts.flavor === 'gitlab' ? '#e24329' : '#1f2328';
  document.querySelectorAll('link[rel~="icon"]').forEach(l => l.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="${fill}">${svg}</svg>`)}`;
  document.head.append(link);
}

function send() {
  const word = ui.input.value.trim();
  if (!word) return;
  if (!actions.guess(word)) return;
  st.lastSent = word;
  recall.list = [word, ...recall.list.filter(w => w !== word)].slice(0, 20); recall.idx = -1;
  ui.input.value = '';
  ui.input.focus();
}

function wire() {
  const { shadow, scroller } = ui;
  scroller.querySelector('[data-gx-form]').addEventListener('submit', e => { e.preventDefault(); send(); });
  ui.input.addEventListener('keydown', e => {
    e.stopPropagation();   // the game listens to keys on its own field only, but keep the page out of it
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    recall.idx = Math.max(-1, Math.min(recall.list.length - 1, recall.idx + (e.key === 'ArrowUp' ? 1 : -1)));
    ui.input.value = recall.idx < 0 ? '' : recall.list[recall.idx];
  });
  shadow.addEventListener('submit', e => {
    const join = e.target.closest?.('[data-gx-join]');
    if (!join) return;
    e.preventDefault();
    const code = join.querySelector('[data-gx-team-input]').value.trim();
    if (code) teamOp(() => actions.joinTeam(code));
  });
  shadow.addEventListener('change', e => {
    const t = e.target;
    if (t.matches?.('[data-gx-setting]')) onSettings?.({ [t.dataset.gxSetting]: t.type === 'checkbox' ? t.checked : t.value });
    else if (t.matches?.('[data-gx-toggle]')) actions.toggle(t.dataset.gxToggle);
  });
  shadow.addEventListener('click', e => {
    // a click outside an open menu closes it
    if (st.menu && !e.target.closest('[data-gx-stop], [data-gx-action="menu"]')) { st.menu = null; schedule(); }
    const word = e.target.closest('.gx-w-hidden');
    if (word) { actions.word(word.dataset.gxWord); return; }
    let el = e.target.closest('[data-gx-action]');
    const box = e.target.closest('[data-gx-stop]');
    if (el && box && el.contains(box)) el = null;   // a click inside a modal must not reach its backdrop
    if (!el) return;
    const a = el.dataset.gxAction, v = el.dataset.value;
    if (a === 'menu') { st.menu = st.menu === el.dataset.menu ? null : el.dataset.menu; st.copied = false; if (st.menu === 'team') actions.loadTeam().then(schedule); }
    else if (a === 'menu-close') st.menu = null;
    else if (a === 'switch') { st.menu = null; if (v !== game()) actions.switchGame(); }
    else if (a === 'sort') st.sort = v;
    else if (a === 'expand') { st.expanded = !st.expanded; try { localStorage.setItem(EXPAND_KEY, st.expanded ? '1' : '0'); } catch {} }
    else if (a === 'sidebar') st.sidebarOff = !st.sidebarOff;
    else if (a === 'dialog') actions.openDialog(v);
    else if (a === 'dialog-close') actions.closeDialog();
    else if (a === 'yesterday') { if (game() === 'cemantix') { e.preventDefault(); actions.yesterday(); } return; }
    else if (a === 'reveal') actions.reveal();
    else if (a === 'share') actions.share();
    else if (a === 'team-create') teamOp(() => actions.createTeam());
    else if (a === 'team-leave') teamOp(() => actions.leaveTeam());
    else if (a === 'copy-code') {
      const code = shadow.querySelector('[data-gx-team-code]')?.value;
      if (code) navigator.clipboard?.writeText(code).then(() => { st.copied = true; schedule(); }).catch(() => {});
    }
    else return;
    e.preventDefault();
    schedule();
  });
}

async function teamOp(fn) {
  st.teamBusy = true; schedule();
  try { await fn(); } finally { setTimeout(() => { st.teamBusy = false; schedule(); }, 1500); }
}
