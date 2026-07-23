// Chapter 5 — Reverse Mathematics (endless edition). A hidden source leaves one
// continuous, growing record over a small alphabet. Ten candidate rule-sets sit in
// front of you; rule out any that can no longer reproduce the record and a fresh
// candidate slides into its place (the grid always holds ten). Every so often the
// source does something no current rule foresaw — a new symbol (a "shape") or a new
// transition over symbols already seen (a "pattern"). That is a PARADIGM SHIFT:
// every rule-set gains one rule (randomly chosen from the several that could explain
// the novelty, inserted at a random spot) and the record rolls on. There is no last
// state and no final theory — only the next anomaly. Physics is one reading of this;
// the symbols could mean anything, or nothing.
import { triggerReflow } from '../lib/dom.js';
import { markProgress } from '../core/progress.js';

const SYMBOLS = ['△', '◻', '◯', '☆', '∇', '✦', '●', '◆', '◐', '◇'];
const WINDOW = 15;       // states kept/checked/displayed (keeps the game bounded)
const GRID = 10;         // candidate rule-sets always on screen
const SHIFT_EVERY = 5;   // observations between paradigm shifts

// ----- rewriting semantics -----
function canProduce(rules, cur, next) {
  for (const [left, right] of rules) {
    let idx = cur.indexOf(left);
    while (idx !== -1) {
      if (cur.slice(0, idx) + right + cur.slice(idx + left.length) === next) return true;
      idx = cur.indexOf(left, idx + 1);
    }
  }
  return false;
}
function reproduces(rules, seg) {
  for (let i = 0; i < seg.length - 1; i++) if (!canProduce(rules, seg[i], seg[i + 1])) return false;
  return true;
}

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ----- state -----
let alphabet, trueAppend, record, cards, paradigms, observations, misfires, hints;
let cardSeq = 0;
let sinceShift = 0;
let shiftParity = 0;
const justSpawned = new Set();

let elHistory, elGrid, elExplain, elEpoch, elAlphabet, elCount, elShifts, elObs, elMisfire, elHint, elObserveBtn;

const last = (s) => s[s.length - 1];

// The distinct symbols appended after each last-char across the current window —
// the constraints any fitting rule-set must satisfy.
function usedAppends() {
  const m = {};
  for (const s of alphabet) m[s] = new Set();
  for (let i = 0; i < record.length - 1; i++) {
    const c = last(record[i]);
    const a = record[i + 1].slice(record[i].length); // appended tail
    if (m[c]) m[c].add(a);
  }
  return m;
}

// Build a candidate rule-set. A "fitting" card reproduces the whole window; a
// "flawed" one is corrupted on exactly one observed transition, so it is
// immediately rule-out-able.
function makeCard(flawed) {
  const used = usedAppends();
  const rules = [];
  for (const c of alphabet) {
    if (used[c].size) for (const a of used[c]) rules.push([c, c + a]);
    else rules.push([c, c + pick(alphabet)]); // speculative (symbol not yet seen as last)
  }
  const card = { id: ++cardSeq, rules };

  if (flawed) {
    // Corrupt one required rule so the card fails somewhere in the window.
    const exercised = alphabet.filter((c) => used[c].size);
    for (let tries = 0; tries < 8 && exercised.length; tries++) {
      const c = pick(exercised);
      const wrong = pick(alphabet);
      const test = card.rules.map(([l, r]) => (l === c ? [l, c + wrong] : [l, r]));
      if (!reproduces(test, record)) { card.rules = test; break; }
    }
  }
  card.displayRules = shuffled(card.rules);
  return card;
}

function fits(card) { return reproduces(card.rules, record); }

