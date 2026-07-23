// Chapter 5 — Reverse Mathematics (scripted edition). You're handed a record and
// must infer which rule-set generated it; physics is only the loudest reading of
// that move, so the framing stays domain-neutral (a "source", not a universe).
//
// The record is ONE continuous, growing timeline (RECORD). It never resets: a
// paradigm shift just swaps in a richer set of candidate rule-sets and keeps
// observing. Each phase has a true rule-set and distractors; the true one survives
// its whole window, then the source produces one more state the true rules can't
// make — the anomaly — forcing the shift. Anomalies come in two flavors: a brand-
// new symbol (a new "shape"), or a new pattern over symbols already seen. The
// design (staggered pruning, unique survivor, unproducible anomaly) is proven in
// scratchpad/validate-levels.mjs.
import { triggerReflow } from '../lib/dom.js';
import { markProgress } from '../core/progress.js';

const T = '△', S = '◻', O = '◯', St = '☆', N = '∇';

// One growing record (append-only, last-char expansion). Indices called out are
// the paradigm-breaking states (anomalies).
const RECORD = [
  T,
  T + S,
  T + S + O,
  T + S + O + T,
  T + S + O + T + St,                                  // 4  anomaly: new symbol ☆ (shape)
  T + S + O + T + St + O,
  T + S + O + T + St + O + T,
  T + S + O + T + St + O + T + S,
  T + S + O + T + St + O + T + S + T,                  // 8  anomaly: new PATTERN ◻→◻△ (pattern)
  T + S + O + T + St + O + T + S + T + S,
  T + S + O + T + St + O + T + S + T + S + O,
  T + S + O + T + St + O + T + S + T + S + O + N,       // 11 final anomaly: new symbol ∇ (shape)
];

const R1 = [[T, T + S], [S, S + O], [O, O + T]];
const R2 = [...R1, [T, T + St], [St, St + O]];
const R3 = [...R2, [S, S + T]];

// Each phase is judged on the states firstJudge..breakIdx-1 (so it must also
// explain the seam transition its new rule was added for); breakIdx is the anomaly
// it cannot produce. anomaly: 'shape' (new symbol) or 'pattern' (new transition
// over symbols already seen). Distractors are paced so the last one falls exactly
// at the window's end — pruning to a lone survivor lines up with the anomaly.
const PHASES = [
  {
    firstJudge: 0, breakIdx: 4, alphabet: [T, S, O], anomaly: 'shape', truth: R1,
    distractors: [
      [[T, T + O], [S, S + O], [O, O + T]],
      [[T, T + S], [S, S + T], [O, O + T]],
      [[T, T + S], [S, S + O], [O, O + S]],
    ],
    order: ['d0', 'd1', 'truth', 'd2'],
  },
  {
    firstJudge: 3, breakIdx: 8, alphabet: [T, S, O, St], anomaly: 'pattern', truth: R2,
    distractors: [
      [[T, T + S], [S, S + O], [O, O + T], [St, St + O]],
      [[T, T + S], [S, S + O], [O, O + T], [T, T + St], [St, St + T]],
      [[T, T + S], [S, S + O], [O, O + S], [T, T + St], [St, St + O]],
      [[T, T + O], [S, S + O], [O, O + T], [T, T + St], [St, St + O]],
    ],
    order: ['d0', 'truth', 'd2', 'd1', 'd3'],
  },
  {
    firstJudge: 7, breakIdx: 11, alphabet: [T, S, O, St], anomaly: 'shape', truth: R3,
    distractors: [
      [[T, T + S], [S, S + O], [O, O + T], [T, T + St], [St, St + O]],
      [[T, T + O], [S, S + O], [O, O + T], [T, T + St], [St, St + O], [S, S + T]],
      [[T, T + S], [S, S + S], [O, O + T], [T, T + St], [St, St + O], [S, S + T]],
    ],
    order: ['d1', 'truth', 'd0', 'd2'],
  },
];

// ----- rewriting semantics (must match validate-levels.mjs) -----
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
function canReproduce(rules, seg) {
  for (let i = 0; i < seg.length - 1; i++) {
    if (!canProduce(rules, seg[i], seg[i + 1])) return false;
  }
  return true;
}
function firstFail(rules, seg) {
  for (let i = 0; i < seg.length - 1; i++) {
    if (!canProduce(rules, seg[i], seg[i + 1])) return i;
  }
  return -1;
}

// Fisher–Yates: shuffle a copy (used to randomize the *display* order of a card's
// rules — the logic always reads the original rule list, so nothing else changes).
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- state -----
let phase = 0;
let cursor = 0; // index in RECORD of the latest revealed state
let eliminated = new Set();
let candidates = [];
let anomalyRevealed = false;
const anomalyIdxs = new Set(); // record indices of already-revealed paradigm-breaking states
let misfires = 0;
let hints = 0;
let ended = false;

// ----- elements -----
let elHistory, elGrid, elExplain, elEpoch, elAlphabet, elCount, elRemaining, elObs, elMisfire, elHint, elObserveBtn;

