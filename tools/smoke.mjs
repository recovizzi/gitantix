// Smoke test with the REAL built extension (pnpm build first): Chromium (headless "new", which runs extensions)
// opens both games in a throwaway profile, accepts Google's consent, guesses a word in our box and checks that
// 1. the game really asked its server (/score) — i.e. the anti-automation check didn't catch us (specs/sites.md);
// 2. our page shows the guess;
// 3. the guess box keeps the focus (the game focuses its own field after each guess).
// Needs the network. `pnpm exec playwright install chromium` once.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const ext = path.join(root, 'dist/extension');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gitantix-smoke-'));
const ctx = await chromium.launchPersistentContext(profile, {
  headless: false, locale: 'fr-FR', viewport: { width: 1360, height: 900 },
  args: ['--headless=new', `--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
const shadow = (p, fn) => p.evaluate(`(() => { const s = document.querySelector('gitantix-overlay')?.shadowRoot; return (${fn})(s); })()`);
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed++; };

for (const [game, word, selector] of [['cemantix', 'chien', '.gx-table tbody tr'], ['pedantix', 'le', '.gx-recent li']]) {
  const p = await ctx.newPage();
  const scores = [];
  p.on('request', r => { if (r.url().includes('/score')) scores.push(r.postData()); });
  await p.goto(`https://${game}.certitudes.org/`, { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const consent = p.locator('.fc-cta-consent');
  if (await consent.count()) { await consent.first().click(); await p.waitForTimeout(500); }
  check(await shadow(p, s => !!s?.querySelector('[data-gx-input]')), `${game}: disguise drawn`);
  await shadow(p, s => s.querySelector('[data-gx-action=dialog-close]')?.click());
  const box = p.locator('gitantix-overlay [data-gx-input]');
  await box.fill(word); await box.press('Enter');
  await p.waitForTimeout(2000);
  check(scores.length === 1, `${game}: "${word}" sent to the game's server (${scores.length} /score request)`);
  // the game grabs the focus after a guess: ours must keep it, so the next word is typed without clicking
  check(await shadow(p, s => s.activeElement?.matches('[data-gx-input]')), `${game}: the guess box keeps the focus`);
  await p.keyboard.type('maison'); await p.keyboard.press('Enter');
  await p.waitForTimeout(2000);
  check(scores.length === 2, `${game}: a second word typed without clicking is sent (${scores.length} /score requests)`);
  check(await shadow(p, `s => s.querySelectorAll(${JSON.stringify(selector)}).length`) > 0, `${game}: the guess is shown`);
  await p.close();
}
await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
