// Reads Cémantix / Pédantix into plain models the renderer draws, and drives the games' own controls.
// All selectors of the sites live here. See specs/ (sites.md, cemantix.md, pedantix.md).

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const text = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const shown = el => !!el && getComputedStyle(el).display !== 'none';
const num = s => +String(s ?? '').replace(/[^\d]/g, '') || 0;

export const GAMES = { 'cemantix.certitudes.org': 'cemantix', 'pedantix.certitudes.org': 'pedantix' };
export const game = () => GAMES[location.hostname] ?? null;
const PREFIX = { cemantix: '', pedantix: 'p/' };
function stored(key) {
  try { return JSON.parse(localStorage.getItem(PREFIX[game()] + key)); } catch { return null; }
}

/** The page is the game, initialised (its submit button is enabled once the game's init ran). */
export const ready = () => !!$('#form #guess') && !!$('#guess-btn') && !$('#guess-btn').disabled;
export const present = () => !!game() && !!$('#form #guess');

// ------------------------------------------------------------------ shared parts
/** Day, solvers, emoji meter, yesterday, messages, win, team: what both games show around the game area. */
function common() {
  const g = game();
  const days = stored('days') ?? {};
  const day = num(text($('#puzzle-num'))) || null;
  const success = $('#success');
  const won = !!success && (getComputedStyle(success).opacity === '1' || success.style.opacity === '1');
  const cloud = $('#cloud-button');
  const teamCode = text($('#team')) || text($('#team-status .teamcode')) || '';
  return {
    game: g,
    other: g === 'cemantix' ? 'pedantix' : 'cemantix',
    day, tries: Math.abs(days[day] ?? 0),
    solvers: num(text($('#solved'))) || null, solvedText: text($('#solved')),
    meter: text($('#day-meter')),
    error: $('#error')?.innerHTML.trim() ?? '',
    yesterday: $('#yesterday') ? { word: text($('#yesterday')), href: $('#yesterday').getAttribute('href') } : null,
    revealable: shown($('#secret')),
    won: won ? {
      ranking: text($('#ranking')), tries: text($('#tries')), story: $('#meter')?.innerHTML ?? '',
      see: !!$('#see')?.checked, word: $('#word') ? !!$('#word').checked : null,
      // Pédantix puts the article link inside #solution once found
      solution: $('#solution a[href], a#solution[href]') ? { label: text($('#solution')), href: $('#solution a[href], a#solution[href]').getAttribute('href') } : null,
    } : null,
    team: {
      in: cloud?.textContent.trim() === 'thunderstorm',
      members: num(text($('#team-members'))) || null,
      code: teamCode,
      loaded: !!$('#start'),
      status: text($('#team-status')), error: text($('#team-error')),
    },
    dialog: readDialog(),
  };
}

/** The game's modal (rules, FAQ, history, yesterday…), open when body has .dialog-open. The team panel (#cloud) is
 *  ours: never mirrored. */
function readDialog() {
  if (!document.body?.classList.contains('dialog-open')) return null;
  const panel = $$('#dialog .dialog-content').find(shown);
  if (!panel || panel.id === 'cloud') return panel ? { id: panel.id, mirror: false } : null;
  return { id: panel.id, mirror: true, html: panel.innerHTML };
}

// ------------------------------------------------------------------ Cémantix
/** Emoji and class of a guess, from its temperature and rank (cemantix.js L()). */
export function heat(temp, rank) {
  if (rank) {
    if (rank >= 1000) return { emoji: '🥳', cls: 'found' };
    if (rank === 999) return { emoji: '😱', cls: 'closest' };
    if (rank >= 990) return { emoji: '🔥', cls: 'burning' };
    if (rank >= 900) return { emoji: '🥵', cls: 'hot' };
    return { emoji: '😎', cls: 'warm' };
  }
  return temp < 0 ? { emoji: '🧊', cls: 'frozen' } : { emoji: '🥶', cls: 'cold' };
}

export function readCemantix() {
  const guesses = stored('guesses') ?? {};
  // a typed form and its canonical word share an order: keep one row per order (the canonical one comes last)
  const byOrder = new Map();
  for (const [word, [order, [temp, rank]]] of Object.entries(guesses)) byOrder.set(order, { word, order, temp, rank: rank ?? null });
  const rows = [...byOrder.values()].map(r => ({ ...r, ...heat(r.temp, r.rank) }));
  const last = text($('#guessed .word')) || rows.reduce((a, r) => (!a || r.order > a.order ? r : a), null)?.word || null;
  const legend = $$('.summary table.story tr').filter(tr => !tr.closest('thead') && !$('th', tr)).map(tr => [...tr.cells].map(text)).filter(c => c.length === 3)
    .map(([rank, emoji, temp]) => ({ rank, emoji, temp }));
  return { ...common(), kind: 'cemantix', rows, last, legend };
}

