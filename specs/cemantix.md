# Cémantix — find the secret word by meaning

https://cemantix.certitudes.org/ · script `cemantix.js` (+ `cemantix-base.js`, see [sites.md](sites.md)).

Each guess gets a **temperature** (cosine similarity × 100, −100…100 °C). The 1000 words closest to the secret also
get a **rank in ‰** (1…1000; 1000 = the secret, 999 = the closest word). Warmer = closer.

## API (read only for us — the game calls it)

- `POST /score?n=<day>`, form body `word=<guess>` → `{"s": 0.1926, "v": 12167}` · close words also `"p": <rank>` ·
  unknown word `{"e": "Je ne connais pas le mot <i>xyzzyq</i>."}` · `"r"` = the day changed (reload).
  The game turns it into `score = [100*s, p]`; `v` = solvers so far.
- `POST /nearby`, `word=<secret>` → `{ word: [rank, temperature], … }` (top 1000) — used after a win ("Voir les mots
  les plus proches") and for yesterday's word (dialog `#yestertable`).
- `GET /stats?n=<day>` → `{v: solvers}`.

## DOM

```
form#form: input#guess, #previous (⤺: recall the last 20 inputs; ↑ / ↓ in the field do the same), input#guess-btn, label#error
table#guessable
  thead tr: th#chronoOrder "Nº" · th#alphaOrder "Mot" · th#temperatureOrder "°C" · "🌡" · "‰" · "Progression"
  thead tr#guessed            the LAST guess, shown on its own above the list
  tbody#guesses               tr.separator, then every guess (the last one again, with class "sink")
```

Row (`L()` in cemantix.js):

```html
<tr class="[popup] [sink]">
  <td class="number">7</td>                                  order of the guess
  <td class="word [close]" [color=… | style=color:…]>chien</td>
  <td class="number [close]" style="color: rgb(…)">19,26</td>   temperature, 2 decimals, locale format
  <td class="emoji">🥶</td>
  <td class="number [close]">950</td>                          rank ‰ (empty when not in the top 1000)
  <td><span class="progress-container"><span class="progress-bar" style="background-image:linear-gradient(to right, yellow, rgb(255,…,0)); width: 95%">&nbsp;…&nbsp;</span></span></td>
</tr>
```

- Sort (clickable headers): by temperature (default: rank, then temperature, descending), by order (toggles
  asc/desc), alphabetical.
- New guess: its bar grows (`.growing`, CSS transition) — animation can be off (`localStorage.animation`).
- Already guessed word: shown again (no new try).
- Bad word: `#error` gets the message.

## Emojis and colours (the semantics to keep)

| Rank ‰ / temperature | Emoji | Meaning |
|---|---|---|
| 1000 | 🥳 | found ("BINGO !" in the bar) |
| 999 | 😱 | the closest word |
| 990–998 | 🔥 | very hot |
| 900–989 | 🥵 | hot |
| 1–899 | 😎 | warm (top 1000) |
| no rank, ≥ 0 °C | 🥶 | cold |
| no rank, < 0 °C | 🧊 | frozen |

Legend in the aside (thresholds, °C of today's puzzle): 1000 🥳 100 · 999 😱 47,00 · 990 🔥 38,04 · 900 🥵 29,13 ·
1 😎 21,04 · 🥶 0 · 🧊 −100 (temperatures change every day: read them from `.summary table.story`).

Colours (`f` in `L()`): dark mode — ranked: `rgb(255, 255 − rank/12, 0)` (yellow → orange), unranked
`rgb(128, 200, 255)` (light blue); light mode — ranked `rgb(255, 84 − rank/12, 0)` (orange → red), unranked
`rgb(16, 64, 255)` (blue). Progress bar: `linear-gradient(to right, yellow, rgb(255, 255 − rank/4, 0))`, width =
rank / 10 %.

`#day-meter`: 10 emojis summarising your guesses by category (🧊🥶😎🥵🔥😱).

## Win

`#success` shows rank among solvers (🥇🥈🥉), tries, the emoji story (`#meter`), Share (`#share` → copies
"J'ai trouvé #cemantix nº… en N coups !" + story), and `#see` "Voir les mots les plus proches" (merges the top 1000
into the table). Confetti canvas `#confetti-canvas`.
