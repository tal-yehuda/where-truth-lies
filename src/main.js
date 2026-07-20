// Single entry point: wire inline handlers, initialize every demo once, and
// register lazy re-layout hooks for tabs whose demos need a visible container.
import { switchTab, navPrev, navNext, updateFloatingNav } from './core/tabs.js';
import { onTabShow } from './core/registry.js';
import { initTheme, toggleTheme } from './core/theme.js';
import { initProgress } from './core/progress.js';
import { highlightRef, clearRef } from './lib/dom.js';

import * as unroller from './demos/unroller.js';
import * as godelSandbox from './demos/godel-sandbox.js';
import * as turing from './demos/turing.js';
import * as gameOfLife from './demos/game-of-life.js';
import * as miu from './demos/miu.js';
import * as interpretationToggle from './demos/interpretation-toggle.js';
import * as physics from './demos/physics.js';
import * as halting from './demos/halting.js';

// Expose the functions still referenced by inline on* attributes in index.html
// (and by the markup generated at runtime by some demos).
Object.assign(window, {
  switchTab,
  navPrev,
  navNext,
  toggleTheme,
  highlightRef,
  clearRef,
  ...unroller.handlers,
  ...godelSandbox.handlers,
  ...turing.handlers,
  ...gameOfLife.handlers,
  ...miu.handlers,
  ...interpretationToggle.handlers,
  ...physics.handlers,
});

// Module scripts are deferred, so the DOM is parsed by the time this runs.
initTheme();
unroller.init();
godelSandbox.init();
turing.init();
gameOfLife.init();
miu.init();
physics.init();
halting.init();

// Re-layout demos that need their (previously hidden) container to be visible.
onTabShow('applied', turing.onShow);
onTabShow('interpretation', gameOfLife.onShow);

updateFloatingNav('home');
initProgress();
