# The disguise: a GitHub / GitLab project page

Decisions for milestone 1. Same technique as JetHub: the game page stays in place but is hidden; we draw our page
in a **shadow DOM** on top (`<gitantix-overlay>`), read the game's state (DOM + `localStorage`) and drive its own
controls. Style (GitHub / GitLab) and theme (light / dark / system) from the settings.

## Page

Both games are **two repositories of one organisation** — the switch between games is a repository switch:

```
[logo] certitudes / cemantix ▾            [ Go to… ]  [⚙ settings] [👥 2] [avatar]
<> Code   ⊙ Issues 12   ⇅ Pull requests   ▷ Actions   ▦ Projects   ⚙ Settings
───────────────────────────────────────────────────────────────────────────────
 main ▾  1682 days   ⊘ 12 109 solvers                         [ <> Code ▾ ]  ← team (collaborate)
 ┌ guess box ────────────────────────────────┐ ┌ About ─────────────────┐
 │ game area                                 │ │ day nº, solvers, legend│
 │                                           │ │ Recent guesses (5 ▾)   │
 └───────────────────────────────────────────┘ └────────────────────────┘
```

- Repo name = the game (`cemantix` / `pedantix`), org = `certitudes`; the `▾` next to the name (and a "Switch
  repository" entry) goes to the other game (the site's own `#tabs` link, i.e. `location.replace`).
- GitLab: left sidebar with the project; same content, Pajamas look.
- The page-level "Settings" (⚙ in the header) opens **our** settings panel (style, theme, disguise on/off) — the
  same settings as the popup, saved in `chrome.storage.sync`.

## Guess box

A GitHub search / "Go to file" style input with a primary button (**Commit** / **Submit**) — what you type goes to
`#guess`; Enter / the button submit **only** through the native bound `requestSubmit` (see sites.md). `#error`
text appears under the box as a flash (GitHub "flash" / GitLab alert). ↑ / ↓ recall previous inputs (we keep our
own list, like the game's #previous).

## Cémantix → the repository file list

The guesses table is the repo's **file list** (the "Code" tab), best first:

| Column | From | Look |
|---|---|---|
| icon | emoji | the game's emoji (🥳😱🔥🥵😎🥶🧊) as the file icon |
| name | word | file name, coloured by temperature (see palette) |
| proximity | rank ‰ | a "language bar"-style progress bar, width = rank/10 %, cold → hot gradient |
| °C | temperature | right aligned, monospace, coloured |
| ‰ | rank | right aligned, muted when empty |
| Nº | order | like the "last commit" column, muted |

- The **last guess** is pinned at the top like GitHub's "latest commit" bar (avatar + word + its line).
- Sorting via the column headers (temperature (default) / order / A→Z): the game's own `th` buttons.
- **Recent guesses** (chronological, newest first) in the sidebar like "Recent commits": **5 shown**, "Show all"
  expands, "Show less" folds (state kept per game).
- Legend of today's thresholds (aside's `table.story`) as a small "About" table; `#day-meter` as the emoji line.
- Win: `#success` as a green "merged" banner (rank, tries, story, Share = copy), `#see` as a toggle "Show nearby
  words".

### Palette (semantics kept)

Temperature classes map to 7 tokens per palette (light / dark × GitHub / GitLab), cold → hot:
`frozen (🧊, < 0 °C)`, `cold (🥶)`, `warm (😎, 1–899‰)`, `hot (🥵, 900–989)`, `burning (🔥, 990–998)`,
`closest (😱, 999)`, `found (🥳, 1000)`. Ranked words also get a continuous shade from the rank (like the game's
`255 − rank/12`), so two words of the same class still read in order. The bar: gradient from yellow to the class
colour (game look), on the palette's neutral track.

## Pédantix → the README

The article is the repository's **README.md**, rendered GitHub-style (`markdown-body`):

- Title (`h2 .h.w` words) as the README's `# heading`; paragraphs as paragraphs.
- Hidden word: a redaction block (`--fg` at low alpha, rounded like `code`), same width as the game's (we copy the
  span's width) — click shows its length (we click the game's span, which shows `#0DF` for 2 s: we mirror it).
- Exact word: plain text; **just revealed** by the last guess: green highlight (diff-add colour).
- Close word: the guessed word on a dark chip; brightness = closeness (`s` from the inline colour, mapped onto our
  scale); **from the last guess**: orange (like the game).
- The result squares (🟩🟧🟥) after each guess under the box; `#day-meter` in the About box.
- **Recent guesses** sidebar, same as Cémantix (5, expandable), plus A→Z / Nº sort.
- Win: banner + "Show page" / "Reveal words separately" toggles + the Wikipedia link.

## Collaborate (teams)

The green **`<> Code ▾`** button opens a GitHub "Clone" style dropdown, tab **Team**:

- not in a team: **Create a team code** (→ `#start`), and **Join** (input + button → `#code`, `#join`);
- in a team: the code in a read-only field with a **copy** button (like a clone URL), members count, **Leave**
  (→ `#leave`); errors from `#team-error`.
- Header shows team members (👥 n) when in a team. The game's dialog stays hidden; we open it in the background
  (click `#cloud-button` once) so its fragment and handlers exist, then drive its controls.

## Dialogs

Rules / FAQ / history / theme: links in the About box open the game's dialog content inside a GitHub-style modal
(we show the fetched HTML, restyled). Google consent: left above everything.

## Not in scope (for now)

Twitter sign-in / device sync, the game's own theme dialog (ours replaces it), ads (hidden).
