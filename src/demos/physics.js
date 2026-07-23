// Chapter 5 — Reverse Mathematics (endless edition, split-paced). A hidden source
// has ONE fixed law: a mapping M that says, for each symbol, what it expands into.
// M never changes on symbols still in view, so the source never contradicts itself —
// a single consistent reading of the whole record always exists.
//
// Five candidate rule-sets sit in front of you, each a guess at M. Each observation,
// the source reveals one symbol's expansion — and it picks WHICH symbol to reveal so
// that only ABOUT HALF of the still-fitting rule-sets guessed it right. So every
// observation cleanly bisects the board: rule out the ones it just contradicted and a
// fresh candidate slides into place (the grid always holds five). Every so often the
// source produces a brand-new symbol no rule-set has an opinion on — a PARADIGM SHIFT.
// Old reveals scroll out of view, so there is always more to infer: no last state, no
// final theory, only the next anomaly. Physics is one reading; the symbols could mean
// anything, or nothing.
import { triggerReflow } from '../lib/dom.js';
import { markProgress } from '../core/progress.js';

const SYMBOLS = ['△', '◻', '◯', '☆', '∇', '✦', '●', '◆'];
const GRID = 5;          // candidate rule-sets always on screen
const CTX_WINDOW = 3;    // how many recent reveals still count (older ones scroll out)
const STATE_WINDOW = 6;  // record snapshots shown
const MAXLEN = 18;       // display string length cap
const ALPHA_CAP = 6;     // stop adding brand-new symbols past this
const SHIFT_EVERY = 7;   // observations between paradigm shifts

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const distinct = (s) => [...new Set(s)];

// ----- state -----
let alphabet, M, contexts, current, states, cards, paradigms, observations, misfires, hints;
let cardSeq = 0;
let sinceShift = 0;
const justSpawned = new Set();

let elHistory, elGrid, elExplain, elEpoch, elAlphabet, elCount, elShifts, elObs, elMisfire, elHint, elObserveBtn;

function expandedSet() { return new Set(contexts); }

// A candidate mapping: it must agree with the true law M on every symbol revealed
// within the current window (so it reproduces the record); on everything else it
// guesses. Cards agree on what's been revealed and differ on the rest — and that
// disagreement is exactly what a single observation splits.
function makeCard() {
  const seen = expandedSet();
  const map = {};
  for (const c of alphabet) map[c] = seen.has(c) ? M[c] : pick(alphabet);
  const rules = alphabet.map((c) => [c, c + map[c]]);
  return { id: ++cardSeq, map, rules, displayRules: shuffled(rules) };
}

function fits(card) { return contexts.every((c) => card.map[c] === M[c]); }
function fittingCards() { return cards.filter(fits); }

function newGrid() {
  cards = [];
  justSpawned.clear();
  for (let i = 0; i < GRID; i++) { const c = makeCard(); cards.push(c); justSpawned.add(c.id); }
}

// ----- rendering -----
function setExplain(html, accent = 'accent-yellow') {
  elExplain.className = `callout ${accent}`;
  elExplain.style.display = 'block';
  elExplain.innerHTML = html;
}
function mono(s) { return `<span class="mono phys-mono">${s}</span>`; }

function renderHistory(opts = {}) {
  elHistory.innerHTML = '';
  states.forEach((state, i) => {
    const div = document.createElement('div');
    div.className = 'phys-state';
    if (i === states.length - 1) div.classList.add(opts.anomaly ? 'anomaly' : 'current');
    div.innerHTML = `<span class="phys-t">t${observations - (states.length - 1) + i}</span><span class="phys-state-str">${state}</span>`;
    elHistory.appendChild(div);
  });
  elHistory.scrollLeft = elHistory.scrollWidth;
}

function renderGrid() {
  elGrid.innerHTML = '';
  cards.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'physics-model';
    if (justSpawned.has(c.id)) div.classList.add('spawn');
    div.id = 'law-' + c.id;
    div.addEventListener('click', () => attemptEliminate(c.id));
    const rules = c.displayRules
      .map(([l, r]) => `<span class="phys-rule">${l} <span class="phys-arrow">&rarr;</span> ${r}</span>`)
      .join('');
    div.innerHTML = `<div class="phys-rules">${rules}</div>`;
    elGrid.appendChild(div);
  });
  justSpawned.clear();
}

