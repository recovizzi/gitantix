# Gitantix

Play [Cémantix](https://cemantix.certitudes.org/) and [Pédantix](https://pedantix.certitudes.org/) disguised as a
GitHub or GitLab project page. A browser extension (Chrome, Edge, Firefox), built on the same principles as its
sibling project [JetHub](https://github.com/nilscrls/jethub) (JetPunk disguised as GitHub / GitLab).

> Status: **milestones 1 and 2 done, under test.** Both games are drawn as a GitHub or GitLab repository page
> (light / dark): guess box, Cémantix file list with emojis, temperatures, ‰ and proximity bars, Pédantix README
> with holes, recent guesses (5, expandable), game switch, teams (create / share / join / leave), in-page settings,
> the game's rules / FAQ / history in GitHub modals, win banner. The popup is the **mini version** of the last game
> opened (resizable, with team play), playing through the game's tab (see `specs/mini.md`).

## Goals

Everything below must be kept in mind for every change; `specs/` holds the details (how the games work, what
we decided and why).

### 1. The games as a GitHub / GitLab project page (first milestone)

- When the extension is on, each game page is drawn as a **GitHub or GitLab project page** (style chosen in the
  settings, light / dark / follow system), with the game's content inside it. The real game keeps running
  underneath: we read it and forward our input to it.
- **Cémantix** (find the secret word by semantic proximity):
  - the **guess field** (propose a word);
  - the **previous guesses** ranked by proximity, each with its **temperature** (°C), its **score / 1000 rank**,
    its **emoji** (🥶 🧊 😎 🥵 🔥 😱 …) and a **progress bar** showing the semantic proximity;
  - the **colours carry meaning** (cold → hot): they must be kept, mapped onto the GitHub / GitLab palette.
- **Pédantix** (find the title of a hidden Wikipedia page):
  - the **guess field**;
  - the **text with holes** (the hidden article), revealed words and their proximity shading (close words show
    greyed / coloured hints): the colours carry meaning and must be kept;
- For both games: the **history of guesses**, showing the **last 5** and expandable to all.
- **Switch between the two games** from the page (like switching repositories / projects).
- **Collaborate with other players** (the games' own team play, no account needed): show **your code**, share it,
  and **enter someone else's code** to join their game; the logic is the game's own (we only drive it).
- Settings button in the GitHub / GitLab page (like JetHub's popup settings, reachable from the page).

### 2. The mini version in the extension popup (second milestone, once 1 works fully)

- Clicking the extension icon opens a **small GitHub-style page** of the game opened last (Cémantix or Pédantix),
  in a **resizable** panel, without the page's furniture: only what the game needs.
  - writing area (guess field);
  - Pédantix: the text with holes;
  - Cémantix: the best results, each line with its emoji, temperature, score and proximity bar.
- Settings stay reachable from there (settings button in the GitHub design).

## Roadmap

| Version | Content |
|---|---|
| 0.1 | Base extension: build, settings popup, CI, release workflow, specs |
| 0.2 → 1.0 | Milestone 1: both games disguised as GitHub and GitLab, every feature above |
| 1.x | Milestone 2: the mini version in the popup (first version done) |

## Install (development)

```sh
pnpm install
pnpm build          # → dist/extension/ (load it unpacked) and dist/gitantix-extension.zip
pnpm lint           # web-ext lint, as in CI
pnpm icons          # re-render src/icons/*.png from src/logo.svg (Playwright Chromium)
pnpm smoke          # the built extension in headless Chromium: one real guess per game (needs the network)
node tools/icons-gen.mjs   # regenerate src/overlay/icons.js (Octicons / GitLab icons used by the overlay)
```

Chrome / Edge: `chrome://extensions` → Developer mode → **Load unpacked** → `dist/extension`.
Unpacked extensions don't reload by themselves: reload them after each build.

## Releases

Same workflow as JetHub (`.github/workflows/release.yml`), run by hand:

1. bump `version` in `package.json` (the manifest takes it from there), commit, merge;
2. `git tag v0.2.0 && git push origin v0.2.0`;
3. Actions → **Release** → Run workflow with the tag.

The release page gets `gitantix-chrome-<version>.crx` (Linux), `gitantix-chrome-<version>.zip` (Load unpacked, any
OS) and `gitantix-firefox-<version>.xpi` (signed by Mozilla, unlisted channel).

Repository secrets: `CHROME_CRX_KEY` (PEM private key; it fixes the extension ID, keep it), `MOZILLA_API_KEY` and
`MOZILLA_API_SECRET` (addons.mozilla.org → Developer Hub → API keys). `pnpm sign:firefox` signs locally with the same
keys from a git-ignored `.env` (see `.env.example`).

## Layout

| Path | What |
|---|---|
| `src/extension/` | content script (game detection, settings, mounts the overlay, serves the popup), popup (the mini version) |
| `src/overlay/` | the disguise: `read.js` (reads the games, drives their controls), `render.js` (GitHub / GitLab page), `main.js` (shadow DOM, events), `overlay.css` (palettes, temperature colours) |
| `src/page.css` | hides the game page under the disguise (Google's consent dialog stays usable) |
| `src/logo.svg`, `src/icons/` | logo and its PNG renders |
| `tools/build.mjs` | builds `dist/extension/` and the zip (esbuild, fflate) |
| `tools/sign-firefox.mjs` | local Firefox signing |
| `tools/smoke.mjs` | smoke test with the real extension |
| `specs/` | how the two games work, the disguise design and decisions |
| `.github/workflows/` | CI (build + lint on PRs and main), Release |

## License

MIT
