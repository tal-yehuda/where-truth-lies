// Chapter 2 — Gödel Numbering Sandbox: build a formula from symbol keys, watch
// its prime-power Gödel number update live, and save formulas into α…ε slots
// that can be reused (as macros / numeral constants) inside new formulas.
import { formatScientific } from '../lib/dom.js';
import { createHistory } from '../lib/history.js';
import { calculateEncoding } from '../lib/godel.js';

const memory = {
  alpha: { symbol: 'α', constant: 'A', formula: null, godelNumber: null },
  beta: { symbol: 'β', constant: 'B', formula: null, godelNumber: null },
  gamma: { symbol: 'γ', constant: 'C', formula: null, godelNumber: null },
  delta: { symbol: 'δ', constant: 'D', formula: null, godelNumber: null },
  epsilon: { symbol: 'ε', constant: 'E', formula: null, godelNumber: null },
};

// Encoding challenges: build a formula that hits a target Gödel number.
const GODEL_CHALLENGES = {
  s0: { label: 'Encode S0', desc: 'Build a formula whose Gödel number is exactly 12 = 2²·3¹. (Try S then 0.)', test: (n) => n === 12n },
  eq: { label: 'Encode 0=0', desc: 'Build a formula whose Gödel number is exactly 270 = 2¹·3³·5¹.', test: (n) => n === 270n },
  big: { label: 'Break a million', desc: 'Build any formula whose Gödel number exceeds 1,000,000 — notice how few symbols it takes.', test: (n) => n > 1000000n },
};
let activeGodel = null;
const godelDone = new Set();

let formulaTokens = [];
let cursorIndex = 0;
const history = createHistory({ tokens: [], cursor: 0 });

let formulaDisplay, factorizationDisplay, scientificNumberDisplay, unfoldedDisplay, memoryGrid;

function pushHistory() {
  history.push({ tokens: [...formulaTokens], cursor: cursorIndex });
  updateSandboxControls();
}

function restore(state) {
  formulaTokens = [...state.tokens];
  cursorIndex = state.cursor;
  updateFormulaDisplay();
  updateSandboxControls();
}

function undoSandbox() {
  const s = history.undo();
  if (s) restore(s);
}

function redoSandbox() {
  const s = history.redo();
  if (s) restore(s);
}

function updateSandboxControls() {
  const undoBtn = document.getElementById('sandbox-undo-btn');
  const redoBtn = document.getElementById('sandbox-redo-btn');
  if (undoBtn) undoBtn.disabled = !history.canUndo();
  if (redoBtn) redoBtn.disabled = !history.canRedo();
}

function addSymbol(sym) {
  formulaTokens.splice(cursorIndex, 0, sym);
  cursorIndex++;
  pushHistory();
  formulaDisplay.classList.remove('formula-error');
  updateFormulaDisplay();
}

function clearFormula() {
  formulaTokens = [];
  cursorIndex = 0;
  pushHistory();
  formulaDisplay.classList.remove('formula-error');
  updateFormulaDisplay();
}

function setCursor(idx) {
  cursorIndex = idx;
  formulaDisplay.focus();
  updateFormulaDisplay();
}

function updateFormulaDisplay() {
  if (formulaTokens.length === 0) {
    formulaDisplay.innerHTML =
      '<span class="sandbox-cursor"></span><span class="placeholder">Select symbols to build a formula...</span>';
    factorizationDisplay.innerHTML = '2<sup>?</sup> &times; 3<sup>?</sup> ...';
    scientificNumberDisplay.innerHTML = '&ulcorner;Formula&urcorner; &approx; 0';
    unfoldedDisplay.innerHTML = '<span class="placeholder">Awaiting input...</span>';
    checkGodelChallenge(0n);
    return;
  }

  let displayHTML = '';
  displayHTML += `<span class="formula-token" onclick="setCursor(0)" style="padding-left: 5px;">&#8203;</span>`;

  for (let i = 0; i <= formulaTokens.length; i++) {
    if (i === cursorIndex) displayHTML += '<span class="sandbox-cursor"></span>';
    if (i < formulaTokens.length) {
      displayHTML += `<span class="formula-token" onclick="setCursor(${i + 1})">${formulaTokens[i]}</span>`;
    }
  }

  formulaDisplay.innerHTML = displayHTML;

  const currentFormulaString = formulaTokens.join('');
  const result = calculateEncoding(currentFormulaString, memory);
  factorizationDisplay.innerHTML = result.factorization;
  scientificNumberDisplay.innerHTML = `&ulcorner;Formula&urcorner; &approx; ${formatScientific(result.godelNumber)}`;
  unfoldedDisplay.innerHTML = result.visualHTML;
  checkGodelChallenge(result.godelNumber);
}

