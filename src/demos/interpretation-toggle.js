// Chapter 1 — the "same syntax, chosen meaning" toggle. One legal string,
// three readings (including none at all), to make the syntax/semantics split
// concrete: meaning is projected onto symbols, never carried by them.
const MESSAGES = {
  1: "1 plus 2 equals 3<br><span style='font-size: 1rem; color: var(--text-muted);'>(- = 1, p = plus, -- = 2, q = equals, --- = 3)</span>",
  2: "1 apple joined with 2 apples gives 3 apples<br><span style='font-size: 1rem; color: var(--text-muted);'>(- = apple, p = joined with, q = gives)</span>",
  3: "…nothing at all. It is a legal string and no more.<br><span style='font-size: 1rem; color: var(--text-muted);'>The rules never promised it would mean anything — meaning is something you add, or leave off.</span>",
};

function setInterpretation(type) {
  const display = document.getElementById('interpretation-display');
  if (!display) return;
  display.innerHTML = MESSAGES[type];
  document
    .querySelectorAll('.interp-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.interp === String(type)));
}

export function init() {
  document
    .querySelectorAll('.interp-btn')
    .forEach((b) => b.addEventListener('click', () => setInterpretation(Number(b.dataset.interp))));
}

export const handlers = {};
