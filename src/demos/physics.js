// Chapter 5 — Reverse Mathematics (scripted edition). You're handed a record and
// must infer which rule-set generated it; physics is only the loudest reading of
// that move, so the framing stays domain-neutral (a "source", not a universe).
//
// The old sandbox generated random systems and evolved the source
// probabilistically, which made pacing and solvability a matter of luck. This
// version is fully AUTHORED: each epoch has a hand-designed true rule-set, a fixed
// observation history, and a set of "distractor" rule-sets that each become
// impossible to sustain at exactly one designed observation — so the pruning
// curve is precise and always solvable, yet feels like genuine detective work.
// (Solvability is proven by scratchpad/validate-levels.mjs.)
import { triggerReflow } from '../lib/dom.js';
import { markProgress } from '../core/progress.js';

const T = '△', S = '◻', O = '◯', St = '☆', N = '∇', F = '✦';

// order: display sequence of candidates; 'truth' marks the real law, 'dK' a
// distractor by index. This keeps the true law out of a predictable slot.
const LEVELS = [
  {
    alphabet: [T, S, O],
    truth: [[T, T + S], [S, S + O], [O, O + S]],
    history: [T, T + S, T + S + O, T + S + O + S, T + S + O + S + O],
    anomaly: T + S + O + S + O + St,
    distractors: [
      [[T, S + O], [S, S + O], [O, O + S]],
      [[T, T + S], [S, O + O], [O, O + S]],
      [[T, T + S], [S, S + O], [O, S]],
      [[T, T + S], [T + S, T + S + O], [O, O + S]],
    ],
    order: ['d0', 'd1', 'truth', 'd2', 'd3'],
  },
  {
    alphabet: [T, S, O, St],
    truth: [[T, T + S], [S, S + O], [O, O + St], [St, St + O]],
    history: [T, T + S, T + S + O, T + S + O + St, T + S + O + St + O, T + S + O + St + O + St],
    anomaly: T + S + O + St + O + St + N,
    distractors: [
      [[T, S + O], [S, S + O], [O, O + St], [St, St + O]],
      [[T, T + S], [S, O + O], [O, O + St], [St, St + O]],
      [[T, T + S], [S, S + O], [O, O + S], [St, St + O]],
      [[T, T + S], [S, S + O], [O, O + St], [St, St + S]],
      [[T, T + S], [S, S + O], [S + O, S + O + St], [St, St + O]],
    ],
    order: ['d0', 'truth', 'd1', 'd4', 'd2', 'd3'],
  },
  {
    alphabet: [T, S, O, St, N],
    truth: [[T, T + S], [S, S + O], [O, O + St], [St, St + N], [N, N + S]],
    history: [T, T + S, T + S + O, T + S + O + St, T + S + O + St + N, T + S + O + St + N + S, T + S + O + St + N + S + O],
    anomaly: T + S + O + St + N + S + O + F,
    distractors: [
      [[T, S + O], [S, S + O], [O, O + St], [St, St + N], [N, N + S]],
      [[T, T + S], [S, O + O], [O, O + St], [St, St + N], [N, N + S]],
      [[T, T + S], [S, S + O], [O, O + S], [St, St + N], [N, N + S]],
      [[T, T + S], [S, S + O], [O, O + St], [St, St + S], [N, N + S]],
      [[T, T + S], [S, S + O], [O, O + St], [St, St + N], [N, N + St]],
      [[T, T + S], [T + S, T + S + O], [O, O + St], [St, St + N], [N, N + S]],
    ],
    order: ['d1', 'd3', 'truth', 'd0', 'd4', 'd2', 'd5'],
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
function canReproduce(rules, history) {
  for (let i = 0; i < history.length - 1; i++) {
    if (!canProduce(rules, history[i], history[i + 1])) return false;
  }
  return true;
}
function firstFail(rules, history) {
  for (let i = 0; i < history.length - 1; i++) {
    if (!canProduce(rules, history[i], history[i + 1])) return i;
  }
  return -1;
}

// ----- state -----
let li = 0;
let observed = 0; // states revealed beyond s0
let eliminated = new Set();
let candidates = [];
let anomalyRevealed = false;
let misfires = 0;
let hints = 0;
let ended = false;

// ----- elements -----
let elHistory, elGrid, elExplain, elEpoch, elAlphabet, elCount, elRemaining, elObs, elMisfire, elHint, elObserveBtn;

function L() { return LEVELS[li]; }

function visibleHistory() {
  const h = L().history.slice(0, observed + 1);
  return anomalyRevealed ? [...h, L().anomaly] : h;
}
function remaining() { return candidates.filter((c) => !eliminated.has(c.id)); }

function buildCandidates() {
  const lvl = L();
  candidates = lvl.order.map((tok, i) => {
    const label = String.fromCharCode(65 + i); // A, B, C…
    if (tok === 'truth') return { id: label, label, rules: lvl.truth, isTruth: true };
    const d = parseInt(tok.slice(1), 10);
    return { id: label, label, rules: lvl.distractors[d], isTruth: false };
  });
}

function setExplain(html, accent = 'accent-yellow') {
  elExplain.className = `callout ${accent}`;
  elExplain.style.display = 'block';
  elExplain.innerHTML = html;
}

function mono(s) { return `<span class="mono phys-mono">${s}</span>`; }

function renderHistory(opts = {}) {
  const hist = visibleHistory();
  elHistory.innerHTML = '';
  hist.forEach((state, i) => {
    const div = document.createElement('div');
    div.className = 'phys-state';
    const isAnomaly = anomalyRevealed && i === hist.length - 1;
    const isCurrent = !isAnomaly && i === hist.length - 1;
    if (isCurrent) div.classList.add('current');
    if (isAnomaly) div.classList.add('anomaly');
    if (opts.failIdx !== undefined && (i === opts.failIdx || i === opts.failIdx + 1)) div.classList.add('fail');
    div.innerHTML = `<span class="phys-t">t${i}</span><span class="phys-state-str">${state}</span>`;
    elHistory.appendChild(div);
  });
}

function renderGrid() {
  elGrid.innerHTML = '';
  candidates.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'physics-model';
    div.id = 'law-' + c.id;
    if (eliminated.has(c.id)) div.classList.add('eliminated');
    div.addEventListener('click', () => attemptEliminate(c.id));
    const rules = c.rules.map(([l, r]) => `<span class="phys-rule">${l} <span class="phys-arrow">&rarr;</span> ${r}</span>`).join('');
    div.innerHTML = `<h4>Rule-set ${c.label}</h4><div class="phys-rules">${rules}</div>`;
    elGrid.appendChild(div);
  });
}

