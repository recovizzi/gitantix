// Draws the games as a GitHub / GitLab repository page (HTML strings, rendered in the shadow root).
// Design decisions: specs/disguise.md.
import { icons } from './icons.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = s => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
const n0 = n => (n ?? 0).toLocaleString('en-US');
export const ORG = 'certitudes';
export const RECENT = 5;   // recent guesses shown before "Show all"

export function makeIcon(set) {
  return (name, cls = '') => `<svg class="gx-icon ${cls}" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">${icons[set][name] ?? icons[set].fallback}</svg>`;
}

/** GitHub-style 5×5 mirrored identicon as a data URI. */
export function identicon(name) {
  const h = hash(name), hue = h % 360;
  let rects = '';
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) {
      rects += `<rect x="${x + 0.5}" y="${y + 0.5}" width="1" height="1"/>`;
      if (x < 2) rects += `<rect x="${4 - x + 0.5}" y="${y + 0.5}" width="1" height="1"/>`;
    }
  }
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6"><rect width="6" height="6" fill="#f0f0f0"/><g fill="hsl(${hue} 55% 55%)">${rects}</g></svg>`)}`;
}

const TITLES = { cemantix: 'Find the secret word by meaning', pedantix: 'Find the hidden Wikipedia page' };

// ------------------------------------------------------------------ shell
/** The page skeleton: regions are filled by main.js on every change. */
export function shell(m, flavor) {
  const gl = flavor === 'gitlab';
  return `<div class="gx" data-flavor="${flavor}">
    <div data-gx-region="header"></div>
    <div data-gx-region="menu"></div>
    <div data-gx-region="dialog"></div>
    <div class="gx-body">
      ${gl ? '<div data-gx-region="sidebar"></div>' : ''}
      <main class="gx-main">
        <div data-gx-region="repohead"></div>
        <div class="gx-layout">
          <div class="gx-content">
            <div data-gx-region="toolbar"></div>
            <form class="gx-guess" data-gx-form autocomplete="off">
              <label class="gx-guess-field">${makeIcon(flavor)('git-commit')}<input data-gx-input type="search" placeholder="${m.kind === 'pedantix' ? 'Guess a word of the page…' : 'Guess the secret word…'}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="send"></label>
              <button class="gx-btn gx-btn-primary" type="submit">${gl ? 'Submit' : 'Commit'}</button>
            </form>
            <div data-gx-region="flash"></div>
            <div data-gx-region="win"></div>
            <div data-gx-region="game"></div>
          </div>
          <aside class="gx-side" data-gx-region="side"></aside>
        </div>
      </main>
    </div>
  </div>`;
}

export function header(m, st, i, flavor) {
  const gl = flavor === 'gitlab';
  const team = m.team.in ? `<button class="gx-icon-btn gx-bordered" data-gx-action="menu" data-menu="team" title="Team">${i('people')}<span class="gx-counter">${m.team.members ?? 1}</span></button>` : '';
  const crumbs = `<a data-gx-action="menu" data-menu="switch">${ORG}</a><span>/</span><button class="gx-repo-switch" data-gx-action="menu" data-menu="switch"><b>${m.game}</b>${i('triangle-down')}</button>`;
  if (gl) return `<header class="gx-header">
      <span class="gx-logo gx-logo-gl">${i('tanuki')}</span>
      <button class="gx-icon-btn" data-gx-action="sidebar" title="Toggle sidebar">${i('sidebar')}</button>
      <nav class="gx-crumbs">${crumbs}</nav>
      <span class="gx-spacer"></span>
      ${team}
      <button class="gx-icon-btn" data-gx-action="menu" data-menu="settings" title="Settings">${i('gear')}</button>
      <img class="gx-avatar" src="${identicon('you')}" alt="">
    </header>`;
  return `<header class="gx-header">
      <button class="gx-icon-btn gx-bordered">${i('three-bars')}</button>
      <span class="gx-logo">${i('mark-github')}</span>
      <nav class="gx-crumbs">${crumbs}</nav>
      <span class="gx-spacer"></span>
      ${team}
      <button class="gx-icon-btn gx-bordered" data-gx-action="menu" data-menu="settings" title="Settings">${i('gear')}</button>
      <img class="gx-avatar" src="${identicon('you')}" alt="">
    </header>
    <nav class="gx-tabs">${[['code', 'Code', true], ['issue-opened', 'Issues', false, m.rows.length], ['git-pull-request', 'Pull requests'], ['play', 'Actions'], ['table', 'Projects'], ['shield', 'Security'], ['graph', 'Insights']]
      .map(([ic, label, on, count]) => `<a class="gx-tab${on ? ' gx-on' : ''}">${i(ic)}<span>${label}</span>${count ? `<span class="gx-counter">${n0(count)}</span>` : ''}</a>`).join('')}</nav>`;
}

