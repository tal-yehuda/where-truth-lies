// Chapter 3 — Turing Machine simulator over an infinite sparse tape, with
// preset programs and a custom-program editor.
import { createPlayback } from '../lib/playback.js';
import { markProgress } from '../core/progress.js';

let tmTape = {}; // key: index, value: symbol ('0', '1', ' ')
let tmHead = 0;
let tmState = 'q0';
let tmStepCount = 0;
let tmPlayback = null;

const tmPrograms = {
  binary_counter: {
    initial: 'q0',
    tape: { 0: '0', 1: '0', 2: '0' },
    rules: [
      { s: 'q0', r: '0', w: '0', m: 'R', n: 'q0' },
      { s: 'q0', r: '1', w: '1', m: 'R', n: 'q0' },
      { s: 'q0', r: ' ', w: ' ', m: 'L', n: 'q1' },
      { s: 'q1', r: '1', w: '0', m: 'L', n: 'q1' },
      { s: 'q1', r: '0', w: '1', m: 'L', n: 'q2' },
      { s: 'q1', r: ' ', w: '1', m: 'L', n: 'q2' },
      { s: 'q2', r: '0', w: '0', m: 'L', n: 'q2' },
      { s: 'q2', r: '1', w: '1', m: 'L', n: 'q2' },
      { s: 'q2', r: ' ', w: ' ', m: 'R', n: 'q0' },
    ],
  },
  infinite_loop: {
    initial: 'q0',
    tape: { 0: '1' },
    rules: [
      { s: 'q0', r: '1', w: '1', m: 'R', n: 'q1' },
      { s: 'q1', r: ' ', w: '1', m: 'L', n: 'q0' },
    ],
  },
  flip_bits: {
    initial: 'q0',
    tape: { 0: '1', 1: '0', 2: '1', 3: '1' },
    rules: [
      { s: 'q0', r: '0', w: '1', m: 'R', n: 'q0' },
      { s: 'q0', r: '1', w: '0', m: 'R', n: 'q0' },
    ],
  },
  append_one: {
    initial: 'q0',
    tape: { 0: '1', 1: '1', 2: '1' },
    rules: [
      { s: 'q0', r: '1', w: '1', m: 'R', n: 'q0' },
      { s: 'q0', r: ' ', w: '1', m: 'R', n: 'q1' },
    ],
  },
  custom: {
    initial: 'q0',
    tape: { 0: '1' },
    rules: [],
  },
};

// Build-a-machine challenges: the player authors custom rules, then runs & checks.
const TM_CHALLENGES = {
  flip: { title: 'Flip every bit', start: '101', target: '010', hint: 'Move right across the tape; swap each 0↔1 as you go; stop when you reach the blank.' },
  append: { title: 'Append a 1', start: '11', target: '111', hint: 'Walk right to the first blank cell, then write a 1 there.' },
  erase: { title: 'Erase the tape', start: '101', target: '(blank)', hint: 'Move right and blank out every symbol you read.' },
};
let tmActiveChallenge = null;

let currentProgram = 'binary_counter';

function tmLoadProgram() {
  currentProgram = document.getElementById('tm-program-select').value;
  const editor = document.getElementById('tm-custom-editor');
  if (editor) editor.style.display = currentProgram === 'custom' ? 'block' : 'none';
  tmReset();
}

function tmReset() {
  const prog = tmPrograms[currentProgram];
  tmTape = { ...prog.tape };
  tmHead = 0;
  tmState = prog.initial;
  tmStepCount = 0;
  if (tmPlayback && tmPlayback.playing) tmPlayback.stop();
  renderTMRules();
  renderTMTape();
  updateTMUI();
}

function renderTMRules() {
  const rulesEl = document.getElementById('tm-rules');
  if (!rulesEl) return;

  let rulesHtml = '';
  const prog = tmPrograms[currentProgram];
  for (let i = 0; i < prog.rules.length; i++) {
    const r = prog.rules[i];
    const isCurrent = r.s === tmState && r.r === (tmTape[tmHead] || ' ');
    rulesHtml += `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 0.5rem; text-align: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border); position: relative; ${isCurrent ? 'background: var(--soft-orange); font-weight: bold; color: var(--accent-orange);' : ''}">
                <div>${r.s}</div>
                <div>'${r.r}'</div>
                <div>'${r.w}'</div>
                <div>${r.m}</div>
                <div>${r.n}</div>
                ${currentProgram === 'custom' ? `<button onclick="tmRemoveCustomRule(${i})" style="position: absolute; right: -15px; top: 0; bottom: 0; background: none; border: none; color: var(--accent-red); cursor: pointer; font-weight: bold; font-size: 1rem; padding: 0 5px;" title="Remove Rule">&times;</button>` : ''}
            </div>
        `;
  }
  rulesEl.innerHTML = rulesHtml;
}