function updateStatus() {
  elEpoch.textContent = `Paradigm ${paradigms}`;
  elAlphabet.textContent = alphabet.join(', ');
  elCount.textContent = GRID;
  elShifts.textContent = paradigms - 1;
  elObs.textContent = observations;
  elMisfire.textContent = misfires;
  elHint.textContent = hints;
}

function unfitCount() { return cards.filter((c) => !fits(c)).length; }
function render(opts = {}) { renderHistory(opts); renderGrid(); updateStatus(); }

// ----- source dynamics -----
function pushSnapshot() {
  states.push(current);
  if (states.length > STATE_WINDOW) states.shift();
}

// Reveal symbol c: append M[c] after its last occurrence, remember the reveal.
function reveal(c) {
  const i = current.lastIndexOf(c);
  if (i !== -1) {
    current = current.slice(0, i + 1) + M[c] + current.slice(i + 1);
    if (current.length > MAXLEN) current = current.slice(current.length - MAXLEN);
  }
  pushSnapshot();
  contexts.push(c);
  if (contexts.length > CTX_WINDOW) contexts.shift();
}

// Pick which symbol to reveal so ~half of the fitting rule-sets guessed it right.
function chooseReveal(fitting) {
  const seen = expandedSet();
  const candidates = distinct(current).filter((c) => !seen.has(c)); // reveals that still split
  const target = Math.min(fitting.length - 1, Math.max(1, Math.round(fitting.length * (0.35 + Math.random() * 0.3))));
  let best = null, bestDiff = Infinity;
  for (const c of shuffled(candidates)) {
    const agree = fitting.filter((k) => k.map[c] === M[c]).length;
    if (agree < 1 || agree >= fitting.length) continue; // must actually split
    const diff = Math.abs(agree - target);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}

function paradigmShift() {
  if (alphabet.length >= ALPHA_CAP || !SYMBOLS.some((z) => !alphabet.includes(z))) return false;
  const Z = SYMBOLS.find((z) => !alphabet.includes(z));
  alphabet.push(Z);
  M[Z] = pick(alphabet.filter((x) => x !== Z));
  current += Z; // the new shape appears in the record
  if (current.length > MAXLEN) current = current.slice(current.length - MAXLEN);
  pushSnapshot();
  paradigms++;
  // Every rule-set gains an opinion about the new shape (a guess) — they won't all
  // agree, so revealing Z later will split them.
  cards.forEach((card) => {
    card.map[Z] = pick(alphabet);
    card.rules.push([Z, Z + card.map[Z]]);
    card.displayRules = shuffled(card.rules);
  });
  setExplain(
    `<strong style="color:var(--accent-purple)">Paradigm shift.</strong> A brand-new shape ${mono(Z)} appears — no rule-set had an opinion on it, and now each has guessed one. When the source reveals what ${mono(Z)} expands into, they'll split again. Keep watching.`,
    'accent-purple',
  );
  triggerReflow(elEpoch, 'pulse-anim');
  return true;
}

// ----- actions -----
function observeNext() {
  observations++;
  sinceShift++;

  if (sinceShift >= SHIFT_EVERY && paradigmShift()) { sinceShift = 0; render({ anomaly: true }); return; }

  const fitting = fittingCards();
  const c = fitting.length > 1 ? chooseReveal(fitting) : null;

  if (c === null) {
    // Nothing to split (or too few fitting): try a shift, else just advance the record.
    if (paradigmShift()) { sinceShift = 0; render({ anomaly: true }); return; }
    const seen = expandedSet();
    const any = distinct(current).find((x) => !seen.has(x)) || pick(distinct(current));
    reveal(any);
    render();
    setExplain(`<strong>The record grew to ${mono(states[states.length - 1])}.</strong> Every rule-set still fits — observe again to force them apart.`, 'accent-blue');
    return;
  }

  reveal(c);
  render();
  const n = unfitCount();
  setExplain(`<strong>Revealed: ${mono(c)} &rarr; ${mono(c + M[c])}.</strong> ${n} rule-set${n === 1 ? '' : 's'} guessed wrong and can no longer reproduce the record — rule ${n === 1 ? 'it' : 'them'} out; a fresh one slides in.`, 'accent-yellow');
}

function replaceCard(idx) {
  const replacement = makeCard();
  cards[idx] = replacement;
  justSpawned.add(replacement.id);
  renderGrid();
  updateStatus();
}

function attemptEliminate(id) {
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const card = cards[idx];
  const el = document.getElementById('law-' + id);

  if (fits(card)) {
    misfires++;
    updateStatus();
    triggerReflow(el, 'shake');
    setExplain(`<strong style="color:var(--accent-red)">Not yet.</strong> That rule-set agrees with every reveal so far. You need the source to contradict it before you can rule it out.`, 'accent-red');
    return;
  }

  markProgress('conclusion');
  el.classList.add('leaving'); // slide the ruled-out card away, then drop in a fresh one
  setTimeout(() => replaceCard(idx), 240);
  const n = unfitCount() - 1;
  setExplain(`<strong style="color:var(--accent-green)">Ruled out.</strong> A fresh candidate takes its place.${n > 0 ? ` ${n} more still contradict the record.` : ' Observe to reveal the next symbol.'}`, 'accent-green');
}

function useHint() {
  hints++;
  updateStatus();
  const target = cards.find((c) => !fits(c));
  if (target) {
    triggerReflow(document.getElementById('law-' + target.id), 'hintable');
    setExplain(`<strong>Hint.</strong> The highlighted rule-set contradicts a reveal — rule it out.`, 'accent-blue');
  } else {
    setExplain(`<strong>Hint.</strong> Every rule-set fits so far. Observe the next reveal to force them apart.`, 'accent-blue');
  }
}

function resetGame() {
  alphabet = ['△', '◻', '◯', '☆'];
  M = {};
  do { for (const c of alphabet) M[c] = pick(alphabet); }
  while (new Set(alphabet.map((c) => M[c])).size < 2); // avoid a degenerate all-same law
  contexts = [];
  current = alphabet.join('');
  states = [current];
  paradigms = 1;
  observations = 0;
  sinceShift = 0;
  misfires = 0;
  hints = 0;
  newGrid();
  render();
  setExplain(`A source is running under one fixed law. Each observation reveals a symbol's expansion — chosen to split the board, so about half of the rule-sets survive it. Rule out the ones it contradicts; a fresh one replaces each. When a brand-new shape appears, the paradigm shifts.`, 'accent-yellow');
}

export function init() {
  elHistory = document.getElementById('physics-history');
  elGrid = document.getElementById('physics-models-grid');
  elExplain = document.getElementById('physics-explanation');
  elEpoch = document.getElementById('paradigm-counter');
  elAlphabet = document.getElementById('physics-alphabet-display');
  elCount = document.getElementById('physics-candidate-count');
  elShifts = document.getElementById('physics-remaining');
  elObs = document.getElementById('physics-obs-count');
  elMisfire = document.getElementById('bad-elim-counter');
  elHint = document.getElementById('hint-counter');
  elObserveBtn = document.getElementById('phys-observe');
  if (!elGrid) return;

  elObserveBtn.addEventListener('click', observeNext);
  document.getElementById('phys-hint').addEventListener('click', useHint);
  document.getElementById('phys-reset').addEventListener('click', resetGame);

  document.addEventListener('keydown', (e) => {
    const conclusion = document.getElementById('tab-conclusion');
    if (!conclusion || !conclusion.classList.contains('active')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'o' || e.key === 'O') { observeNext(); e.preventDefault(); }
    else if (e.key === 'h' || e.key === 'H') { useHint(); e.preventDefault(); }
  });

  resetGame();
}

export const handlers = {};
