// Chapter 2 — The Proof Unroller: a click-to-advance walkthrough that expands
// both sides of G ≡ ¬Prov(⌜G⌝) until they are visibly identical.
import { highlightRefPulse } from '../lib/dom.js';
import { createHistory } from '../lib/history.js';

const LHS_STATES = [
  `<span class="expandable expanded-node" onclick="stepLHS()">G</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&psi;(n)</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&psi;(&ulcorner;&psi;&urcorner;)</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&varphi;(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  `<span class="expandable expanded-node" onclick="stepLHS()">&not;Prov(Sub(&ulcorner;&varphi;(Sub(x,x))&urcorner;, &ulcorner;&varphi;(Sub(x,x))&urcorner;))</span>`,
  `<span class="expanded-node" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&not;Prov(Sub(x,x))&urcorner;, &ulcorner;&not;Prov(Sub(x,x))&urcorner;))</span>`,
];

const LHS_DEF_REFS = [null, 'def-5', 'def-4', 'def-3', 'def-2', 'def-3', 'def-2'];

const RHS_STATES = [
  ` &equiv; &not;Prov(<span class="expandable expanded-node" onclick="stepRHS()">&ulcorner;G&urcorner;</span>)`,
  ` &equiv; &not;Prov(<span class="expandable expanded-node" onclick="stepRHS()">Sub(n, n)</span>)`,
  ` &equiv; <span class="expandable expanded-node" onclick="stepRHS()" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&psi;&urcorner;, &ulcorner;&psi;&urcorner;))</span>`,
  ` &equiv; <span class="expandable expanded-node" onclick="stepRHS()">&not;Prov(Sub(&ulcorner;&varphi;(Sub(x,x))&urcorner;, &ulcorner;&varphi;(Sub(x,x))&urcorner;))</span>`,
  ` &equiv; <span class="expanded-node" style="color: var(--accent-green);">&not;Prov(Sub(&ulcorner;&not;Prov(Sub(x,x))&urcorner;, &ulcorner;&not;Prov(Sub(x,x))&urcorner;))</span>`,
];

const RHS_DEF_REFS = [null, 'step-8', 'def-4', 'def-3', 'def-2'];

let lhs = 0;
let rhs = 0;
const history = createHistory({ lhs: 0, rhs: 0 });

let lhsContainer, rhsContainer, progressCounter, undoBtn, redoBtn;

function render() {
  lhsContainer.innerHTML = LHS_STATES[lhs];
  rhsContainer.innerHTML = RHS_STATES[rhs];
  // Each step advances exactly one side, so the count is simply lhs + rhs.
  progressCounter.textContent = lhs + rhs;
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}

function stepLHS() {
  if (lhs < LHS_STATES.length - 1) {
    lhs++;
    history.push({ lhs, rhs });
    if (LHS_DEF_REFS[lhs]) highlightRefPulse(LHS_DEF_REFS[lhs]);
    render();
  }
}

function stepRHS() {
  if (rhs < RHS_STATES.length - 1) {
    rhs++;
    history.push({ lhs, rhs });
    if (RHS_DEF_REFS[rhs]) highlightRefPulse(RHS_DEF_REFS[rhs]);
    render();
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
    if (lhs > prevLhs && LHS_DEF_REFS[lhs]) highlightRefPulse(LHS_DEF_REFS[lhs]);
    else if (rhs > prevRhs && RHS_DEF_REFS[rhs]) highlightRefPulse(RHS_DEF_REFS[rhs]);
    render();
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
  resetUnroller();
}

// Referenced from inline onclick handlers (including generated markup).
export const handlers = { stepLHS, stepRHS, undoStep, redoStep, resetUnroller };