function P() { return PHASES[phase]; }

// The transitions the current phase's candidates are judged on: from the seam that
// its new rules explain, up to whatever has been revealed so far.
function judgedSegment() {
  return RECORD.slice(P().firstJudge, cursor + 1);
}
function remaining() { return candidates.filter((c) => !eliminated.has(c.id)); }

function buildCandidates() {
  const p = P();
  candidates = p.order.map((tok, i) => {
    const label = String.fromCharCode(65 + i); // A, B, C…
    const rules = tok === 'truth' ? p.truth : p.distractors[parseInt(tok.slice(1), 10)];
    return { id: label, label, rules, displayRules: shuffled(rules), isTruth: tok === 'truth' };
  });
}

function setExplain(html, accent = 'accent-yellow') {
  elExplain.className = `callout ${accent}`;
  elExplain.style.display = 'block';
  elExplain.innerHTML = html;
}

function mono(s) { return `<span class="mono phys-mono">${s}</span>`; }

function renderHistory(opts = {}) {
  elHistory.innerHTML = '';
  for (let i = 0; i <= cursor; i++) {
    const div = document.createElement('div');
    div.className = 'phys-state';
    const isAnomaly = anomalyIdxs.has(i) || (anomalyRevealed && i === cursor);
    if (i === cursor && !isAnomaly) div.classList.add('current');
    if (isAnomaly) div.classList.add('anomaly');
    if (opts.failIdx !== undefined) {
      const g = P().firstJudge;
      if (i === g + opts.failIdx || i === g + opts.failIdx + 1) div.classList.add('fail');
    }
    div.innerHTML = `<span class="phys-t">t${i}</span><span class="phys-state-str">${RECORD[i]}</span>`;
    elHistory.appendChild(div);
  }
  elHistory.scrollLeft = elHistory.scrollWidth;
}

function renderGrid() {
  elGrid.innerHTML = '';
  candidates.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'physics-model';
    div.id = 'law-' + c.id;
    if (eliminated.has(c.id)) div.classList.add('eliminated');
    div.addEventListener('click', () => attemptEliminate(c.id));
    const rules = c.displayRules
      .map(([l, r]) => `<span class="phys-rule">${l} <span class="phys-arrow">&rarr;</span> ${r}</span>`)
      .join('');
    div.innerHTML = `<h4>Rule-set ${c.label}</h4><div class="phys-rules">${rules}</div>`;
    elGrid.appendChild(div);
  });
}

function updateStatus() {
  elEpoch.textContent = `Epoch ${phase + 1} / ${PHASES.length}`;
  elAlphabet.textContent = P().alphabet.join(', ');
  elCount.textContent = candidates.length;
  elRemaining.textContent = remaining().length;
  elObs.textContent = cursor;
  elMisfire.textContent = misfires;
  elHint.textContent = hints;
}

function loadPhase(idx) {
  phase = idx;
  anomalyRevealed = false;
  eliminated = new Set();
  buildCandidates();
  renderHistory();
  renderGrid();
  updateStatus();
}

function observeNext() {
  if (ended) return;
  const p = P();
  const windowEnd = p.breakIdx - 1;

  if (anomalyRevealed) {
    setExplain(`Your surviving rule-set can't explain the anomaly. Click it to rule it out and force a paradigm shift.`, 'accent-red');
    return;
  }

  if (cursor < windowEnd) {
    cursor++;
    renderHistory();
    updateStatus();
    if (cursor === windowEnd) {
      setExplain(`<strong>Record caught up.</strong> Every state so far is on the table. Rule out every rule-set that can't reproduce it — exactly one should survive.`, 'accent-yellow');
    } else {
      setExplain(`<strong>Observation ${cursor}.</strong> The source advanced to ${mono(RECORD[cursor])}. Which surviving rule-sets can no longer produce the record?`, 'accent-yellow');
    }
    return;
  }

  // Window fully shown.
  if (remaining().length > 1) {
    setExplain(`You've seen the whole record so far. The source won't reveal anything new until you've ruled out the rule-sets that can't reproduce it.`, 'accent-blue');
    return;
  }

  // Only the true rule-set remains → reveal the anomaly it cannot explain.
  cursor = p.breakIdx;
  anomalyRevealed = true;
  renderHistory();
  updateStatus();
  const kind = p.anomaly === 'pattern'
    ? 'a new <em>pattern</em> — no new symbol, but a transition your surviving rule-set has no rule for'
    : 'a new <em>shape</em> — a symbol your surviving rule-set has never produced';
  setExplain(`<strong style="color:var(--accent-red)">Anomaly.</strong> The source produced ${mono(RECORD[cursor])} — ${kind}. Your best theory is falsified. Rule it out.`, 'accent-red');
}

