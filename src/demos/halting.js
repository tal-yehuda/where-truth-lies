// Chapter 3 — the halting paradox made playable. The user acts as the perfect
// halting-decider H and predicts what the diagonal machine D does when run on
// itself. Either prediction is defeated, dramatizing why H cannot exist.
export function init() {
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

export const handlers = {};
