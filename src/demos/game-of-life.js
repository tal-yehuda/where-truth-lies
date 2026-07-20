// Chapter 4 — Conway's Game of Life. A free sandbox (pan/zoom/draw) plus
// pattern-goal challenges: build a still life, an oscillator, or a spaceship.
// The engine watches the evolving grid and detects each phenomenon
// automatically — an object "emerging" from pure local rules, which is exactly
// the chapter's point about interpretation.
import { createPlayback } from '../lib/playback.js';
import { cssVar } from '../lib/dom.js';
import { markProgress } from '../core/progress.js';

let golCanvas, golCtx;
let golGrid = {}; // Set of live cell coordinates: "x,y"
let golGeneration = 0;
let golCellSize = 15;
let golOffsetX = 0;
let golOffsetY = 0;
let isDragging = false;
let isDrawing = false;
let golLastMousePos = { x: 0, y: 0 };
let golPlayback = null;

// Challenge state
let golHistory = []; // { gen, key, norm, pop } snapshots for phenomenon detection
const golCompleted = new Set();
let activeGoal = null;

const GOALS = {
  still: {
    label: 'Still life',
    hint: 'Place cells so that after stepping, nothing ever changes. (A 2×2 block is the classic.)',
    done: 'a shape the rules leave perfectly unchanged',
  },
  oscillator: {
    label: 'Oscillator',
    hint: 'Make a pattern that returns to itself every few generations. (Three cells in a row — a "blinker" — is the smallest.)',
    done: 'a pattern that cycles forever',
  },
  spaceship: {
    label: 'Spaceship',
    hint: 'Make a pattern that keeps its shape but travels across the grid. (The 5-cell glider is the smallest.)',
    done: 'a pattern that glides — an "object" moving through a world with no notion of motion',
  },
};

function getGridPos(clientX, clientY) {
  const rect = golCanvas.getBoundingClientRect();
  const scaleX = golCanvas.width / rect.width;
  const scaleY = golCanvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const worldX = x - golOffsetX - golCanvas.width / 2;
  const worldY = y - golOffsetY - golCanvas.height / 2;
  return { cx: Math.floor(worldX / golCellSize), cy: Math.floor(worldY / golCellSize) };
}

function golMouseDown(e) {
  if (e.button === 0) {
    isDrawing = true;
    const pos = getGridPos(e.clientX, e.clientY);
    const key = `${pos.cx},${pos.cy}`;
    if (golGrid[key]) delete golGrid[key];
    else golGrid[key] = true;
    resetHistory();
    renderGOL();
  } else if (e.button === 1 || e.button === 2) {
    isDragging = true;
    golLastMousePos = { x: e.clientX, y: e.clientY };
  }
}

function golMouseMove(e) {
  if (isDragging) {
    golOffsetX += e.clientX - golLastMousePos.x;
    golOffsetY += e.clientY - golLastMousePos.y;
    golLastMousePos = { x: e.clientX, y: e.clientY };
    renderGOL();
  } else if (isDrawing) {
    const pos = getGridPos(e.clientX, e.clientY);
    golGrid[`${pos.cx},${pos.cy}`] = true;
    resetHistory();
    renderGOL();
  }
}

function golMouseUp() {
  isDragging = false;
  isDrawing = false;
}

function golWheel(e) {
  e.preventDefault();
  const zoomFactor = 1.1;
  if (e.deltaY < 0) golCellSize *= zoomFactor;
  else golCellSize /= zoomFactor;
  golCellSize = Math.max(3, Math.min(golCellSize, 50));
  renderGOL();
}

function renderGOL() {
  if (!golCtx || golCanvas.width === 0) return;
  golCtx.clearRect(0, 0, golCanvas.width, golCanvas.height);

  if (golCellSize > 5) {
    golCtx.strokeStyle = 'rgba(153, 51, 255, 0.1)';
    golCtx.lineWidth = 1;
    const startX = (golOffsetX + golCanvas.width / 2) % golCellSize;
    const startY = (golOffsetY + golCanvas.height / 2) % golCellSize;
    for (let x = startX; x < golCanvas.width; x += golCellSize) {
      golCtx.beginPath();
      golCtx.moveTo(x, 0);
      golCtx.lineTo(x, golCanvas.height);
      golCtx.stroke();
    }
    for (let y = startY; y < golCanvas.height; y += golCellSize) {
      golCtx.beginPath();
      golCtx.moveTo(0, y);
      golCtx.lineTo(golCanvas.width, y);
      golCtx.stroke();
    }
  }

  golCtx.fillStyle = cssVar('--accent-purple') || '#9933ff';
  let pop = 0;
  for (const key in golGrid) {
    const [x, y] = key.split(',').map(Number);
    const screenX = x * golCellSize + golOffsetX + golCanvas.width / 2;
    const screenY = y * golCellSize + golOffsetY + golCanvas.height / 2;
    if (screenX > -golCellSize && screenX < golCanvas.width && screenY > -golCellSize && screenY < golCanvas.height) {
      golCtx.fillRect(screenX, screenY, golCellSize - 1, golCellSize - 1);
    }
    pop++;
  }

  const popEl = document.getElementById('gol-population');
  if (popEl) {
    popEl.textContent = pop;
    document.getElementById('gol-generation').textContent = golGeneration;
  }
}

function golStep() {
  if (golHistory.length === 0) golRecord(); // baseline (gen 0) for detection

  const newGrid = {};
  const neighborCounts = {};
  for (const key in golGrid) {
    const [x, y] = key.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nKey = `${x + dx},${y + dy}`;
        neighborCounts[nKey] = (neighborCounts[nKey] || 0) + 1;
      }
    }
  }
  for (const key in neighborCounts) {
    const count = neighborCounts[key];
    if (count === 3 || (count === 2 && golGrid[key])) newGrid[key] = true;
  }

  golGrid = newGrid;
  golGeneration++;
  golRecord();
  handleDetection();
  renderGOL();
}

