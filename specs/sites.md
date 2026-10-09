# What both games share

Both sites are by *enigmatix* (certitudes.org). Same page skeleton, same stylesheet
(`https://static.certitudes.org/html/cemantix.css`) and a shared module, `cemantix-base.js`, that each game's script
(`cemantix.js`, `pedantix.js`) configures with callbacks (`getScore`, `showGuess`, `showGuesses`, `getSecret`,
`getTurns`, `showStory`, `initPage`…).

## Page skeleton

```
#dialog-underlay > #dialog         modal; one .dialog-content per panel, filled on demand by fetching
                                   static.certitudes.org/html/<name>.html: #rules, #faq, #theme, #history,
                                   #cloud (teams), #story (share), #yestertable (Cémantix: yesterday's nearby words)
section > article
  aside                            left column
    nav                            Material icon links: #rules-button #faq-button #theme-button
                                   #history-button #cloud-button, then <sup id="team-members"> (team size)
    .summary                       "Jour nº<b id=puzzle-num>", #solved ("Trouvé par N personnes"),
                                   #day-meter (10 emoji progress), game legend, yesterday's answer link (#yesterday)
  .main
    #tabs                          a#cemantix / a#pedantix (class active|inactive): the game switch
                                   (click → location.replace('https://<game>.certitudes.org'))
    #content > #game
      #success                     shown once solved: #ranking, #tries, #meter, #share, #see (+ Pédantix #word)
      form#form                    input#guess (type=search), #previous (⤺ recall), input#guess-btn (submit,
                                   disabled until the game is initialised), label#error (messages / feedback)
      #secret > #reveal            "Révéler …" (a teammate found it)
      game area                    Cémantix: table#guessable · Pédantix: #wiki (the article)
footer
```

`script#script` carries `data-puzzle-number`, `data-utc-time` (new puzzle time, seconds UTC) and `data-app`.
`<html class="<mode>-<theme>">`: mode `light|dark` (from `localStorage.mode`: light / dark / system, default dark),
theme `colorful|grey`. `localStorage.blind` switches the colour-blind blocks (Pédantix squares 💚🟠🟥).

## Lifecycle

- `window.load` → init. The submit button stays **disabled until init is done**: an Enter before that does nothing.
- The rules dialog opens by itself the first time (`readRules` not stored).
- A Google consent dialog (Funding Choices, iframe) may cover the page on first visit: it must stay usable above
  our disguise (or the player can't get rid of it).
- Puzzle change at `data-utc-time`; after 24 h the page reloads itself (`#error`: "Le temps imparti…").
- `#solved` is refreshed by Firebase (live) or by polling `/stats?n=<num>` every 5 min.

## Storage (`localStorage`, same origin: readable by our content script)

Prefix: Cémantix `''`, Pédantix `'p/'`.

| Key | Content |
|---|---|
| `puzzleNumber` | the day the stored guesses belong to (reset when it changes) |
| `guesses` | `{ word: [order, score] }` — Cémantix score `[temperature, rank‰|null]`; Pédantix score: the `/score` mapping (see pedantix.md) |
| `days` | `{ dayNumber: n }`: n > 0 solved in n tries, n < 0 not solved yet after −n tries |
| `secret` | the answer once found (Cémantix: the word; Pédantix: `[page, title]`) |
| `ranking`, `turns` | rank among solvers, emoji story counts |
| `readRules`, `live`, `sync` | flags |
| `theme`, `mode`, `blind`, `animation` (no prefix) | display settings |

No `storage` event fires in the tab that writes: watch the DOM (MutationObserver) and re-read storage then.

## Anti-automation

`getScore()` (both games) starts with:

```js
const r = Error().stack;
if (Error.stackTraceLimit != 10 || r && r.split('\n').length > 4) return <fake result>;
```

(`cemantix-check.js` freezes `Error` and `Error.stackTraceLimit = 10`.) A normal submit has 3 lines
(`Error`, `getScore`, the submit handler). **Any frame of ours** on the stack (calling `requestSubmit()`, `click()`,
dispatching `submit`) adds lines → the game does **not** call the server and records:

- Cémantix: a random negative temperature (e.g. `voiture −30,32`), stored in `guesses` like a real one;
- Pédantix: the error "Je ne trouve pas ce mot.".

Verified (Playwright, 2026-10-09): `form.requestSubmit()` from page code → fake; 
`setTimeout(HTMLFormElement.prototype.requestSubmit.bind(form))` → real `/score` request and real score
(the timer calls a native function: no JS frame of ours). **This is the only way we submit.** Put the word in
`#guess.value` first. To re-check with the extension's isolated world, see if `/score` is requested.

## Teams ("Collaborer", the cloud icon)

Firebase Realtime Database (per-game projects, config in each game script). No account needed:

- `#cloud-button` click opens the dialog and loads `cemantix-cloud.html` into `#cloudbody`.
- **Create**: `#start` → a new node is pushed; `teamCode` = its key with `-` replaced by `Ô`; shown in
  `#team-status` ("Veuillez partager le code <b class=teamcode>…</b>"), copied to the clipboard, put in `#code`.
- **Join**: type the code in `#code`, click `#join` → "Vous avez rejoint l´équipe <b class=teamcode>…</b>" or
  `#team-error` "Code non valide.".
- **Leave**: `#leave` (in `#leave-team`, shown with `#team` = the code while in a team).
- While in a team: `#cloud-button` text becomes `thunderstorm`; `<sup id=team-members>` = number of members.
- Teammates' guesses arrive live and are shown like your own (Cémantix: only top‑1000 words are shared, i.e.
  `isCloudable` = rank > 0; Pédantix: guesses that revealed something). A teammate's win shows `#secret`
  ("Révéler…").
- The team lives for the day only. Leaving the page leaves the team (`beforeunload`).
- Also: "S'identifier avec Twitter" (`#signin`) to sync across devices — out of scope.

These buttons have no stack check: clicking them from our code is fine.

## History ("Historique")

`#history-button` → `<app>-history.html` + `GET /history` → `[[day, solvers, secret], …]`; the table
(`#historytable`) shows each day, your tries (`days`), ✅ / ❌ and the solver count.