function updateStatus() {
  elEpoch.textContent = `Epoch ${li + 1} / ${LEVELS.length}`;
  elAlphabet.textContent = L().alphabet.join(', ');
  elCount.textContent = candidates.length;
  elRemaining.textContent = remaining().length;
  elObs.textContent = observed;
  elMisfire.textContent = misfires;
  elHint.textContent = hints;
}

function loadLevel(idx) {
  li = idx;
  observed = 0;
  anomalyRevealed = false;
  eliminated = new Set();
  buildCandidates();
  renderHistory();
  renderGrid();
  updateStatus();
}

function observeNext() {
  if (ended) return;
  const lvl = L();

  if (anomalyRevealed) {
    setExplain(`Your surviving rule-set can't explain the anomaly. Click it to rule it out and force a paradigm shift.`, 'accent-red');
    return;
  }

  if (observed < lvl.history.length - 1) {
    observed++;
    renderHistory();
    updateStatus();
    if (observed === lvl.history.length - 1) {
      setExplain(`<strong>Full record observed.</strong> You've now seen every state of this epoch. Rule out every rule-set that can't reproduce it — exactly one should survive.`, 'accent-yellow');
    } else {
      setExplain(`<strong>Observation ${observed}.</strong> The source advanced to ${mono(visibleHistory()[observed])}. Which surviving rule-sets can no longer produce the record?`, 'accent-yellow');
    }
    return;
  }

  // Full history already shown.
  if (remaining().length > 1) {
    setExplain(`You've seen the whole record. The source won't reveal anything new until you've ruled out the rule-sets that can't reproduce it.`, 'accent-blue');
    return;
  }

  // Only the true law remains → reveal the anomaly it cannot explain.
  anomalyRevealed = true;
  renderHistory();
  updateStatus();
  setExplain(`<strong style="color:var(--accent-red)">Anomaly.</strong> The source produced ${mono(lvl.anomaly)} — a state even your surviving rule-set can't generate. Your best theory is falsified. Rule it out.`, 'accent-red');
}

function attemptEliminate(id) {
  if (ended || eliminated.has(id)) return;
  const cand = candidates.find((c) => c.id === id);
  const hist = visibleHistory();
  const card = document.getElementById('law-' + id);

  if (hist.length < 2) {
    setExplain(`Observe at least one state before ruling out a rule-set.`, 'accent-blue');
    return;
  }

  if (canReproduce(cand.rules, hist)) {
    misfires++;
    updateStatus();
    triggerReflow(card, 'shake');
    setExplain(`<strong style="color:var(--accent-red)">Not yet.</strong> Rule-set ${cand.label} can reproduce every observation so far — you need more evidence before you can rule it out.`, 'accent-red');
    return;
  }

  eliminated.add(id);
  card.classList.add('eliminated');
  const failIdx = firstFail(cand.rules, hist);
  renderHistory({ failIdx });
  updateStatus();
  const a = hist[failIdx];
  const b = hist[failIdx + 1];

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
  if (li < LEVELS.length - 1) {
    loadLevel(li + 1);
    triggerReflow(elEpoch, 'pulse-anim');
    setExplain(`<strong style="color:var(--accent-purple)">Paradigm shift.</strong> A new epoch opens with ${candidates.length} fresh rule-sets — each explains the entire past <em>and</em> the anomaly that broke the last theory. One symbol richer, begin the inference again.`, 'accent-purple');
  } else {
    ended = true;
    elObserveBtn.disabled = true;
    setExplain(`<strong>The end of physics?</strong> Physics was only the loudest way to read this game. Each epoch you inferred the one rule-set consistent with the record — then the source produced something it couldn't contain, and you started again one symbol richer. Run backwards, the search never reaches a final axiom: there is only the next anomaly. And the record never had to be a universe — read it as a language, a dataset, or nothing at all. Meaning doesn't sit beyond the models; it lives in the fit between what you observe and the rule-set you can still defend.`, 'accent-yellow');
  }
}

function useHint() {
  if (ended) return;
  const hist = visibleHistory();
  if (hist.length < 2) {
    setExplain(`Observe a state first, then I can point to an impossible rule-set.`, 'accent-blue');
    return;
  }
  hints++;
  updateStatus();
  const target = remaining().find((c) => !canReproduce(c.rules, hist));
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
  elObserveBtn.disabled = false;
  loadLevel(0);
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

  loadLevel(0);
}

// No inline handlers left in the physics markup — nothing to expose on window.
export const handlers = {};