// ------------------------------------------------------------------ Pédantix
const rgb = s => (s.match(/\d+/g) ?? []).map(Number);
/** A word of the article, from what the game shows (its own properties on the span are invisible to us). */
function wordState(span) {
  const t = span.textContent.replace(/ /g, ' ');
  const bg = span.style.backgroundColor, color = span.style.color;
  if (!t.trim()) return { state: 'hidden', len: Math.max(1, t.length - 2) };
  const [r, g, b] = rgb(color);
  if (bg === 'rgb(102, 238, 102)') return { state: 'new', text: t.trim() };
  if (bg === 'rgb(51, 51, 51)') {
    if (r === 255 && b === 0) return { state: 'close', fresh: true, text: t.trim(), level: g / 255 };
    return { state: 'close', text: t.trim(), level: (r ?? 0) / 255 };
  }
  if (color === 'rgb(0, 221, 255)' || /^\d+$/.test(t.trim()) && span.style.minWidth) return { state: 'hidden', hint: t.trim(), len: num(t) || 1 };
  return { state: 'exact', text: t.trim() };
}

/** The article as nodes: text, line structure (h2 / p) and words. Re-read on each render (cheap: a few hundred spans). */
function article() {
  const wiki = $('#wiki');
  if (!wiki) return [];
  const blocks = [];
  const walk = (node, out) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { if (n.data) out.push({ t: n.data }); continue; }
      if (n.nodeType !== 1) continue;
      if (n.matches('script, style, ins, img, #wiki-img, .adsbygoogle') || n.querySelector?.('ins.adsbygoogle, #ad')) continue;
      if (n.classList.contains('w')) { out.push({ w: +n.id, title: n.classList.contains('h'), ...wordState(n) }); continue; }
      const tag = n.tagName.toLowerCase();
      out.push({ open: ['b', 'strong', 'i', 'em', 'sub', 'sup', 'abbr', 'small'].includes(tag) ? tag : 'span', latex: n.classList.contains('latex') });
      walk(n, out);
      out.push({ close: true });
    }
  };
  for (const el of wiki.children) {
    if (el.matches('h2, h3, p, ul, ol')) { const items = []; walk(el, items); blocks.push({ tag: el.tagName.toLowerCase(), items }); }
    else if (el.id === 'article') for (const p of el.children) { const items = []; walk(p, items); blocks.push({ tag: p.tagName.toLowerCase() === 'p' ? 'p' : 'div', items }); }
  }
  return blocks;
}

export function readPedantix() {
  const guesses = stored('guesses') ?? {};
  const rows = Object.entries(guesses).map(([word, [order, found]]) => {
    const vals = Object.values(found ?? {});
    return { word, order, exact: vals.filter(v => typeof v === 'string').length, close: vals.filter(v => typeof v === 'number').length };
  });
  const blocks = article();
  const words = blocks.flatMap(b => b.items.filter(x => 'w' in x));
  const count = s => words.filter(w => w.state === s || (s === 'exact' && w.state === 'new')).length;
  return {
    ...common(), kind: 'pedantix', rows, blocks,
    stats: { total: words.length, exact: count('exact'), close: count('close'), hidden: count('hidden'), title: words.filter(w => w.title).length },
    last: rows.reduce((a, r) => (!a || r.order > a.order ? r : a), null)?.word ?? null,
    pinned: $('#pin')?.textContent.includes('📌') ?? false,
  };
}

export const readGame = () => game() === 'pedantix' ? readPedantix() : readCemantix();

// ------------------------------------------------------------------ actions
const click = sel => { const el = typeof sel === 'string' ? $(sel) : sel; el?.click(); return !!el; };
export const actions = {
  /** Submits a guess the way a player does. NEVER from our own stack (the game would record a fake score):
   *  a timer calling the native requestSubmit has no frame of ours. See specs/sites.md#anti-automation. */
  guess(word) {
    const input = $('#guess'), form = $('#form');
    if (!input || !form || !ready()) return false;
    input.value = word;
    setTimeout(HTMLFormElement.prototype.requestSubmit.bind(form));
    return true;
  },
  /** Pédantix: click a hidden word (the game shows its length for 2 s). */
  word: i => click(document.getElementById(String(i))),
  switchGame: () => click(game() === 'cemantix' ? '#pedantix' : '#cemantix'),
  reveal: () => click('#reveal'),
  share: () => click('#share'),
  toggle: id => click(`#${id}`),   // #see, #word (after a win)
  openDialog: name => click(`#${name}-button`),
  yesterday: () => click('#yesterday'),
  closeDialog: () => click('#dialog-close'),
  /** Team panel: the game loads it when its cloud dialog opens. We open it, let it load, close it (our UI drives it). */
  async loadTeam() {
    if ($('#start')) return true;
    click('#cloud-button');
    for (let k = 0; k < 40 && !$('#start'); k++) await new Promise(r => setTimeout(r, 100));
    click('#dialog-close');
    return !!$('#start');
  },
  async createTeam() { if (await this.loadTeam()) click('#start'); },
  async joinTeam(code) {
    if (!await this.loadTeam()) return;
    $('#code').value = code.trim();
    click('#join');
  },
  async leaveTeam() { if (await this.loadTeam()) click('#leave'); },
};
