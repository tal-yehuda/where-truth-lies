// Chapter 2 — the incompleteness ladder. A consistent system can't prove its own
// consistency (Con), so that sentence is a blind spot exactly like G. Add it as an
// axiom and you climb to a strictly stronger system — which has a fresh blind spot
// of its own. Where the independence game moves sideways (G / not-G), this moves up,
// making incompleteness read as a generative staircase rather than a dead end.
const MAX_RUNG = 6; // enough to feel endless; the note makes the "forever" explicit.

let level = 0;

function rungName(n) {
  return n === 0 ? 'PA' : `T<sub>${n}</sub>`;
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

    const ground = n === 0 ? ' — Peano Arithmetic, the ground floor' : '';
    const proves =
      n === 0
        ? ''
        : `<div class="ladder-proves">proves Con(${rungName(n - 1)}) ✓ — the rung below can't</div>`;

    rung.innerHTML = `
      <div class="ladder-rung-head">
        <span class="ladder-name">${rungName(n)}${ground}</span>
        <span class="ladder-role">${n === level ? 'you are here' : 'rung ' + n}</span>
      </div>
      ${proves}
      <div class="ladder-blind">blind spot: can't prove Con(${rungName(n)}) — its own consistency</div>`;
    stack.appendChild(rung);
  }

  if (status) {
    if (level >= MAX_RUNG) {
      status.innerHTML =
        '…and it keeps going, right up through the infinite ordinals. The ladder has no top rung.';
      if (climb) climb.disabled = true;
    } else if (level === 0) {
      status.innerHTML =
        "You're on <b>PA</b>, the ground floor. It can't prove its own consistency — so climb.";
      if (climb) climb.disabled = false;
    } else {
      status.innerHTML = `You're standing on <b>${rungName(level)}</b>. It proves the consistency of every system below it — and still can't prove its own.`;
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