function renderTMTape() {
  const tapeEl = document.getElementById('tm-tape');
  if (!tapeEl) return;

  let minIdx = tmHead - 10;
  let maxIdx = tmHead + 10;

  const keys = Object.keys(tmTape).map(Number);
  if (keys.length > 0) {
    minIdx = Math.min(minIdx, Math.min(...keys) - 2);
    maxIdx = Math.max(maxIdx, Math.max(...keys) + 2);
  }

  let html = '';
  for (let i = minIdx; i <= maxIdx; i++) {
    const val = tmTape[i] || ' ';
    html += `<div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--soft-blue-border); font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; color: var(--text-main); flex-shrink: 0; background: ${i === tmHead ? 'var(--surface)' : 'var(--surface-3)'}; font-weight: ${i === tmHead ? 'bold' : 'normal'}; box-sizing: border-box;">${val === ' ' ? '&nbsp;' : val}</div>`;
  }

  tapeEl.innerHTML = html;

  const headOffset = tmHead - minIdx;
  const offsetPx = -(headOffset * 50) + tapeEl.parentElement.clientWidth / 2 - 25;
  tapeEl.style.left = offsetPx + 'px';
}

function updateTMUI() {
  const stEl = document.getElementById('tm-current-state');
  if (stEl) {
    stEl.textContent = tmState;
    document.getElementById('tm-step-count').textContent = tmStepCount;
    renderTMRules();
  }
}

function tmStep() {
  const prog = tmPrograms[currentProgram];
  const symbol = tmTape[tmHead] || ' ';

  const rule = prog.rules.find((r) => r.s === tmState && r.r === symbol);
  if (!rule) {
    if (tmPlayback && tmPlayback.playing) tmPlayback.stop();
    document.getElementById('tm-current-state').textContent = tmState + ' (HALTED)';
    return;
  }

  if (rule.w !== ' ') tmTape[tmHead] = rule.w;
  else delete tmTape[tmHead];

  if (rule.m === 'R') tmHead++;
  else if (rule.m === 'L') tmHead--;

  tmState = rule.n;
  tmStepCount++;

  renderTMTape();
  updateTMUI();
}

function tmTogglePlay() {
  tmPlayback.toggle();
}

function tmUpdateCustomInit() {
  if (currentProgram !== 'custom') return;
  const tapeStr = document.getElementById('tm-custom-tape').value || '';
  const initState = document.getElementById('tm-custom-state').value || 'q0';

  const newTape = {};
  for (let i = 0; i < tapeStr.length; i++) newTape[i] = tapeStr[i];

  tmPrograms.custom.tape = newTape;
  tmPrograms.custom.initial = initState;
  tmReset();
}

function tmAddCustomRule() {
  if (currentProgram !== 'custom') return;
  const s = document.getElementById('tm-rule-s').value || 'q0';
  let r = document.getElementById('tm-rule-r').value || ' ';
  let w = document.getElementById('tm-rule-w').value || ' ';
  const m = document.getElementById('tm-rule-m').value || 'R';
  const n = document.getElementById('tm-rule-n').value || 'q1';

  if (r === '') r = ' ';
  if (w === '') w = ' ';

  tmPrograms.custom.rules.push({ s, r, w, m, n });

  document.getElementById('tm-rule-s').value = n; // next state usually becomes current
  document.getElementById('tm-rule-r').value = '';
  document.getElementById('tm-rule-w').value = '';
  document.getElementById('tm-rule-m').value = 'R';
  document.getElementById('tm-rule-n').value = '';

  tmReset();
}

function tmRemoveCustomRule(index) {
  if (currentProgram !== 'custom') return;
  tmPrograms.custom.rules.splice(index, 1);
  tmReset();
}