/** GitLab's project sidebar. */
export function sidebar(m, i) {
  const item = (ic, label, on, count) => `<a class="gx-nav-item${on ? ' gx-on' : ''}">${i(ic)}<span>${label}</span>${count ? `<span class="gx-counter">${count}</span>` : ''}</a>`;
  return `<nav class="gx-sidebar">
    <div class="gx-project"><span class="gx-project-avatar">${m.game[0].toUpperCase()}</span><b>${m.game}</b></div>
    ${item('repo', 'Repository', true)}${item('issue-opened', 'Issues', false, m.rows.length)}${item('git-pull-request', 'Merge requests')}
    ${item('play', 'Build')}${item('shield', 'Secure')}${item('graph', 'Analyze')}${item('gear', 'Settings')}
  </nav>`;
}

export function repoHead(m, i, flavor) {
  const gl = flavor === 'gitlab';
  return `<div class="gx-repohead">
    ${gl ? `<span class="gx-project-avatar gx-project-avatar-lg">${m.game[0].toUpperCase()}</span>` : `<img class="gx-avatar gx-avatar-md" src="${identicon(ORG)}" alt="">`}
    <h1>${gl ? '' : `<span class="gx-muted">${ORG} /</span> `}<b>${m.game}</b></h1>
    <span class="gx-label">Public</span>
    <span class="gx-spacer"></span>
    <button class="gx-btn gx-btn-sm" data-gx-action="menu" data-menu="switch">${i('arrow-switch')} Switch to ${m.other}</button>
    <button class="gx-btn gx-btn-sm" data-gx-action="menu" data-menu="team">${i('eye')} ${m.team.in ? 'Team' : 'Watch'}<span class="gx-counter">${m.team.in ? m.team.members ?? 1 : 0}</span></button>
  </div>`;
}

/** Branch bar above the guess box: day, tries, and the green Code button (teams). */
export function toolbar(m, i, flavor) {
  const gl = flavor === 'gitlab';
  return `<div class="gx-toolbar">
    <button class="gx-btn gx-btn-sm">${i('git-branch')} main ${i('triangle-down')}</button>
    <span class="gx-muted gx-meta">${i('git-commit')} <b>${n0(m.rows.length)}</b> ${m.rows.length === 1 ? 'commit' : 'commits'}</span>
    <span class="gx-muted gx-meta">${i('tag')} day <b>${m.day ?? '—'}</b></span>
    <span class="gx-spacer"></span>
    <span class="gx-menu-wrap"><button class="gx-btn gx-btn-sm ${gl ? 'gx-btn-confirm' : 'gx-btn-primary'}" data-gx-action="menu" data-menu="team">${i('code')} Code ${i('triangle-down')}</button></span>
  </div>`;
}

// ------------------------------------------------------------------ messages under the box
export function flash(m, st, i) {
  if (!m.error) return '';
  const squares = /^[🟩🟧🟥💚🟠\s]+$/u.test(m.error.replace(/<[^>]*>/g, ''));
  const bad = /connais|trouve pas|erreur|error/i.test(m.error);
  return `<div class="gx-flash ${bad ? 'gx-flash-error' : squares ? 'gx-flash-ok' : ''}">${i(bad ? 'alert' : 'check-circle-fill')}<span>${squares ? `<b>${esc(st.lastSent ?? '')}</b> ` : ''}${m.error}</span></div>`;
}

