// Lightweight registry so each demo can run code the first time (and every
// time) its tab becomes visible. This replaces the old setTimeout(…, 100/500)
// sizing hacks: canvas/tape layout that needs a visible container runs on show.
const onShowHandlers = {};

export function onTabShow(tabId, fn) {
  onShowHandlers[tabId] = fn;
}

export function fireTabShow(tabId) {
  const fn = onShowHandlers[tabId];
  if (fn) fn();
}
