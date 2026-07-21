// Light/dark theme: respects the OS preference by default, lets the user
// override with the header toggle, and remembers the choice.
const KEY = 'wtl-theme';

function effectiveTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateToggleIcon() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const dark = effectiveTheme() === 'dark';
  btn.textContent = dark ? '☀' : '☾';
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateToggleIcon();
}

export function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(KEY, next);
  updateToggleIcon();
}
