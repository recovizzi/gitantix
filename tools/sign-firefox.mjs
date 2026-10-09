// Builds the extension and has Mozilla sign it for self-distribution (AMO "unlisted" channel):
//   dist/gitantix-firefox-<version>.xpi   installs by opening it in Firefox, survives restarts
// Needs WEB_EXT_API_KEY and WEB_EXT_API_SECRET (addons.mozilla.org → Developer Hub → API keys),
// from the environment or a git-ignored .env file. AMO accepts each version number once, so bump
// "version" in package.json before every run.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
  console.error('WEB_EXT_API_KEY and WEB_EXT_API_SECRET must be set (environment or .env)');
  process.exit(1);
}

run('node', ['tools/build.mjs']);
run('pnpm', ['exec', 'web-ext', 'lint', '--self-hosted', '--source-dir', 'dist/extension']);

// content.js is bundled by esbuild, so AMO wants the readable sources too.
const source = path.join(root, 'dist', 'source.zip');
run('git', ['archive', '--format=zip', '--output', source, 'HEAD']);

const signed = path.join(root, 'signed');
fs.rmSync(signed, { recursive: true, force: true });
run('pnpm', ['exec', 'web-ext', 'sign', '--source-dir', 'dist/extension', '--artifacts-dir', 'signed',
  '--channel', 'unlisted', '--upload-source-code', source, '--approval-timeout', '1800000']);

const xpi = fs.readdirSync(signed).find(f => f.endsWith('.xpi'));
if (!xpi) { console.error('web-ext sign produced no .xpi'); process.exit(1); }
const out = path.join(root, 'dist', `gitantix-firefox-${version}.xpi`);
fs.copyFileSync(path.join(signed, xpi), out);
console.log(`→ ${path.relative(root, out)}`);