function attemptEliminate(id) {
  if (ended || eliminated.has(id)) return;
  const cand = candidates.find((c) => c.id === id);
  const seg = judgedSegment();
  const card = document.getElementById('law-' + id);

  if (seg.length < 2) {
    setExplain(`Observe at least one state before ruling out a rule-set.`, 'accent-blue');
    return;
  }

  if (canReproduce(cand.rules, seg)) {
    misfires++;
    updateStatus();
    triggerReflow(card, 'shake');
    setExplain(`<strong style="color:var(--accent-red)">Not yet.</strong> Rule-set ${cand.label} can reproduce every observation so far — you need more evidence before you can rule it out.`, 'accent-red');
    return;
  }

  eliminated.add(id);
  card.classList.add('eliminated');
  const failIdx = firstFail(cand.rules, seg);
  renderHistory({ failIdx });
  updateStatus();
  const a = seg[failIdx];
  const b = seg[failIdx + 1];

  if (cand.isTruth) {
    setExplain(`Rule-set ${cand.label} — your best theory — can't produce ${mono(a)} &rarr; ${mono(b)}. Even it has fallen.`, 'accent-red');
    setTimeout(advanceEpoch, 1200);
    return;
  }

  const rem = remaining();
  if (rem.length > 1) {
    setExplain(`<strong style="color:var(--accent-green)">Ruled out.</strong> Rule-set ${cand.label} can't produce ${mono(a)} &rarr; ${mono(b)}. ${rem.length} rule-sets remain.`, 'accent-green');
  } else {
    setExplain(`<strong style="color:var(--accent-green)">One rule-set stands.</strong> Only Rule-set ${rem[0].label} survives the whole record. Observe once more to put it to the test.`, 'accent-green');
  }
}

function advanceEpoch() {
  markProgress('conclusion');
  anomalyIdxs.add(P().breakIdx); // keep the broken-theory state marked in the timeline
  if (phase < PHASES.length - 1) {
    loadPhase(phase + 1); // cursor is untouched — the record continues from where it was
    triggerReflow(elEpoch, 'pulse-anim');
    setExplain(`<strong style="color:var(--accent-purple)">Paradigm shift.</strong> The record rolls on — same timeline, ${candidates.length} fresh rule-sets. Each explains the whole record so far <em>and</em> the anomaly that broke the last theory. Keep inferring.`, 'accent-purple');
  } else {
    ended = true;
    elObserveBtn.disabled = true;
    setExplain(`<strong>The end of physics?</strong> Physics was only the loudest way to read this game. Each epoch you inferred the one rule-set consistent with the record — then the source produced something it couldn't contain, and you carried on with a richer theory. Run backwards, the search never reaches a final axiom: there is only the next anomaly. And the record never had to be a universe — read it as a language, a dataset, or nothing at all. Meaning doesn't sit beyond the models; it lives in the fit between what you observe and the rule-set you can still defend.`, 'accent-yellow');
  }
}

function useHint() {
  if (ended) return;
  const seg = judgedSegment();
  if (seg.length < 2) {
    setExplain(`Observe a state first, then I can point to an impossible rule-set.`, 'accent-blue');
    return;
  }
  hints++;
  updateStatus();
  const target = remaining().find((c) => !canReproduce(c.rules, seg));
  if (target) {
    const card = document.getElementById('law-' + target.id);
    triggerReflow(card, 'hintable');
    setExplain(`<strong>Hint.</strong> Look closely at Rule-set ${target.label} — it can't reproduce the current record.`, 'accent-blue');
  } else {
    setExplain(`<strong>Hint.</strong> Every surviving rule-set still fits the record. Observe another state to force them apart.`, 'accent-blue');
  }
}

function resetGame() {
  ended = false;
  misfires = 0;
  hints = 0;
  cursor = 0;
  anomalyIdxs.clear();
  elObserveBtn.disabled = false;
  loadPhase(0);
  elExplain.style.display = 'none';
}

export function init() {
  elHistory = document.getElementById('physics-history');
  elGrid = document.getElementById('physics-models-grid');
  elExplain = document.getElementById('physics-explanation');
  elEpoch = document.getElementById('paradigm-counter');
  elAlphabet = document.getElementById('physics-alphabet-display');
  elCount = document.getElementById('physics-candidate-count');
  elRemaining = document.getElementById('physics-remaining');
  elObs = document.getElementById('physics-obs-count');
  elMisfire = document.getElementById('bad-elim-counter');
  elHint = document.getElementById('hint-counter');
  elObserveBtn = document.getElementById('phys-observe');
  if (!elGrid) return;

  elObserveBtn.addEventListener('click', observeNext);
  document.getElementById('phys-hint').addEventListener('click', useHint);
  document.getElementById('phys-reset').addEventListener('click', resetGame);

  // Keyboard: O observes, H hints (only while the Physics chapter is on screen).
  document.addEventListener('keydown', (e) => {
    const conclusion = document.getElementById('tab-conclusion');
    if (!conclusion || !conclusion.classList.contains('active')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'o' || e.key === 'O') { observeNext(); e.preventDefault(); }
    else if (e.key === 'h' || e.key === 'H') { useHint(); e.preventDefault(); }
  });

  loadPhase(0);
}

// No inline handlers left in the physics markup — nothing to expose on window.
export const handlers = {};
