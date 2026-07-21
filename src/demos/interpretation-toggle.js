// Chapter 1 — the small "same syntax, two meanings" toggle (math vs. apples).

function setInterpretation(type) {
  const display = document.getElementById('interpretation-display');
  if (type === 1) {
    display.innerHTML =
      "1 plus 2 equals 3<br><span style='font-size: 1rem; color: var(--text-muted);'>(- = 1, p = plus, -- = 2, q = equals, --- = 3)</span>";
  } else if (type === 2) {
    display.innerHTML =
      "1 apple joined with 2 apples gives 3 apples<br><span style='font-size: 1rem; color: var(--text-muted);'>(- = apple, p = joined with, q = gives)</span>";
  }
}

export const handlers = { setInterpretation };
