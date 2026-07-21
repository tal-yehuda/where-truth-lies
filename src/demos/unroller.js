// Chapter 2 — The Proof Unroller: a click-to-advance walkthrough that expands
// both sides of G ≡ ¬Prov(⌜G⌝) until they are visibly identical.
import { highlightRefPulse } from '../lib/dom.js';
import { createHistory } from '../lib/history.js';
import { markProgress } from '../core/progress.js';

const LHS_STATES = [
  `<span class="expandable expanded-node" onclick="stepLHS()">G</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&psi;(n)</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&psi;(&ulcorner;&psi;&urcorner;)</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&varphi;(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&not;Prov(Sub(&ulcorner;&varphi;(Sub(x,x))&urcorner;, &ulcorner;&varphi;(Sub(x,x))&urcorner;))</span>`,
  `<span class="expanded-node" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&not;Prov(Sub(x,x))&urcorner;, &ulcorner;&not;Prov(Sub(x,x))&urcorner;))</span>`,
];

// Which legend part lights up as each side takes a step (indexes into the state
// arrays; the value is the id of the live legend entry to pulse).
const LHS_DEF_REFS = [null, 'part-psi', 'part-n', 'part-phi', 'part-Prov', 'part-phi', 'part-Prov'];

const RHS_STATES = [
  ` &equiv; &not;Prov(<span class="expandable expanded-node" onclick="stepRHS()">&ulcorner;G&urcorner;</span>)`,
  ` &equiv; &not;Prov(<span class="expandable expanded-node" onclick="stepRHS()">Sub(n, n)</span>)`,
  ` &equiv; <span class="expandable expanded-node" onclick="stepRHS()" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  ` &equiv; <span class="expandable expanded-node" onclick="stepRHS()">&not;Prov(Sub(&ulcorner;&varphi;(Sub(x,x))&urcorner;, &ulcorner;&varphi;(Sub(x,x))&urcorner;))</span>`,
  ` &equiv; <span class="expanded-node" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&not;Prov(Sub(x,x))&urcorner;, &ulcorner;&not;Prov(Sub(x,x))&urcorner;))</span>`,
];

const RHS_DEF_REFS = [null, 'part-Sub', 'part-n', 'part-phi', 'part-Prov'];

// The live legend: which named parts each side's current state contains, plus a
// plain-language gloss for every part. The list under the canvas re-renders on
// each step so the meaning of whatever is on screen is always spelled out.
const PART_ORDER = ['G', 'psi', 'phi', 'n', 'Sub', 'Prov', 'x'];
const PART_LABEL = { G: 'G', psi: '&psi;', phi: '&varphi;', n: 'n', Sub: 'Sub', Prov: 'Prov', x: 'x' };
const PART_META = {
  G: 'the sentence we are building &mdash; it will turn out to say &ldquo;I have no proof.&rdquo;',
  psi: '<code>&psi;(x) := &varphi;(Sub(x,x))</code> &mdash; apply &varphi; to x fed its own Gödel number.',
  phi: '<code>&varphi;(x) := &not;Prov(x)</code> &mdash; &ldquo;the formula numbered x is not provable.&rdquo;',
  n: '<code>n := &ulcorner;&psi;&urcorner;</code> &mdash; the Gödel number of the formula &psi;.',
  Sub: '<code>Sub(a,b)</code> &mdash; the Gödel number of the formula you get by substituting b into the formula numbered a.',
  Prov: '<code>Prov(f) := &exist;p Proof(p,f)</code> &mdash; &ldquo;f is provable&rdquo; (some proof p exists).',
  x: 'a free variable &mdash; a placeholder standing for any number.',
};

const LHS_PARTS = [
  ['G'],
  ['psi', 'n'],
  ['psi'],
  ['phi', 'Sub', 'psi'],
  ['Prov', 'Sub', 'psi'],
  ['Prov', 'Sub', 'phi', 'x'],
  ['Prov', 'Sub', 'x'],
];
const RHS_PARTS = [
  ['Prov', 'G'],
  ['Prov', 'Sub', 'n'],
  ['Prov', 'Sub', 'psi'],
  ['Prov', 'Sub', 'phi', 'x'],
  ['Prov', 'Sub', 'x'],
];

let lhs = 0;
let rhs = 0;
const history = createHistory({ lhs: 0, rhs: 0 });

let lhsContainer, rhsContainer, progressCounter, undoBtn, redoBtn, statusEl, legendEl;

function renderLegend() {
  if (!legendEl) return;
  const present = new Set([...LHS_PARTS[lhs], ...RHS_PARTS[rhs]]);
  legendEl.innerHTML = PART_ORDER.filter((k) => present.has(k))
    .map(
      (k) =>
        `<li id="part-${k}"><span class="legend-key mono">${PART_LABEL[k]}</span><span class="legend-meaning">${PART_META[k]}</span></li>`,
    )
    .join('');
}

function render() {
  lhsContainer.innerHTML = LHS_STATES[lhs];
  rhsContainer.innerHTML = RHS_STATES[rhs];
  // Each step advances exactly one side, so the count is simply lhs + rhs.
  progressCounter.textContent = lhs + rhs;
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
  renderLegend();

  if (statusEl) {
    const done = lhs === LHS_STATES.length - 1 && rhs === RHS_STATES.length - 1;
    if (done) {
      markProgress('truth');
      statusEl.className = 'unroller-status done';
      statusEl.innerHTML =
        '<b>✓ Both sides collapsed to the same string.</b> G is literally &not;Prov(&ulcorner;G&urcorner;) — in pure syntax it asserts that it has no proof. No meaning was needed, only substitution.';
    } else {
      statusEl.className = 'unroller-status';
      statusEl.innerHTML =
        'Click the highlighted <strong>parts of the formula</strong> on each side. When both fully unfold, they become the <em>same</em> string.';
    }
  }
}

function stepLHS() {
  if (lhs < LHS_STATES.length - 1) {
    lhs++;
    history.push({ lhs, rhs });
    render();
    if (LHS_DEF_REFS[lhs]) highlightRefPulse(LHS_DEF_REFS[lhs]);
  }
}

function stepRHS() {
  if (rhs < RHS_STATES.length - 1) {
    rhs++;
    history.push({ lhs, rhs });
    render();
    if (RHS_DEF_REFS[rhs]) highlightRefPulse(RHS_DEF_REFS[rhs]);
  }
}

function undoStep() {
  const s = history.undo();
  if (s) {
    lhs = s.lhs;
    rhs = s.rhs;
    render();
  }
}

function redoStep() {
  const prevLhs = lhs;
  const prevRhs = rhs;
  const s = history.redo();
  if (s) {
    lhs = s.lhs;
    rhs = s.rhs;
    render();
    if (lhs > prevLhs && LHS_DEF_REFS[lhs]) highlightRefPulse(LHS_DEF_REFS[lhs]);
    else if (rhs > prevRhs && RHS_DEF_REFS[rhs]) highlightRefPulse(RHS_DEF_REFS[rhs]);
  }
}

function resetUnroller() {
  lhs = 0;
  rhs = 0;
  history.reset({ lhs: 0, rhs: 0 });
  render();
}

export function init() {
  lhsContainer = document.getElementById('lhs-container');
  rhsContainer = document.getElementById('rhs-container');
  progressCounter = document.getElementById('progress-counter');
  undoBtn = document.getElementById('undo-btn');
  redoBtn = document.getElementById('redo-btn');
  statusEl = document.getElementById('unroller-status');
  legendEl = document.getElementById('unroller-legend-list');
  resetUnroller();
}

// Referenced from inline onclick handlers (including generated markup).
export const handlers = { stepLHS, stepRHS, undoStep, redoStep, resetUnroller };
