// Renders src/logo.svg to the PNG sizes the extension manifest needs (src/icons/*.png).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'src/logo.svg'), 'utf8').replace('<svg ', '<svg fill="#1f883d" ');
// any installed Chromium works: PW_CHROMIUM=/path/to/chrome overrides the bundled one
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const p = await b.newPage();
for (const s of [16, 32, 48, 128]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${s}px;height:${s}px;display:block}</style>${svg}`);
  await p.screenshot({ path: path.join(root, `src/icons/${s}.png`), omitBackground: true });
}
await b.close();
