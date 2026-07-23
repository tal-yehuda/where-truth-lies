# Where Truth Lies

An interactive, playable tour of the philosophy of mathematics — formal systems,
Gödel, Turing, emergence, and inference — built as a single-page site. The guiding
thread: **mathematics runs forwards (axioms → theorems); run the machine backwards
(record → rules) and you get reverse mathematics — of which physics is just the
most familiar instance.** Every chapter is a hands-on game, not an essay you skim.

## Run it

```bash
npm install
npm run dev      # dev server (Vite)
npm run build    # production bundle -> dist/
npm run preview  # serve the production build
```

Open the printed local URL. Works from a normal browser; toggle light/dark with
the ☾/☀ button in the header.

## The chapters (each is a game)

1. **Formal Systems — MIU puzzle ladder.** Six derivation puzzles teach the four
   MIU rules (applicable rules glow; par scoring; derivation trail), capped by the
   *unsolvable* MU puzzle and a reveal of the I-count invariant — a first taste of
   a system proving its own limits. Keys `1`–`4` apply rules, `U` undoes.
2. **Truth — Gödel numbering sandbox + proof unroller.** Build formulas and watch
   their prime-power Gödel number update live; hit encode-to-target challenges;
   fully unroll G to see it *become* `¬Prov(⌜G⌝)`.
3. **Computability — Turing machine + build-a-machine challenges.** Verified preset
   programs, plus author-your-own tasks (flip bits / append / erase) checked by
   running the machine to halt. Includes an interactive halting paradox.
4. **Interpretation — Game of Life pattern challenges.** Build a still life, an
   oscillator, or a spaceship; the engine auto-detects each phenomenon as it
   emerges from purely local rules.
5. **Reverse Mathematics — inference game.** A source runs under one hidden
   rule-set, leaving a single continuous record. Watch it grow and eliminate every
   candidate rule-set that couldn't have produced it; when the surviving theory hits
   a state it can't make — a new symbol (a *shape*) or a new *pattern* over symbols
   already seen — a paradigm shift swaps in richer candidates and the record rolls
   on (it never resets). Three scripted, precisely-paced epochs. Physics is one
   reading of the game — the symbols could mean anything, or nothing. Keys `O`
   observe, `H` hint.

A cross-chapter **progress tracker** marks each chapter explored (✓ on the tab,
persisted in `localStorage`).

## Architecture

Vanilla JS + Vite, no framework. Everything is ES modules:

```
index.html            single entry, design-token stylesheet
style.css             design system (tokens, light + dark themes, responsive)
src/
  main.js             bootstrap: init demos, wire handlers, theme + progress
  core/               tabs, lazy-init registry, theme, progress
  lib/                shared utils: history (undo/redo), playback, dom, godel
  demos/              one module per interactive: miu, godel-sandbox,
                      proof-unroller, turing, halting, game-of-life,
                      interpretation-toggle, physics
legacy/               original pre-refactor script.js (backup)
```

## Verification

Puzzle content is proven correct before shipping, and every game is driven
end-to-end in a real browser:

- `scratchpad/validate-levels.mjs` — proves each physics epoch is solvable with a
  clean staggered pruning curve and an unproducible anomaly.
- `scratchpad/validate-miu.mjs` — BFS-checks every MIU puzzle is solvable, computes
  par, and confirms MU is unreachable.
- `scratchpad/drive-*.mjs` — Playwright scripts that play each chapter to
  completion (physics, MIU, Game of Life, Turing, Gödel, progress, full smoke),
  asserting behavior and checking for console errors.

Run one with `node scratchpad/drive-physics.mjs` (needs `npm run dev` running).
