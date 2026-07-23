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
    // q0 sees the 1 and steps right into a blank; q1 steps back left onto the 1.
    // Neither rule ever removes the 1 or reads an undefined symbol, so the head
    // ping-pongs between the two cells forever — a machine that never halts.
    tape: { 0: '1' },
    rules: [
      { s: 'q0', r: '1', w: '1', m: 'R', n: 'q1' },
      { s: 'q1', r: ' ', w: ' ', m: 'L', n: 'q0' },
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

// HTML-escape a value going into an attribute.
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// The blank tape symbol shows as an empty editable cell (an empty cell means blank).
function cellVal(sym) {
  return sym === ' ' ? '' : sym;
}

function renderTMRules() {
  const rulesEl = document.getElementById('tm-rules');
  if (!rulesEl) return;

  const prog = tmPrograms[currentProgram];
  const editable = currentProgram === 'custom';
  let rulesHtml = '';

  for (let i = 0; i < prog.rules.length; i++) {
    const r = prog.rules[i];
    const isCurrent = r.s === tmState && r.r === (tmTape[tmHead] || ' ');
    if (editable) {
      // Each cell is an inline input, edited in place — no need to delete & retype.
      rulesHtml += `
            <div class="tm-rule-row${isCurrent ? ' current' : ''}">
                <input class="tm-rule-cell" value="${escAttr(r.s)}" oninput="tmEditCustomRule(${i},'s',this.value)" aria-label="state">
                <input class="tm-rule-cell" value="${escAttr(cellVal(r.r))}" placeholder="␣" oninput="tmEditCustomRule(${i},'r',this.value)" aria-label="read symbol">
                <input class="tm-rule-cell" value="${escAttr(cellVal(r.w))}" placeholder="␣" oninput="tmEditCustomRule(${i},'w',this.value)" aria-label="write symbol">
                <select class="tm-rule-cell" onchange="tmEditCustomRule(${i},'m',this.value)" aria-label="move">
                    <option value="R"${r.m === 'R' ? ' selected' : ''}>R</option>
                    <option value="L"${r.m === 'L' ? ' selected' : ''}>L</option>
                </select>
                <input class="tm-rule-cell" value="${escAttr(r.n)}" oninput="tmEditCustomRule(${i},'n',this.value)" aria-label="next state">
                <button class="tm-rule-remove" onclick="tmRemoveCustomRule(${i})" title="Remove rule">&times;</button>
            </div>`;
    } else {
      rulesHtml += `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 0.5rem; text-align: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border); ${isCurrent ? 'background: var(--soft-orange); font-weight: bold; color: var(--accent-orange); border-radius: 4px;' : ''}">
                <div>${r.s}</div>
                <div>'${r.r}'</div>
                <div>'${r.w}'</div>
                <div>${r.m}</div>
                <div>${r.n}</div>
            </div>`;
    }
  }

  if (editable && prog.rules.length === 0) {
    rulesHtml =
      '<div style="text-align:center; color: var(--text-muted); font-size: 0.9rem; padding: 0.6rem 0;">No rules yet — add one below, then edit any cell directly.</div>';
  }
  rulesEl.innerHTML = rulesHtml;
}

// Edit one field of an existing custom rule in place. We deliberately do NOT
// re-render the rules grid here (that would drop the focus mid-typing); the
// running machine reads prog.rules live, and the diagram is refreshed.
function tmEditCustomRule(index, field, value) {
  if (currentProgram !== 'custom') return;
  const rule = tmPrograms.custom.rules[index];
  if (!rule) return;
  let v = value;
  if ((field === 'r' || field === 'w') && v === '') v = ' ';
  rule[field] = v;
  renderTMDiagram();
}

// A live finite-state diagram of the current program: states as nodes, rules as
// labelled arrows (read→write,move). The active state is highlighted each step.
function tmEdgeLabel(x, y, text) {
  const w = text.length * 5.3 + 8;
  return `<g><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="${w.toFixed(1)}" height="16" rx="3" fill="var(--surface)" opacity="0.92"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'JetBrains Mono', monospace" font-size="9" fill="var(--text-muted)">${text}</text></g>`;
}

function renderTMDiagram() {
  const el = document.getElementById('tm-diagram');
  if (!el) return;
  const prog = tmPrograms[currentProgram];

  // States: initial first, then in first-seen order across the rules.
  const states = [];
  const seen = new Set();
  const add = (s) => { if (s && !seen.has(s)) { seen.add(s); states.push(s); } };
  add(prog.initial);
  prog.rules.forEach((r) => { add(r.s); add(r.n); });
  if (states.length === 0) {
    el.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; margin: 0.5rem 0;">Add a rule to see the state diagram.</p>';
    return;
  }

  const W = 380, H = 260, cx = W / 2, cy = H / 2, nodeR = 20;
  const layoutR = states.length === 1 ? 0 : 50;
  const pos = {};
  states.forEach((s, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / states.length;
    pos[s] = { x: cx + layoutR * Math.cos(ang), y: cy + layoutR * Math.sin(ang) };
  });

  const blank = (c) => (c === ' ' ? '␣' : c);
  const lbl = (r) => `${blank(r.r)}→${blank(r.w)},${r.m}`;

  // Group rules by directed (s → n) pair so parallel transitions share one arrow.
  const edges = {};
  prog.rules.forEach((r) => {
    const k = r.s + '' + r.n;
    (edges[k] = edges[k] || { s: r.s, n: r.n, labels: [] }).labels.push(lbl(r));
  });

  let svg = `<defs><marker id="tm-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-muted)"/></marker></defs>`;

  Object.values(edges).forEach((e) => {
    const text = e.labels.join('  ');
    const p = pos[e.s];
    if (e.s === e.n) {
      // Self-loop, opening outward from the layout centre (or up for a lone node).
      let ox = p.x - cx, oy = p.y - cy;
      const ol = Math.hypot(ox, oy) || 1;
      if (states.length === 1) { ox = 0; oy = -1; } else { ox /= ol; oy /= ol; }
      const dir = Math.atan2(oy, ox), spread = 0.5, out = 40;
      const a1 = dir - spread, a2 = dir + spread;
      const s1x = p.x + nodeR * Math.cos(a1), s1y = p.y + nodeR * Math.sin(a1);
      const s2x = p.x + nodeR * Math.cos(a2), s2y = p.y + nodeR * Math.sin(a2);
      const c1x = p.x + (nodeR + out) * Math.cos(a1), c1y = p.y + (nodeR + out) * Math.sin(a1);
      const c2x = p.x + (nodeR + out) * Math.cos(a2), c2y = p.y + (nodeR + out) * Math.sin(a2);
      svg += `<path d="M ${s1x.toFixed(1)} ${s1y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${s2x.toFixed(1)} ${s2y.toFixed(1)}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" marker-end="url(#tm-arrow)"/>`;
      svg += tmEdgeLabel(p.x + (nodeR + out + 8) * Math.cos(dir), p.y + (nodeR + out + 8) * Math.sin(dir), text);
    } else {
      const a = pos[e.s], b = pos[e.n];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, px = uy, py = -ux, curve = 24;
      const sx = a.x + ux * nodeR + px * 4, sy = a.y + uy * nodeR + py * 4;
      const ex = b.x - ux * nodeR + px * 4, ey = b.y - uy * nodeR + py * 4;
      const mx = (a.x + b.x) / 2 + px * curve, my = (a.y + b.y) / 2 + py * curve;
      svg += `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" marker-end="url(#tm-arrow)"/>`;
      svg += tmEdgeLabel(mx, my, text);
    }
  });

  // "start" arrow into the initial state, coming in from the left.
  const ip = pos[prog.initial];
  svg += `<path d="M ${(ip.x - nodeR - 22).toFixed(1)} ${ip.y.toFixed(1)} L ${(ip.x - nodeR - 3).toFixed(1)} ${ip.y.toFixed(1)}" fill="none" stroke="var(--accent-orange)" stroke-width="1.6" marker-end="url(#tm-arrow)"/>`;

  states.forEach((s) => {
    const p = pos[s], cur = s === tmState;
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${nodeR}" fill="${cur ? 'var(--soft-orange)' : 'var(--surface-3)'}" stroke="${cur ? 'var(--accent-orange)' : 'var(--border)'}" stroke-width="${cur ? 2.5 : 1.5}"/>`;
    svg += `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="${cur ? 'var(--accent-orange)' : 'var(--text-main)'}">${s}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width: 440px; height: auto; display: block; margin: 0 auto;" role="img" aria-label="State diagram of the current Turing machine">${svg}</svg>`;
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
    renderTMDiagram();
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
  renderTMDiagram();
}

export const handlers = {
  tmLoadProgram, tmReset, tmStep, tmTogglePlay,
  tmUpdateCustomInit, tmAddCustomRule, tmRemoveCustomRule, tmEditCustomRule,
};
