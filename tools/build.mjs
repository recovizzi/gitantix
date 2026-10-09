// Builds the extension from src/:
//   dist/extension/              MV3 extension (Chrome + Firefox)
//   dist/gitantix-extension.zip  the same, zipped (release asset, Chrome "Load unpacked")
import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { zipSync } from 'fflate';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = path.join(root, 'dist');
const ext = path.join(dist, 'extension');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(ext, 'icons'), { recursive: true });

const SITES = ['*://cemantix.certitudes.org/*', '*://pedantix.certitudes.org/*'];
const manifest = {
  manifest_version: 3,
  name: 'Gitantix — Cémantix & Pédantix as GitHub',
  short_name: 'Gitantix',
  version: pkg.version,
  description: pkg.description,
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  // the icon opens the mini version as a floating panel in the current tab (background.js → panel.js), the popup
  // where extensions can't run; host permissions: the mini version finds / opens the game's tab and talks to it
  action: { default_title: 'Gitantix', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
  background: { service_worker: 'background.js', scripts: ['background.js'] },   // Chrome / Firefox
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: SITES,
  content_scripts: [{ matches: SITES, css: ['page.css'], js: ['content.js'], run_at: 'document_start' }],
  web_accessible_resources: [{ resources: ['popup.html'], matches: ['<all_urls>'] }],   // framed by the panel
  browser_specific_settings: { gecko: { id: 'gitantix@recovizzi', strict_min_version: '142.0', data_collection_permissions: { required: ['none'] } } },
};
fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2));
for (const entry of ['content.js', 'popup.js', 'background.js', 'panel.js']) buildSync({
  entryPoints: [path.join(root, 'src/extension', entry)], outfile: path.join(ext, entry),
  bundle: true, format: 'iife', target: ['chrome120', 'firefox121'], loader: { '.css': 'text' }, legalComments: 'inline',
});
for (const f of ['popup.html']) fs.copyFileSync(path.join(root, 'src/extension', f), path.join(ext, f));
fs.copyFileSync(path.join(root, 'src/page.css'), path.join(ext, 'page.css'));
for (const s of [16, 32, 48, 128]) fs.copyFileSync(path.join(root, 'src/icons', `${s}.png`), path.join(ext, 'icons', `${s}.png`));

// Zipped in JS so the build doesn't need a `zip` binary (missing on stock Ubuntu/WSL and on Windows).
const files = {};
for (const f of fs.readdirSync(ext, { recursive: true })) {
  const p = path.join(ext, f);
  if (fs.statSync(p).isFile()) files[f.split(path.sep).join('/')] = fs.readFileSync(p);
}
fs.writeFileSync(path.join(dist, 'gitantix-extension.zip'), zipSync(files, { level: 9 }));
console.log(`dist/extension/  manifest v${manifest.version}`);
console.log('dist/gitantix-extension.zip');
