# Specs

What we learnt about the two games and what we decided, so the research is never done twice.
Studied on 2026-10-09 (Cémantix day nº1682, Pédantix day nº1609).

| File | Content |
|---|---|
| [sites.md](sites.md) | What both games share: `cemantix-base.js`, storage, dialogs, teams, history, themes, **the anti-automation check** |
| [cemantix.md](cemantix.md) | Cémantix: DOM, `/score` API, temperatures, emojis, progress bars, colours |
| [pedantix.md](pedantix.md) | Pédantix: DOM, `/score` API, the text with holes, word colours |
| [disguise.md](disguise.md) | How the games map onto a GitHub / GitLab project page (decisions) |
| [mini.md](mini.md) | The popup's mini version (milestone 2), first notes |

## Rules of thumb (read before coding)

1. **Never submit a guess from our own JavaScript stack.** The games check `Error().stack` and silently record a
   *random negative score* instead of asking the server (the player's game is then wrong for the day). Submit with
   `setTimeout(HTMLFormElement.prototype.requestSubmit.bind(form))` only. See [sites.md](sites.md#anti-automation).
2. **The game keeps running underneath.** We read its DOM / `localStorage` and drive its own controls (same approach
   as JetHub). We never call the game's APIs ourselves for anything that changes state.
3. **Colours carry the game's meaning** (cold → hot, far → close): every colour the game uses for a word has a
   counterpart in our palettes, light and dark, GitHub and GitLab.
4. Content scripts live in an *isolated world*: the games' JS objects and the expando properties they put on DOM
   nodes (`span.score`, `span.word`) are **not visible** to us. DOM, inline styles and `localStorage` are.
5. Test with the real extension in a real browser profile (JetHub lesson): injected test code has a different stack
   and a different world. `pnpm smoke` does it headless (Chromium `--headless=new` runs extensions). Google's consent
   dialog covers the page on a fresh profile: tests click `.fc-cta-consent` first.
6. Google's floating privacy badge forces `visibility` with inline `!important` styles: only an inline `!important`
   (set by main.js `hideStrays()`, undone on unmount) hides it.
