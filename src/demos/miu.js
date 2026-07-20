// Chapter 1 — MIU puzzle ladder (homage to the MU puzzle in GEB).
// A sequence of authored derivation puzzles teaches each rule in turn, then the
// unsolvable MU capstone reveals the I-count invariant — a first taste of a
// formal system proving its own limits. Puzzles/par verified in
// scratchpad/validate-miu.mjs.
import { markProgress } from '../core/progress.js';

const LEVELS = [
  {
    start: 'MI', target: 'MIU', par: 1,
    teach: '<b>Rule 1</b> appends a U whenever the string ends in I. Just one move here.',
  },
  {
    start: 'MI', target: 'MIIII', par: 2,
    teach: '<b>Rule 2</b> copies everything after the M, so the number of I&rsquo;s doubles: 1 &rarr; 2 &rarr; 4.',
  },
  {
    start: 'MI', target: 'MIIIIIIII', par: 3,
    teach: 'Keep doubling with Rule 2. Notice the I-count only ever doubles &mdash; 1, 2, 4, 8&hellip; it never lands on a multiple of 3.',
  },
  {
    start: 'MI', target: 'MUI', par: 3,
    teach: '<b>Rule 3</b> collapses three <em>consecutive</em> I&rsquo;s into a single U. First manufacture a run of at least three I&rsquo;s.',
  },
  {
    start: 'MI', target: 'MUIU', par: 4,
    teach: 'Combine everything to reach MUIU &mdash; the string Hofstadter first sets you chasing.',
  },
  {
    start: 'MI', target: 'MU', par: null, unsolvable: true,
    teach: 'The famous one. Try to reach <b>MU</b>&hellip; and when it resists you, ask <em>why</em>.',
    reveal:
      'MU needs <b>zero</b> I&rsquo;s. Watch what the rules do to the I-count: Rule 1 and Rule 4 leave it alone, Rule 2 <b>doubles</b> it, Rule 3 subtracts <b>3</b>. Starting from a single I, the count can never become a multiple of 3 &mdash; and 0 is a multiple of 3. So no legal sequence of moves reaches MU. It is impossible not by accident but by a <b>structural invariant</b> of the system: the rules themselves forbid it. That is a formal system telling you, from the inside, that some perfectly meaningful-looking goals simply cannot be derived &mdash; your first taste of G&ouml;del.',
  },
];

// Deterministic, first-occurrence rule semantics (match validate-miu.mjs).
function ruleResult(s, n) {
  if (n === 1) return s.endsWith('I') ? s + 'U' : null;
  if (n === 2) return s.startsWith('M') ? 'M' + s.slice(1) + s.slice(1) : null;
  if (n === 3) return s.includes('III') ? s.replace('III', 'U') : null;
  if (n === 4) return s.includes('UU') ? s.replace('UU', '') : null;
  return null;
}
function applicable(s, n) {
  const r = ruleResult(s, n);
  return r !== null && r !== s;
}

let li = 0;
let current = 'MI';
let trail = [{ str: 'MI', rule: null }];
let freePlay = false;
const solved = new Set();

let elLevel, elTarget, elStart, elMoves, elPar, elTeach, elCurrent, elTrail, elFeedback, elBuilder, elRuleBtns;

function moves() { return trail.length - 1; }

function level() { return LEVELS[li]; }

function setFeedback(html, kind = '') {
  elFeedback.className = 'miu-feedback' + (kind ? ' ' + kind : '');
  elFeedback.innerHTML = html;
}

function renderRules() {
  elRuleBtns.forEach((btn) => {
    const n = Number(btn.dataset.rule);
    const can = applicable(current, n);
    btn.classList.toggle('can', can);
    btn.classList.toggle('cant', !can);
  });
}

function renderTrail() {
  elTrail.innerHTML = '';
  trail.forEach((step) => {
    const li2 = document.createElement('li');
    const badge = step.rule
      ? `<span class="miu-rule-badge">${typeof step.rule === 'number' ? 'R' + step.rule : step.rule}</span>`
      : '<span class="miu-rule-badge start">start</span>';
    li2.innerHTML = `${badge}<span class="mono miu-trail-str">${step.str}</span>`;
    elTrail.appendChild(li2);
  });
  elTrail.scrollTop = elTrail.scrollHeight;
}

function render() {
  elCurrent.textContent = current;
  elMoves.textContent = moves();
  renderRules();
  renderTrail();
}