function newGrid() {
  cards = [];
  justSpawned.clear();
  for (let i = 0; i < GRID; i++) {
    const c = makeCard(Math.random() < 0.35); // a little starting junk to rule out
    cards.push(c);
    justSpawned.add(c.id);
  }
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
  record.forEach((state, i) => {
    const div = document.createElement('div');
    div.className = 'phys-state';
    if (i === record.length - 1) div.classList.add(opts.anomaly ? 'anomaly' : 'current');
    div.innerHTML = `<span class="phys-t">t${observations - (record.length - 1) + i}</span><span class="phys-state-str">${state}</span>`;
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

function render(opts = {}) {
  renderHistory(opts);
  renderGrid();
  updateStatus();
}

// ----- source dynamics -----
function pushState(nextState) {
  record.push(nextState);
  if (record.length > WINDOW) record.shift();
}

function normalStep() {
  const s = record[record.length - 1];
  pushState(s + trueAppend[last(s)]);
}

// Rules that reproduce cur -> cur+app (append app after the last char): the same
// append attached to suffixes of increasing context length. These are the several
// choices that each explain the same novelty.
function explainers(cur, app) {
  const opts = [];
  for (let k = 1; k <= Math.min(3, cur.length); k++) {
    const suffix = cur.slice(cur.length - k);
    opts.push([suffix, suffix + app]);
  }
  return opts;
}

function paradigmShift() {
  const cur = record[record.length - 1];
  const c = last(cur);
  let app, kind;

  const canShape = alphabet.length < SYMBOLS.length;
  if (shiftParity % 2 === 0 && canShape) {
    // New shape: a symbol never produced before.
    app = SYMBOLS.find((z) => !alphabet.includes(z));
    alphabet.push(app);
    trueAppend[app] = pick(alphabet.filter((x) => x !== app));
    trueAppend[c] = app;
    kind = 'shape';
  } else {
    // New pattern: an existing symbol via a transition no current rule has.
    app = pick(alphabet.filter((x) => x !== trueAppend[c])) || pick(alphabet);
    trueAppend[c] = app;
    kind = 'pattern';
  }
  shiftParity++;

  pushState(cur + app);            // the anomaly state
  paradigms++;
  const opts = explainers(cur, app);
  // Every rule-set gains one explainer for the novelty (a random choice from the
  // several that fit, inserted at a random spot). If the novelty is a brand-new
  // symbol, also reveal how it behaves, so the record can roll on without breaking
  // every card the instant that symbol is expanded.
  cards.forEach((card) => {
    card.rules.splice(rand(card.rules.length + 1), 0, pick(opts));
    if (!card.rules.some(([l]) => l === app)) card.rules.push([app, app + trueAppend[app]]);
    card.displayRules = shuffled(card.rules);
  });

  const desc = kind === 'shape'
    ? `a brand-new shape ${mono(app)} — a symbol no rule had ever produced`
    : `a new pattern — ${mono(c)} led to ${mono(app)}, a step no rule foresaw`;
  setExplain(
    `<strong style="color:var(--accent-purple)">Paradigm shift.</strong> The source produced ${desc}. Every rule-set just gained a rule to cover it — but they didn't all choose the same one, so some will drift out of step as the record rolls on. Keep watching.`,
    'accent-purple',
  );
  triggerReflow(elEpoch, 'pulse-anim');
}

// ----- actions -----
function observeNext() {
  observations++;
  sinceShift++;
  if (sinceShift >= SHIFT_EVERY) {
    sinceShift = 0;
    paradigmShift();
    render({ anomaly: true });
    return;
  }
  normalStep();
  render();
  const n = unfitCount();
  if (n > 0) {
    setExplain(`<strong>The record grew to ${mono(record[record.length - 1])}.</strong> ${n} rule-set${n === 1 ? '' : 's'} can no longer reproduce it — rule ${n === 1 ? 'it' : 'them'} out.`, 'accent-yellow');
  } else {
    setExplain(`<strong>The record grew to ${mono(record[record.length - 1])}.</strong> Every rule-set still fits. Keep observing until one falls out of step — or the paradigm shifts.`, 'accent-blue');
  }
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
    setExplain(`<strong style="color:var(--accent-red)">Not yet.</strong> That rule-set reproduces every step of the record so far. You need a state it can't produce before you can rule it out.`, 'accent-red');
    return;
  }

  markProgress('conclusion');
  const replacement = makeCard(false); // a fresh candidate consistent with the record so far
  cards[idx] = replacement;
  justSpawned.add(replacement.id);
  renderGrid();
  updateStatus();
  const n = unfitCount();
  setExplain(`<strong style="color:var(--accent-green)">Ruled out.</strong> A fresh candidate takes its place. ${n > 0 ? `${n} more can't reproduce the record.` : 'Every rule-set on the board now fits — observe to move the record on.'}`, 'accent-green');
}

function useHint() {
  hints++;
  updateStatus();
  const target = cards.find((c) => !fits(c));
  if (target) {
    const el = document.getElementById('law-' + target.id);
    triggerReflow(el, 'hintable');
    setExplain(`<strong>Hint.</strong> The highlighted rule-set can't reproduce the record — rule it out.`, 'accent-blue');
  } else {
    setExplain(`<strong>Hint.</strong> Every rule-set on the board fits the record so far. Observe the next state to force them apart.`, 'accent-blue');
  }
}

function resetGame() {
  alphabet = ['△', '◻', '◯'];
  trueAppend = { '△': '◻', '◻': '◯', '◯': '△' };
  record = ['△'];
  paradigms = 1;
  observations = 0;
  sinceShift = 0;
  shiftParity = 0;
  misfires = 0;
  hints = 0;
  // Seed a few states so there's a record to reason about immediately.
  for (let i = 0; i < 3; i++) { normalStep(); observations++; }
  newGrid();
  render();
  setExplain(`A source is running. Rule out any rule-set that can't reproduce the record; a fresh one replaces it. When the source does something new, the paradigm shifts and every rule-set adapts.`, 'accent-yellow');
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

  // Keyboard: O observes, H hints (only while the Reverse Mathematics chapter is up).
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
