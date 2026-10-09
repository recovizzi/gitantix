# Pédantix — find the hidden Wikipedia page

https://pedantix.certitudes.org/ · script `pedantix.js` (+ `cemantix-base.js`, see [sites.md](sites.md)).

The start of a French Wikipedia article is shown with **every word hidden** (a dark block as wide as the word).
Each guess reveals the identical words, and shows **close words** (by meaning) in place of hidden ones, shaded by
closeness. Found when every word of the **title** is revealed.

## API (read only for us)

`POST /score?n=<day>`, JSON body `{"num": 1609, "word": "le", "answer": [<current title words>]}` →

```json
{"v": 30168, "w": "le", "x": {"Le": [2, 93], "les": [42, 67], "#61.51": [9, 15, 19], "#35.19": [53, 60]}}
```

`x` maps what to show → word indices (`span.w` ids, in document order): a plain key = the exact word revealed
(with its case/accents as in the article), `#<score>` = a close word (score ≈ 30…100) shown at those indices.
`d` (when present) = the secret page (found). Unknown word: `{"e": …}` → shown in `#error`.
`POST /page`, `answer=<page>` → the full article words (after a win: "Voir la page", "Révéler les mots séparément").

## DOM

```
form#form: span#pin (📍/📌: makes the form sticky), input#guess, #previous, input#guess-btn, label#error
#wiki.game
  h2 > span.h.w … (the TITLE words) + img#wiki-img (shown after a win)
  #article > p … span.w (every other word), text punctuation between; some in .latex (maths)
aside .summary table#guessable: th#chronoOrder "Nº", th#alphaOrder "Mot", a#collapse (🔻 / 🔺)
  tbody#guesses: <tr><td class=number>6</td><td class=word>ville</td></tr> …
```

- The guess list shows the **last 5** by default; `#collapse` toggles all (🔻 → 🔺). Sort by order or A→Z.
- `#error` after a guess: the result as squares, e.g. 🟩🟩🟧 (one 🟩 per exact word revealed, 🟧 per close word,
  🟥 nothing). `#day-meter`: 10 squares = share of words revealed exactly / close / still hidden.
- Click on a hidden word: shows its **length** for 2 s (`#0DF` cyan). After a win with "Révéler les mots
  séparément", the click shows the word.

## Word states (from inline styles — the `score`/`word` properties on the spans are invisible to us)

| State | Text | Inline style |
|---|---|---|
| hidden | `&nbsp;` × length | dark block (CSS), `min-width` = initial width |
| exact word, just revealed by the last guess | ` word ` | `background-color: #6E6` (green) |
| exact word | `word` | `color` = article text colour, `display: inline` |
| close word, from the last guess | ` guess ` | `background-color:#333`, `color: rgb(255, s, 0)` (orange) |
| close word | ` guess ` | `background-color:#333`, `color: rgb(s, s, s)` (grey) |

`s = round(255 · log10(score − 30) / 2)`: score 31 → 0 (dark), 100 → ~235 (bright). So **the brighter, the closer**.
A close word is replaced only by a closer one. Title words (`.h`) behave the same.

Storage (`p/guesses`, verified): `{ "le": [1, { "2": "Le", "9": 61.51, … }] }` — per guess, its order and, per
word index, the exact text revealed (string) or the closeness score (number). Enough to rebuild every word's state.

## Win

`getSecret`: found when every title word is revealed. `#success` like Cémantix, plus `#see` (show the whole page,
with the Wikipedia thumbnail) and `#word` (reveal words one by one on click). `#solution` links the article.
