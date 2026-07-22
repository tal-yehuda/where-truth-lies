// Chapter 2 — the incompleteness ladder. Every system in the tower has its own
// Gödel sentence H it can't prove (for PA, that H is the G just built). Add a
// level's H as an axiom and you climb to a strictly stronger system — which has a
// fresh H of its own. This makes incompleteness read as a generative staircase
// rather than a dead end: each blind spot becomes the next level up.
const MAX_RUNG = 6; // enough to feel endless; the note makes the "forever" explicit.

let level = 0;

function rungName(n) {
  return n === 0 ? 'PA' : `T<sub>${n}</sub>`;
}

// The Gödel sentence of level n — the truth that level can't prove.
function hName(n) {
  return `H<sub>${n}</sub>`;
}

function render() {
  const stack = document.getElementById('ladder-stack');
  const status = document.getElementById('ladder-status');
  const climb = document.getElementById('ladder-climb');
  if (!stack) return;

  stack.innerHTML = '';
  for (let n = 0; n <= level; n++) {
    const rung = document.createElement('div');
    rung.className = 'ladder-rung' + (n === level ? ' current' : '');
    if (n === level && n > 0) rung.classList.add('just-added');

    const ground = n === 0 ? ' — Peano Arithmetic, the base level' : ` = ${rungName(n - 1)} + ${hName(n - 1)}`;
    const proves =
      n === 0
        ? ''
        : `<div class="ladder-proves">proves ${hName(n - 1)} ✓ — the level below couldn't</div>`;

    rung.innerHTML = `
      <div class="ladder-rung-head">
        <span class="ladder-name">${rungName(n)}${ground}</span>
        <span class="ladder-role">${n === level ? 'you are here' : 'level ' + n}</span>
      </div>
      ${proves}
      <div class="ladder-blind">blind spot: can't prove ${hName(n)} — its own Gödel sentence</div>`;
    stack.appendChild(rung);
  }

  if (status) {
    if (level >= MAX_RUNG) {
      status.innerHTML =
        '…and it keeps going, right up through the infinite ordinals. The ladder has no top level.';
      if (climb) climb.disabled = true;
    } else if (level === 0) {
      status.innerHTML =
        "You're on <b>PA</b>, the base level. It can't prove its own Gödel sentence <b>H<sub>0</sub></b> (that's the G you just built) — so climb.";
      if (climb) climb.disabled = false;
    } else {
      status.innerHTML = `You're standing on <b>${rungName(level)}</b>. It proves every Gödel sentence below it — and still can't prove its own, <b>${hName(level)}</b>.`;
      if (climb) climb.disabled = false;
    }
  }
}

export function init() {
  const climb = document.getElementById('ladder-climb');
  const reset = document.getElementById('ladder-reset');
  if (!climb) return;

  climb.addEventListener('click', () => {
    if (level < MAX_RUNG) level += 1;
    render();
  });
  reset.addEventListener('click', () => {
    level = 0;
    render();
  });
  render();
}

export const handlers = {};