// ---------- phenomenon detection ----------
function normalizeCells(cells) {
  if (cells.length === 0) return '';
  const xs = cells.map((c) => +c.split(',')[0]);
  const ys = cells.map((c) => +c.split(',')[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return cells
    .map((c) => {
      const [x, y] = c.split(',').map(Number);
      return `${x - minX},${y - minY}`;
    })
    .sort()
    .join(';');
}

function golRecord() {
  const cells = Object.keys(golGrid);
  golHistory.push({
    gen: golGeneration,
    key: [...cells].sort().join(';'),
    norm: normalizeCells(cells),
    pop: cells.length,
  });
  if (golHistory.length > 80) golHistory.shift();
}

function golDetect() {
  const last = golHistory[golHistory.length - 1];
  if (!last || last.pop === 0) return null;
  for (let i = golHistory.length - 2; i >= 0 && i >= golHistory.length - 40; i--) {
    const e = golHistory[i];
    const period = last.gen - e.gen;
    if (period < 1) continue;
    if (e.key === last.key) {
      return period === 1 ? { type: 'still' } : { type: 'oscillator', period };
    }
    if (e.norm === last.norm && e.key !== last.key && last.pop >= 3) {
      return { type: 'spaceship', period };
    }
  }
  return null;
}

function handleDetection() {
  const d = golDetect();
  const statusEl = document.getElementById('gol-goal-status');
  if (!d || !GOALS[d.type]) return;
  if (!golCompleted.has(d.type)) {
    golCompleted.add(d.type);
    markProgress('interpretation');
    updateGoalUI();
  }
  if (statusEl) {
    const extra = d.period ? ` (period ${d.period})` : '';
    statusEl.className = 'gol-goal-status done';
    statusEl.innerHTML = `<b>✓ ${GOALS[d.type].label}${extra} detected</b> — you built ${GOALS[d.type].done}.`;
  }
}

function updateGoalUI() {
  document.querySelectorAll('.gol-goal').forEach((btn) => {
    btn.classList.toggle('done', golCompleted.has(btn.dataset.goal));
  });
}

function setGoal(id) {
  activeGoal = id;
  document.querySelectorAll('.gol-goal').forEach((btn) => btn.classList.toggle('active', btn.dataset.goal === id));
  const statusEl = document.getElementById('gol-goal-status');
  if (statusEl) {
    statusEl.className = 'gol-goal-status';
    statusEl.innerHTML = golCompleted.has(id)
      ? `<b>✓ ${GOALS[id].label} already achieved.</b> ${GOALS[id].hint}`
      : GOALS[id].hint;
  }
}

function resetHistory() {
  golHistory = [];
}

// ---------- controls ----------
function golTogglePlay() { golPlayback.toggle(); }

function golClear() {
  golGrid = {};
  golGeneration = 0;
  if (golPlayback && golPlayback.playing) golPlayback.stop();
  resetHistory();
  renderGOL();
}

function golRandomize() {
  golClear();
  for (let i = 0; i < 400; i++) {
    const rx = Math.floor(Math.random() * 60) - 30;
    const ry = Math.floor(Math.random() * 30) - 15;
    golGrid[`${rx},${ry}`] = true;
  }
  renderGOL();
}

function spawnPattern(pattern) {
  golClear();
  for (const p of pattern) golGrid[`${p[0]},${p[1]}`] = true;
  golOffsetX = 0;
  golOffsetY = 0;
  golCellSize = 15;
  renderGOL();
}

function golSpawnGlider() { spawnPattern([[0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]]); }

function golSpawnGosper() {
  let pattern = [
    [1, 5], [1, 6], [2, 5], [2, 6], [11, 5], [11, 6], [11, 7], [12, 4], [12, 8], [13, 3], [14, 3],
    [13, 9], [14, 9], [15, 6], [16, 4], [16, 8], [17, 5], [17, 6], [17, 7], [18, 6], [21, 3], [21, 4],
    [21, 5], [22, 3], [22, 4], [22, 5], [23, 2], [23, 6], [25, 1], [25, 2], [25, 6], [25, 7], [35, 3],
    [35, 4], [36, 3], [36, 4],
  ];
  pattern = pattern.map((p) => [p[0] - 18, p[1] - 5]);
  spawnPattern(pattern);
}

export function init() {
  golCanvas = document.getElementById('gol-canvas');
  if (!golCanvas) return;
  golCtx = golCanvas.getContext('2d');

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0) {
        golCanvas.width = entry.contentRect.width;
        golCanvas.height = entry.contentRect.height;
        renderGOL();
      }
    }
  });
  resizeObserver.observe(golCanvas.parentElement);

  golCanvas.addEventListener('mousedown', golMouseDown);
  golCanvas.addEventListener('mousemove', golMouseMove);
  window.addEventListener('mouseup', golMouseUp);
  golCanvas.addEventListener('wheel', golWheel, { passive: false });
  golCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  golPlayback = createPlayback({
    button: document.getElementById('gol-play-btn'),
    onTick: golStep,
    interval: 100,
    playBg: 'var(--accent-purple)',
    playColor: '#fff',
    pauseBg: 'var(--soft-purple)',
    pauseColor: 'var(--accent-purple)',
  });

  document.querySelectorAll('.gol-goal').forEach((btn) => btn.addEventListener('click', () => setGoal(btn.dataset.goal)));
  setGoal('still');

  golSpawnGlider();
}

export function onShow() { renderGOL(); }

export const handlers = { golStep, golTogglePlay, golClear, golRandomize, golSpawnGlider, golSpawnGosper };