// ---------- build-a-machine challenges ----------
function tapeToString(tape) {
  const keys = Object.keys(tape).map(Number).filter((k) => tape[k] && tape[k] !== ' ');
  if (!keys.length) return '';
  const min = Math.min(...keys);
  const max = Math.max(...keys);
  let s = '';
  for (let i = min; i <= max; i++) s += tape[i] && tape[i] !== ' ' ? tape[i] : '_';
  return s;
}

function runCustomToHalt(cap = 3000) {
  const prog = tmPrograms.custom;
  const tape = { ...prog.tape };
  let head = 0;
  let state = prog.initial;
  let steps = 0;
  while (steps < cap) {
    const sym = tape[head] || ' ';
    const rule = prog.rules.find((r) => r.s === state && r.r === sym);
    if (!rule) break;
    if (rule.w !== ' ') tape[head] = rule.w;
    else delete tape[head];
    if (rule.m === 'R') head++;
    else if (rule.m === 'L') head--;
    state = rule.n;
    steps++;
  }
  return { tape, halted: steps < cap, steps };
}

function tmLoadChallengeTape(ch) {
  const tapeObj = {};
  for (let i = 0; i < ch.start.length; i++) tapeObj[i] = ch.start[i];
  tmPrograms.custom.tape = tapeObj;
  tmPrograms.custom.initial = 'q0';
  document.getElementById('tm-custom-tape').value = ch.start;
  document.getElementById('tm-custom-state').value = 'q0';
}

function tmSelectChallenge(id) {
  tmActiveChallenge = id;
  const ch = TM_CHALLENGES[id];
  document.getElementById('tm-program-select').value = 'custom';
  tmPrograms.custom.rules = [];
  tmLoadChallengeTape(ch);
  tmLoadProgram();
  document.querySelectorAll('.tm-challenge-btn').forEach((b) => b.classList.toggle('active', b.dataset.tmc === id));
  const status = document.getElementById('tm-challenge-status');
  status.className = 'tm-challenge-status';
  status.innerHTML = `<b>${ch.title}:</b> turn <span class="mono">${ch.start}</span> into <span class="mono">${ch.target}</span>. ${ch.hint} Add transition rules below, then press <b>Run &amp; Check</b>.`;
}

function tmRunCheck() {
  const status = document.getElementById('tm-challenge-status');
  if (!tmActiveChallenge) {
    status.innerHTML = 'Pick a challenge above first.';
    return;
  }
  const ch = TM_CHALLENGES[tmActiveChallenge];
  currentProgram = 'custom';
  tmLoadChallengeTape(ch); // always test against the intended input
  const res = runCustomToHalt();
  const out = tapeToString(res.tape);
  const targetNorm = ch.target === '(blank)' ? '' : ch.target;
  tmReset();
  if (!res.halted) {
    status.className = 'tm-challenge-status fail';
    status.innerHTML = `<b>Didn't halt</b> after ${res.steps} steps — your machine loops forever on this input.`;
  } else if (out === targetNorm) {
    markProgress('applied');
    status.className = 'tm-challenge-status done';
    status.innerHTML = `<b>✓ Solved!</b> Halted in ${res.steps} steps with tape <span class="mono">${out || '(blank)'}</span> — exactly the target.`;
  } else {
    status.className = 'tm-challenge-status fail';
    status.innerHTML = `<b>Not yet.</b> Halted in ${res.steps} steps with <span class="mono">${out || '(blank)'}</span>, but the target is <span class="mono">${ch.target}</span>. Tweak your rules.`;
  }
}

export function init() {
  tmPlayback = createPlayback({
    button: document.getElementById('tm-play-btn'),
    onTick: tmStep,
    interval: 200,
    playBg: 'var(--accent-orange)',
    playColor: '#fff',
    pauseBg: 'var(--soft-orange)',
    pauseColor: 'var(--accent-orange)',
  });

  document.querySelectorAll('.tm-challenge-btn').forEach((b) =>
    b.addEventListener('click', () => tmSelectChallenge(b.dataset.tmc)),
  );
  const checkBtn = document.getElementById('tm-check');
  if (checkBtn) checkBtn.addEventListener('click', tmRunCheck);

  tmReset();
}

// Re-lay-out the tape once the tab is actually visible (correct container width).
export function onShow() {
  renderTMTape();
  renderTMRules();
}

export const handlers = {
  tmLoadProgram, tmReset, tmStep, tmTogglePlay,
  tmUpdateCustomInit, tmAddCustomRule, tmRemoveCustomRule,
};
