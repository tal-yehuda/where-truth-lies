// Small shared DOM helpers used across demos.

// Add the `highlighted` class to a set of element ids (used by the Gödel
// derivation list on hover).
export function highlightRef(ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('highlighted');
  });
}

export function clearRef() {
  document.querySelectorAll('.derivation-list li').forEach((el) => {
    el.classList.remove('highlighted');
  });
}

// Briefly highlight a referenced definition line, then fade it out.
export function highlightRefPulse(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('highlighted');
    setTimeout(() => el.classList.remove('highlighted'), 800);
  }
}

// Restart a CSS animation class (e.g. `shake`) even if it is already applied,
// by forcing a reflow between removing and re-adding it.
export function triggerReflow(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add(className);
}

// Format a (possibly enormous) BigInt into compact scientific notation HTML.
export function formatScientific(bigIntNum) {
  if (bigIntNum === 0n) return '0';
  const str = bigIntNum.toString();
  if (str.length <= 5) return str;
  const exponent = str.length - 1;
  const mantissa = str[0] + '.' + str.substring(1, 4);
  return `${mantissa} &times; 10<sup>${exponent}</sup>`;
}

// Resolve a CSS custom property (e.g. '--accent-purple') to its computed value.
// Canvas 2D cannot read `var(--x)` directly, so demos that paint to a canvas
// use this to stay in sync with the (theme-aware) design tokens.
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