function updateHeader() {
  const L = level();
  if (freePlay) {
    elLevel.textContent = 'Free play';
    elTarget.textContent = '—';
    elStart.textContent = 'MI';
    elPar.textContent = '—';
    elTeach.innerHTML = 'No target. Experiment freely: apply any rule, append symbols, and watch what the system can and cannot reach.';
    return;
  }
  elLevel.textContent = `Puzzle ${li + 1} / ${LEVELS.length}`;
  elTarget.textContent = L.target;
  elStart.textContent = L.start;
  elPar.textContent = L.par === null ? '∞' : L.par;
  elTeach.innerHTML = L.teach;
}

function pulseCurrent() {
  elCurrent.classList.remove('miu-win-pulse');
  void elCurrent.offsetWidth;
  elCurrent.classList.add('miu-win-pulse');
}

function flashCurrent() {
  elCurrent.classList.remove('miu-flash');
  void elCurrent.offsetWidth;
  elCurrent.classList.add('miu-flash');
}

function loadLevel(i) {
  li = i;
  freePlay = false;
  current = LEVELS[i].start;
  trail = [{ str: current, rule: null }];
  elBuilder.style.display = 'none';
  updateHeader();
  render();

  const L = level();
  if (L.unsolvable) {
    setFeedback(
      `This target can&rsquo;t be reached &mdash; but convince yourself by trying. <button class="btn btn-icon miu-inline-btn" id="miu-reveal">Why is MU impossible? &rarr;</button>`,
    );
    document.getElementById('miu-reveal').addEventListener('click', () => {
      setFeedback(`<div class="miu-reveal">${L.reveal}</div>`, 'reveal');
    });
  } else {
    setFeedback('');
  }
}

function checkWin() {
  const L = level();
  if (!freePlay && !L.unsolvable && current === L.target) {
    solved.add(li);
    markProgress('foundations');
    pulseCurrent();
    const overPar = moves() - L.par;
    const grade =
      overPar <= 0 ? 'Optimal &mdash; par solve!' : `Solved in ${moves()} (par ${L.par}).`;
    if (li < LEVELS.length - 1) {
      setFeedback(
        `<b style="color:var(--accent-green)">Derived ${L.target}!</b> ${grade} <button class="btn btn-icon miu-inline-btn" id="miu-next">Next puzzle &rarr;</button>`,
        'win',
      );
      document.getElementById('miu-next').addEventListener('click', () => loadLevel(li + 1));
    } else {
      setFeedback(`<b style="color:var(--accent-green)">Derived ${L.target}!</b> ${grade}`, 'win');
    }
  }
}

function applyRule(n) {
  const r = ruleResult(current, n);
  if (r === null || r === current) {
    flashCurrent();
    setFeedback(`Rule ${n} doesn&rsquo;t apply to <span class="mono">${current}</span> right now.`, 'warn');
    return;
  }
  current = r;
  trail.push({ str: current, rule: n });
  render();
  checkWin();
}

function appendChar(c) {
  if (!freePlay) return;
  current += c;
  trail.push({ str: current, rule: '+' + c });
  render();
}

function undo() {
  if (trail.length > 1) {
    trail.pop();
    current = trail[trail.length - 1].str;
    render();
    if (!freePlay && !level().unsolvable) setFeedback('');
  }
}

function toggleFreePlay() {
  if (freePlay) {
    loadLevel(li);
    return;
  }
  freePlay = true;
  current = 'MI';
  trail = [{ str: 'MI', rule: null }];
  elBuilder.style.display = 'flex';
  updateHeader();
  render();
  setFeedback('');
}

export function init() {
  elLevel = document.getElementById('miu-level');
  elTarget = document.getElementById('miu-target');
  elStart = document.getElementById('miu-start');
  elMoves = document.getElementById('miu-move-count');
  elPar = document.getElementById('miu-par');
  elTeach = document.getElementById('miu-teach');
  elCurrent = document.getElementById('miu-current');
  elTrail = document.getElementById('miu-trail');
  elFeedback = document.getElementById('miu-feedback');
  elBuilder = document.getElementById('miu-builder');
  if (!elCurrent) return;

  elRuleBtns = Array.from(document.querySelectorAll('.miu-rule'));
  elRuleBtns.forEach((btn) => btn.addEventListener('click', () => applyRule(Number(btn.dataset.rule))));
  elBuilder.querySelectorAll('[data-char]').forEach((btn) =>
    btn.addEventListener('click', () => appendChar(btn.dataset.char)),
  );
  document.getElementById('miu-undo').addEventListener('click', undo);
  document.getElementById('miu-reset').addEventListener('click', () => loadLevel(li));
  document.getElementById('miu-free').addEventListener('click', toggleFreePlay);

  loadLevel(0);
}

// No inline handlers remain in the MIU markup.
export const handlers = {};