function setGodelChallenge(id) {
  activeGodel = id;
  formulaTokens = [];
  cursorIndex = 0;
  history.reset({ tokens: [], cursor: 0 });
  document.querySelectorAll('.godel-challenge').forEach((b) => b.classList.toggle('active', b.dataset.gc === id));
  updateFormulaDisplay();
}

function checkGodelChallenge(n) {
  if (!activeGodel) return;
  const c = GODEL_CHALLENGES[activeGodel];
  const s = document.getElementById('godel-goal-status');
  if (!s) return;
  if (c.test(n)) {
    if (!godelDone.has(activeGodel)) {
      godelDone.add(activeGodel);
      const btn = document.querySelector(`.godel-challenge[data-gc="${activeGodel}"]`);
      if (btn) btn.classList.add('done');
    }
    s.className = 'godel-goal-status done';
    s.innerHTML = '<b>✓ Solved!</b> That formula encodes to the target.';
  } else {
    s.className = 'godel-goal-status';
    s.innerHTML = c.desc;
  }
}

function onKeydown(e) {
  if (document.activeElement !== formulaDisplay) return;

  if (e.key === 'ArrowLeft') {
    cursorIndex = Math.max(0, cursorIndex - 1);
    updateFormulaDisplay();
    e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    cursorIndex = Math.min(formulaTokens.length, cursorIndex + 1);
    updateFormulaDisplay();
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    if (cursorIndex > 0) {
      formulaTokens.splice(cursorIndex - 1, 1);
      cursorIndex--;
      pushHistory();
      updateFormulaDisplay();
    }
    e.preventDefault();
  } else if (e.key === 'Delete') {
    if (cursorIndex < formulaTokens.length) {
      formulaTokens.splice(cursorIndex, 1);
      pushHistory();
      updateFormulaDisplay();
    }
    e.preventDefault();
  } else {
    const keyMap = {
      0: '0', S: 'S', s: 'S', '=': '=', x: 'x', X: 'x',
      '(': '(', ')': ')', ',': ',', '!': '¬', p: 'Prov', P: 'Prov',
    };
    if (keyMap[e.key]) {
      addSymbol(keyMap[e.key]);
      e.preventDefault();
    }
  }
}

function renderMemoryBank() {
  memoryGrid.innerHTML = '';
  let hasItems = false;

  for (const [, data] of Object.entries(memory)) {
    if (data.formula) {
      hasItems = true;
      const slot = document.createElement('div');
      slot.className = 'memory-slot fade-in';

      let constHTML = '';
      if (data.constant) {
        constHTML = `<span class="slot-constant">${data.constant} &approx; ${formatScientific(data.godelNumber)}</span>`;
      } else if (data.godelNumber) {
        constHTML = `<span class="slot-constant" style="color:var(--text-muted); background:transparent;">${formatScientific(data.godelNumber)}</span>`;
      }

      slot.innerHTML = `
                <span class="slot-name">${data.symbol}:</span>
                <span class="slot-formula">${data.formula}</span>
                ${constHTML}
            `;
      memoryGrid.appendChild(slot);
    }
  }

  if (!hasItems) {
    memoryGrid.innerHTML = '<div class="memory-slot memory-slot-empty">Memory is empty. Save a formula!</div>';
  }
}

function saveToSlot(slotKey) {
  const currentFormulaString = formulaTokens.join('');
  if (currentFormulaString.length === 0) return;

  const result = calculateEncoding(currentFormulaString, memory);
  memory[slotKey].formula = currentFormulaString;
  memory[slotKey].godelNumber = result.godelNumber;

  if (memory[slotKey].constant) {
    const btn = document.getElementById(`btn-const-${memory[slotKey].constant}`);
    if (btn) btn.disabled = false;
  }
  if (memory[slotKey].symbol) {
    const btn = document.getElementById(`btn-macro-${slotKey}`);
    if (btn) btn.disabled = false;
  }

  renderMemoryBank();
  clearFormula();
  document.activeElement.blur(); // close dropdown
}

export function init() {
  formulaDisplay = document.getElementById('formula-display');
  factorizationDisplay = document.getElementById('factorization-display');
  scientificNumberDisplay = document.getElementById('scientific-number');
  unfoldedDisplay = document.getElementById('unfolded-display');
  memoryGrid = document.getElementById('memory-grid');

  document.addEventListener('keydown', onKeydown);
  document.querySelectorAll('.godel-challenge').forEach((b) =>
    b.addEventListener('click', () => setGodelChallenge(b.dataset.gc)),
  );
  renderMemoryBank();
}

export const handlers = { addSymbol, clearFormula, setCursor, undoSandbox, redoSandbox, saveToSlot };
