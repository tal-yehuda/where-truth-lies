// Chapter 3 — the halting paradox made playable.
//   1. A 3-scene animation of the diagonal argument: H takes (machine, input) and
//      answers; D is built from H to do the opposite; feed D itself and the answer
//      flips forever — so H can't exist.
//   2. The "You are H" game: the reader predicts D's behavior and is defeated either
//      way, feeling the trap the animation lays out.

const SCENES = [
  {
    title: 'Step 1 — the dream machine H',
    stage: `
      <div class="halt-flow">
        <div class="halt-inputs">
          <div class="halt-chip in">machine M</div>
          <div class="halt-chip in">input I</div>
        </div>
        <div class="halt-arrow">&rarr;</div>
        <div class="halt-box">H</div>
        <div class="halt-arrow">&rarr;</div>
        <div class="halt-chip out ok">HALTS &check;</div>
      </div>`,
    caption:
      'Assume a perfect decider <b>H</b> exists: hand it any machine M and input I, and it always answers correctly &mdash; <b>HALTS</b> or <b>runs forever</b> &mdash; without ever running M itself.',
  },
  {
    title: 'Step 2 — build a troublemaker D',
    stage: `
      <div class="halt-flow">
        <div class="halt-chip in">machine M</div>
        <div class="halt-arrow">&rarr;</div>
        <div class="halt-box big halt-d">
          <div class="halt-box-name">D</div>
          <div class="halt-d-sub">asks H: does M halt when run on <b>itself</b>? &mdash; then does the <b>opposite</b>:</div>
          <div class="halt-branches">
            <div class="halt-branch">
              <span class="halt-tag ok">H: M halts &check;</span>
              <span class="halt-branch-arrow">&rarr; so D</span>
              <span class="halt-tag bad">loops forever &infin;</span>
            </div>
            <div class="halt-branch">
              <span class="halt-tag bad">H: M loops &infin;</span>
              <span class="halt-branch-arrow">&rarr; so D</span>
              <span class="halt-tag ok">halts &check;</span>
            </div>
          </div>
        </div>
      </div>`,
    caption:
      'Using H as a part, we build a new machine <b>D</b>. Whatever H predicts, D does the <b>opposite</b>. Note the one question D asks: does M halt when run on <em>its own code</em> — machine and input both M. That self-feeding is the trap: in the next step we hand D <em>itself</em>, so its question turns back on D. A fixed input I wouldn&rsquo;t loop back on the machine being tested, and the contradiction would never close.',
  },
  {
    title: 'Step 3 — feed D its own code',
    stage: `
      <div class="halt-flow">
        <div class="halt-chip in">machine D</div>
        <div class="halt-arrow">&rarr;</div>
        <div class="halt-box big">
          <div class="halt-box-name">D</div>
          <div class="halt-think" id="halt-think"></div>
        </div>
        <div class="halt-arrow">&rarr;</div>
        <div class="halt-chip out" id="halt-flip"></div>
      </div>`,
    caption:
      'Now run D on <b>itself</b>. It asks H &ldquo;does D halt on D?&rdquo; and flips the answer &mdash; so H is wrong <em>whichever</em> way it answers. No consistent answer exists, so a perfect <b>H cannot exist</b>.',
  },
];

const FLIP = [
  { think: 'H says: “D halts on D”', out: 'so D LOOPS &infin;', cls: 'bad' },
  { think: 'H says: “D loops on D”', out: 'so D HALTS &check;', cls: 'ok' },
];

let scene = 0;
let flipTimer = null;
let flipState = 0;

function stopFlip() {
  if (flipTimer) {
    clearInterval(flipTimer);
    flipTimer = null;
  }
}

function paintFlip() {
  const think = document.getElementById('halt-think');
  const out = document.getElementById('halt-flip');
  if (!think || !out) return stopFlip();
  const f = FLIP[flipState % 2];
  think.innerHTML = f.think;
  out.innerHTML = f.out;
  out.className = `halt-chip out ${f.cls}`;
  void out.offsetWidth; // restart the pulse animation
  out.classList.add('halt-pulse');
}

function renderScene() {
  const titleEl = document.getElementById('halt-anim-title');
  const stageEl = document.getElementById('halt-anim-stage');
  const capEl = document.getElementById('halt-anim-caption');
  const dotsEl = document.getElementById('halt-anim-dots');
  const prev = document.getElementById('halt-anim-prev');
  const next = document.getElementById('halt-anim-next');
  if (!stageEl) return;

  const s = SCENES[scene];
  titleEl.textContent = s.title;
  stageEl.innerHTML = `<div class="halt-scene-enter">${s.stage}</div>`;
  capEl.innerHTML = s.caption;
  dotsEl.innerHTML = SCENES.map((_, i) => `<span class="halt-dot${i === scene ? ' active' : ''}"></span>`).join('');
  prev.disabled = scene === 0;
  next.disabled = scene === SCENES.length - 1;

  stopFlip();
  if (scene === 2) {
    flipState = 0;
    paintFlip();
    flipTimer = setInterval(() => {
      flipState++;
      paintFlip();
    }, 1500);
  }
}

function initAnimation() {
  const stageEl = document.getElementById('halt-anim-stage');
  if (!stageEl) return;
  document.getElementById('halt-anim-prev').addEventListener('click', () => {
    if (scene > 0) scene--;
    renderScene();
  });
  document.getElementById('halt-anim-next').addEventListener('click', () => {
    if (scene < SCENES.length - 1) scene++;
    renderScene();
  });
  renderScene();
}

function initGame() {
  const res = document.getElementById('halting-result');
  if (!res) return;

  const show = (msg) => {
    res.className = 'halting-result show';
    res.innerHTML = msg;
  };

  const haltBtn = document.getElementById('halt-predict-halt');
  const loopBtn = document.getElementById('halt-predict-loop');

  if (haltBtn) {
    haltBtn.addEventListener('click', () =>
      show(
        'You predicted <b>HALT</b>. But D is built to do the opposite of your verdict — so D now <b>loops forever</b>. Your prediction was wrong. ✗<br><span class="halting-nudge">Now try the other answer…</span>',
      ),
    );
  }
  if (loopBtn) {
    loopBtn.addEventListener('click', () =>
      show(
        'You predicted <b>runs forever</b>. So D spitefully <b>halts immediately</b>. Wrong again. ✗<br><b>Whatever H answers, D makes it false — so a perfect H cannot exist.</b>',
      ),
    );
  }
}

export function init() {
  initAnimation();
  initGame();
}

export const handlers = {};
