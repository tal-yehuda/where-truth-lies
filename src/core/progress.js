// Cross-chapter progress: each chapter's core interaction marks it "explored".
// Persisted in localStorage; shown as a ✓ on the chapter tabs and an N/5 tally.
const KEY = 'wtl-progress';
const CHAPTERS = ['foundations', 'truth', 'applied', 'interpretation', 'conclusion'];

let done = new Set();

function loadDone() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function updateUI() {
  CHAPTERS.forEach((id) => {
    const btn = document.getElementById('tab-btn-' + id);
    if (btn) btn.classList.toggle('completed', done.has(id));
  });
  const n = CHAPTERS.filter((c) => done.has(c)).length;
  const el = document.getElementById('progress-indicator');
  if (el) {
    el.textContent = n === 5 ? '★ all 5 chapters explored' : `${n}/5 chapters explored`;
    el.classList.toggle('all', n === 5);
  }
}

export function initProgress() {
  done = loadDone();
  updateUI();
}

export function markProgress(id) {
  if (done.has(id)) return;
  done.add(id);
  localStorage.setItem(KEY, JSON.stringify([...done]));
  updateUI();
}