export function winBanner(m, i) {
  const w = m.won;
  if (!w) return m.revealable ? `<div class="gx-flash gx-flash-warn">${i('people')} <span>A teammate found it.</span><span class="gx-spacer"></span><button class="gx-btn gx-btn-sm" data-gx-action="reveal">Reveal</button></div>` : '';
  // the game writes "🥇1er" / "12345e" and "7 coups": in English
  const medal = (w.ranking.match(/🥇|🥈|🥉/u) ?? [''])[0], rank = +w.ranking.replace(/\D/g, '');
  const tries = +w.tries.replace(/\D/g, '');
  const story = w.story.replace(/<br\s*\/?>/gi, ' ').replace(/<(?!\/?sup)[^>]*>/g, '');
  return `<div class="gx-merged">
    <div class="gx-merged-icon">${i('git-merge')}</div>
    <div class="gx-merged-body">
      <b>Merged!</b> You are ${rank ? `<b>${medal}#${n0(rank)}</b> to find it` : 'one of those who found it'}${tries ? `, in <b>${tries} ${tries === 1 ? 'try' : 'tries'}</b>` : ''}.
      <div class="gx-story">${story}</div>
      <div class="gx-merged-actions">
        <button class="gx-btn gx-btn-sm" data-gx-action="share">${i('copy')} Share</button>
        <label class="gx-check"><input type="checkbox" data-gx-toggle="see"${w.see ? ' checked' : ''}> ${m.kind === 'pedantix' ? 'Show the page' : 'Show nearby words'}</label>
        ${w.word !== null ? `<label class="gx-check"><input type="checkbox" data-gx-toggle="word"${w.word ? ' checked' : ''}> Reveal words separately</label>` : ''}
        ${w.solution?.href ? `<a href="${esc(w.solution.href)}" target="_blank" rel="noopener">${i('link-external')} Wikipedia</a>` : ''}
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ Cémantix: the file list
const SORTS = { temp: 'Temperature', order: 'Order', alpha: 'Name' };
export function cemantixRows(m, sort) {
  const rows = [...m.rows];
  if (sort === 'alpha') return rows.sort((a, b) => a.word.localeCompare(b.word, 'fr'));
  if (sort === 'order') return rows.sort((a, b) => b.order - a.order);
  return rows.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || b.temp - a.temp);
}
const temp = t => (t ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** One guess as a file row: emoji icon, word, proximity bar, °C, ‰, order. */
function fileRow(r, latest) {
  const shade = r.rank ? Math.min(1, r.rank / 1000) : 0;
  return `<tr class="gx-h-${r.cls}${latest ? ' gx-latest-row' : ''}" style="--shade:${shade.toFixed(3)}">
    <td class="gx-emoji">${r.emoji}</td>
    <td class="gx-word">${esc(r.word)}</td>
    <td class="gx-bar-cell">${r.rank ? `<span class="gx-bar"><span style="width:${Math.min(100, r.rank / 10)}%">${r.rank >= 1000 ? 'BINGO!' : ''}</span></span>` : ''}</td>
    <td class="gx-num gx-temp">${temp(r.temp)} °C</td>
    <td class="gx-num gx-rank">${r.rank ? `${r.rank}‰` : ''}</td>
    <td class="gx-num gx-order">#${r.order}</td>
  </tr>`;
}
export function cemantixGame(m, st, i) {
  const rows = cemantixRows(m, st.sort);
  const last = m.rows.find(r => r.word === m.last) ?? null;
  const th = (key, label, cls = '') => `<th class="${cls}"><button class="gx-th${st.sort === key ? ' gx-on' : ''}" data-gx-action="sort" data-value="${key}">${label}${st.sort === key ? i('sort-desc') : ''}</button></th>`;
  return `<div class="gx-box gx-files">
    <div class="gx-latest">
      ${last ? `<img class="gx-avatar" src="${identicon('you')}" alt=""><b>you</b> <span class="gx-latest-word gx-h-${last.cls}">${last.emoji} ${esc(last.word)}</span>
        <span class="gx-muted">${temp(last.temp)} °C${last.rank ? ` · ${last.rank}‰` : ''}</span><span class="gx-spacer"></span><span class="gx-muted">#${last.order}</span>`
        : `<span class="gx-muted">${i('light-bulb')} No commits yet — guess a word to start.</span>`}
    </div>
    ${rows.length ? `<table class="gx-table">
      <thead><tr><th></th>${th('alpha', 'Word')}<th>Proximity</th>${th('temp', '°C', 'gx-num')}<th class="gx-num">‰</th>${th('order', 'Nº', 'gx-num')}</tr></thead>
      <tbody>${rows.map(r => fileRow(r, r.word === m.last)).join('')}</tbody>
    </table>` : ''}
  </div>`;
}

// ------------------------------------------------------------------ Pédantix: the README
function wordHtml(x) {
  const attrs = `data-gx-word="${x.w}"${x.title ? ' data-title' : ''}`;
  if (x.state === 'hidden') return `<span class="gx-w gx-w-hidden" ${attrs} style="--len:${x.len}" title="Click to see its length">${x.hint ? esc(x.hint) : ''}</span>`;
  if (x.state === 'close') return `<span class="gx-w gx-w-close${x.fresh ? ' gx-w-fresh' : ''}" ${attrs} style="--level:${x.level.toFixed(3)}">${esc(x.text)}</span>`;
  return `<span class="gx-w gx-w-${x.state}" ${attrs}>${esc(x.text)}</span>`;
}
/** Items with properly matched closing tags. */
function blockHtml(items) {
  const stack = [];
  let out = '';
  for (const x of items) {
    if ('t' in x) out += esc(x.t);
    else if ('w' in x) out += wordHtml(x);
    else if (x.open) { stack.push(x.open); out += `<${x.open}${x.latex ? ' class="gx-latex"' : ''}>`; }
    else if (x.close) out += `</${stack.pop() ?? 'span'}>`;
  }
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}
export function pedantixGame(m, i) {
  const s = m.stats;
  const pct = k => s.total ? (s[k] / s.total * 100) : 0;
  return `<div class="gx-box gx-readme">
    <div class="gx-readme-head">${i('book')} <b>README.md</b><span class="gx-spacer"></span>
      <span class="gx-muted">${n0(s.exact)} / ${n0(s.total)} words</span></div>
    <div class="gx-langbar" title="exact ${s.exact} · close ${s.close} · hidden ${s.hidden}">
      <span class="gx-lb-exact" style="width:${pct('exact')}%"></span><span class="gx-lb-close" style="width:${pct('close')}%"></span>
    </div>
    <article class="gx-markdown">${m.blocks.map(b => b.tag === 'h2' || b.tag === 'h3'
      ? `<h1>${blockHtml(b.items)}</h1>` : `<${b.tag}>${blockHtml(b.items)}</${b.tag}>`).join('')}</article>
  </div>`;
}

// ------------------------------------------------------------------ sidebar: About, recent guesses
export function side(m, st, i) {
  const legend = m.kind === 'cemantix' && m.legend.length ? `<table class="gx-legend">${m.legend.map(l => `<tr><td>${esc(l.emoji)}</td><td class="gx-num">${esc(l.rank)}${l.rank ? '‰' : ''}</td><td class="gx-num gx-muted">${esc(l.temp)} °C</td></tr>`).join('')}</table>` : '';
  const recent = [...m.rows].sort((a, b) => b.order - a.order);
  const shown = st.expanded ? recent : recent.slice(0, RECENT);
  const line = r => m.kind === 'cemantix'
    ? `<li class="gx-commit gx-h-${r.cls}"><span class="gx-emoji">${r.emoji}</span><span class="gx-word">${esc(r.word)}</span><span class="gx-spacer"></span><span class="gx-num">${temp(r.temp)}°</span></li>`
    : `<li class="gx-commit"><span class="gx-sq">${r.exact ? '🟩' : r.close ? '🟧' : '🟥'}</span><span class="gx-word">${esc(r.word)}</span><span class="gx-spacer"></span><span class="gx-muted gx-num">${r.exact ? `+${r.exact}` : ''}${r.close ? ` ~${r.close}` : ''}</span></li>`;
  return `<section class="gx-about">
      <h2>About</h2>
      <p>${TITLES[m.game]}. Day <b>nº${m.day ?? '—'}</b>.</p>
      <p class="gx-muted gx-meta">${i('people')} ${m.solvers != null ? `<b>${n0(m.solvers)}</b> solvers` : esc(m.solvedText)}</p>
      ${m.tries ? `<p class="gx-muted gx-meta">${i('git-commit')} <b>${m.tries}</b> ${m.tries === 1 ? 'try' : 'tries'} today</p>` : ''}
      <p class="gx-meter" title="Today">${esc(m.meter)}</p>
      ${legend}
      <p class="gx-links">
        <a data-gx-action="dialog" data-value="rules">${i('book')} Rules</a>
        <a data-gx-action="dialog" data-value="faq">${i('question')} FAQ</a>
        <a data-gx-action="dialog" data-value="history">${i('history')} History</a>
      </p>
      ${m.yesterday ? `<p class="gx-muted">Yesterday: <a data-gx-action="yesterday" ${m.kind === 'pedantix' ? `href="${esc(m.yesterday.href)}" target="_blank" rel="noopener"` : ''}>${esc(m.yesterday.word)}</a></p>` : ''}
    </section>
    <section class="gx-recent">
      <h2>Recent commits <span class="gx-counter">${n0(recent.length)}</span>
        ${m.kind === 'pedantix' ? '' : ''}</h2>
      ${recent.length ? `<ul>${shown.map(line).join('')}</ul>` : '<p class="gx-muted">No commits yet.</p>'}
      ${recent.length > RECENT ? `<button class="gx-link-btn" data-gx-action="expand">${i(st.expanded ? 'fold' : 'unfold')} ${st.expanded ? 'Show less' : `Show all ${n0(recent.length)}`}</button>` : ''}
    </section>`;
}

// ------------------------------------------------------------------ menus: switch, team (Code ▾), settings
export function menu(m, st, i, opts) {
  if (st.menu === 'switch') return `<div class="gx-pop gx-pop-left" data-gx-stop>
      <div class="gx-pop-head">Switch repository</div>
      ${['cemantix', 'pedantix'].map(g => `<button class="gx-menu-item${g === m.game ? ' gx-on' : ''}" data-gx-action="switch" data-value="${g}">${i(g === m.game ? 'check' : 'repo')}<span><b>${ORG}/${g}</b><small class="gx-muted">${TITLES[g]}</small></span></button>`).join('')}
    </div>`;
  if (st.menu === 'team') {
    const t = m.team;
    const body = t.in
      ? `<p>${i('people')} Team of <b>${t.members ?? 1}</b> ${(t.members ?? 1) === 1 ? 'member' : 'members'}. Share this code to invite someone:</p>
         <div class="gx-clone"><input readonly value="${esc(t.code)}" data-gx-team-code><button class="gx-icon-btn gx-bordered" data-gx-action="copy-code" title="Copy">${i(st.copied ? 'check' : 'copy')}</button></div>
         <button class="gx-btn gx-btn-sm gx-btn-danger" data-gx-action="team-leave">${i('sign-out')} Leave the team</button>`
      : `<p class="gx-muted">Play together: everyone in the team gets the others' guesses (no account, valid today only).</p>
         <button class="gx-btn gx-btn-sm gx-btn-primary gx-block" data-gx-action="team-create">${i('person-add')} Create a team code</button>
         <div class="gx-or"><span>or join one</span></div>
         <form class="gx-clone" data-gx-join><input placeholder="Team code" data-gx-team-input autocomplete="off" spellcheck="false"><button class="gx-btn gx-btn-sm" type="submit">Join</button></form>`;
    return `<div class="gx-pop gx-pop-right" data-gx-stop>
      <div class="gx-pop-tabs"><span class="gx-on">${i('people')} Team</span></div>
      <div class="gx-pop-body">${body}
        ${st.teamBusy ? `<p class="gx-muted">${i('sync')} Working…</p>` : ''}
        ${teamMessage(t, i)}
      </div>
    </div>`;
  }
  if (st.menu === 'settings') return `<div class="gx-modal-back" data-gx-action="menu-close"><div class="gx-modal" data-gx-stop>
      <div class="gx-modal-head"><b>${i('gear')} Settings</b><span class="gx-spacer"></span><button class="gx-icon-btn" data-gx-action="menu-close">${i('x')}</button></div>
      <div class="gx-modal-body gx-settings">
        <label>Style <select data-gx-setting="flavor"><option value="github"${opts.flavor === 'github' ? ' selected' : ''}>GitHub</option><option value="gitlab"${opts.flavor === 'gitlab' ? ' selected' : ''}>GitLab</option></select></label>
        <label>Theme <select data-gx-setting="mode">${[['auto', 'Follow system'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}"${opts.mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="gx-check"><input type="checkbox" data-gx-setting="disguise"${opts.disguise ? ' checked' : ''}> Disguise the games (off: the original page)</label>
      </div>
    </div></div>`;
  return '';
}

// the game's team messages (French), in the disguise's English
const TEAM_EN = [[/copi/i, 'Code copied to the clipboard.', true], [/non valide/i, 'Invalid code.'], [/entrer un code/i, 'Please enter a code.'], [/erreur/i, 'Something went wrong, try again.']];
function teamMessage(t, i) {
  const msg = t.error || (!t.in ? t.status : '');
  if (!msg) return '';
  const [, en, ok] = TEAM_EN.find(([re]) => re.test(msg)) ?? [null, msg, false];
  return `<p class="${ok ? 'gx-muted' : 'gx-danger'}">${i(ok ? 'check' : 'alert')} ${esc(en)}</p>`;
}

/** The game's own dialog (rules, FAQ, history…), mirrored in a GitHub modal. */
export function dialog(d, i) {
  if (!d?.mirror) return '';
  const titles = { rules: 'Rules', faq: 'FAQ', history: 'History', yestertable: 'Yesterday', story: 'Share', theme: 'Colours' };
  return `<div class="gx-modal-back" data-gx-action="dialog-close"><div class="gx-modal gx-modal-wide" data-gx-stop>
    <div class="gx-modal-head"><b>${titles[d.id] ?? 'Info'}</b><span class="gx-spacer"></span><button class="gx-icon-btn" data-gx-action="dialog-close">${i('x')}</button></div>
    <div class="gx-modal-body gx-markdown gx-dialog-html">${d.html}</div>
  </div></div>`;
}

export const title = (m, flavor) => flavor === 'gitlab' ? `${m.game} · ${ORG} · GitLab` : `${ORG}/${m.game}: ${TITLES[m.game]}`;
export { SORTS };

// ------------------------------------------------------------------ the popup's mini version (specs/mini.md)
/** Mini page: compact header, guess box, then only the game (Cémantix best results / Pédantix text with holes). */
export function miniShell(flavor) {
  const i = makeIcon(flavor);
  return `<div class="gx gx-mini" data-flavor="${flavor}">
    <div data-gx-region="header"></div>
    <div data-gx-region="menu"></div>
    <div class="gx-mini-body">
      <form class="gx-guess" data-gx-form autocomplete="off">
        <label class="gx-guess-field">${i('git-commit')}<input data-gx-input type="search" placeholder="Guess…" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="send"></label>
        <button class="gx-btn gx-btn-primary" type="submit">${flavor === 'gitlab' ? 'Submit' : 'Commit'}</button>
      </form>
      <div data-gx-region="note"></div>
      <div data-gx-region="flash"></div>
      <div data-gx-region="win"></div>
      <div data-gx-region="game"></div>
    </div>
  </div>`;
}

export function miniHeader(m, st, i, flavor, { close = false } = {}) {
  const gl = flavor === 'gitlab';
  return `<header class="gx-mini-head">
    <span class="gx-logo${gl ? ' gx-logo-gl' : ''}">${i(gl ? 'tanuki' : 'mark-github')}</span>
    <nav class="gx-crumbs"><span class="gx-muted">${ORG}</span><span>/</span><button class="gx-repo-switch" data-gx-action="menu" data-menu="switch"><b>${esc(m.game)}</b>${i('triangle-down')}</button></nav>
    <span class="gx-spacer"></span>
    ${m.day ? `<span class="gx-muted gx-meta" title="Day">${i('tag')} ${m.day}</span>` : ''}
    <button class="gx-icon-btn" data-gx-action="open-tab" title="Open the full page">${i('link-external')}</button>
    <button class="gx-icon-btn${m.team?.in ? ' gx-team-on' : ''}" data-gx-action="menu" data-menu="team" title="${m.team?.in ? `Team: ${m.team.members ?? 1}` : 'Play with friends'}">${i('people')}${m.team?.in ? `<span class="gx-counter">${m.team.members ?? 1}</span>` : ''}</button>
    <button class="gx-icon-btn" data-gx-action="menu" data-menu="settings" title="Settings">${i('gear')}</button>
    ${close ? `<button class="gx-icon-btn" data-gx-action="close" title="Close (Esc)">${i('x')}</button>` : ''}
  </header>`;
}

/** What the mini page shows while it connects to the game's tab. */
export const miniStatus = (msg, i) => `<div class="gx-np-empty">${i('sync')} <span>${esc(msg)}</span></div>`;
