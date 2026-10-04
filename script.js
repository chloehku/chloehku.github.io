/* ==========================================================================
   Tetris — game logic
   ========================================================================== */
'use strict';

const COLS = 10;
const ROWS = 20;

// Speed: 1 = Easy (slower), 2 = Normal, 3 = Hard (faster)
let speedLevel = 2;
function speedMultiplier() {
  return [0.55, 1.0, 1.9][speedLevel - 1];
}
function recomputeDropInterval() {
  const base = Math.max(80, 1000 - (level - 1) * 80);
  dropInterval = Math.max(60, Math.round(base / speedMultiplier()));
}

// Each piece: 4 rotation states, each state = list of [row, col] offsets.
// Offsets are within a 4x4 bounding box.
const PIECES = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,1],[1,1],[2,1],[3,1]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,2],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
};

const PIECE_TYPES = Object.keys(PIECES);

// ---- State ----
let board = [];
let cellEls = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let started = false;
let dropInterval = 1000;
let lastDropTime = 0;
let rafId = null;

// ---- DOM ----
const boardEl       = document.getElementById('board');
const pieceLayerEl  = document.getElementById('pieceLayer');
const ghostLayerEl  = document.getElementById('ghostLayer');
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const linesEl       = document.getElementById('lines');
const nextEl        = document.getElementById('next');
const overlayEl     = document.getElementById('overlay');
const overlayTitle  = document.getElementById('overlayTitle');
const overlayMsg    = document.getElementById('overlayMessage');
const startBtn      = document.getElementById('startBtn');

// Touch buttons
const tLeft   = document.getElementById('tLeft');
const tRight  = document.getElementById('tRight');
const tRotate = document.getElementById('tRotate');
const tSoft   = document.getElementById('tSoft');
const tDrop   = document.getElementById('tDrop');

// ==========================================================================
// Build the static grids
// ==========================================================================
function buildBoard() {
  boardEl.innerHTML = '';
  cellEls = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      boardEl.appendChild(cell);
      row.push(cell);
    }
    cellEls.push(row);
  }
}

function buildNext() {
  nextEl.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell next-cell';
    nextEl.appendChild(cell);
  }
}

// ==========================================================================
// Init / state reset
// ==========================================================================
function init() {
  buildBoard();
  buildNext();
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  paused = false;
  recomputeDropInterval();
  updateStats();
  showOverlay('Tetris', 'Press <kbd>Space</kbd> or Start to play');
  renderBoard();
  pieceLayerEl.innerHTML = '';
  ghostLayerEl.innerHTML = '';
}

function updateStats() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

function showOverlay(title, messageHtml) {
  overlayTitle.textContent = title;
  overlayMsg.innerHTML = messageHtml;
  overlayEl.classList.add('visible');
  startBtn.textContent = (title === 'Game Over') ? 'Restart' : 'Start';
}
function hideOverlay() { overlayEl.classList.remove('visible'); }

// ==========================================================================
// Pieces
// ==========================================================================
function randomPiece() {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  return { type, rotation: 0, row: 0, col: 3 };
}

function spawnPiece() {
  currentPiece = nextPiece || randomPiece();
  currentPiece.row = -1;
  currentPiece.col = 3;
  // If spawning above the visible area still collides, lock it in by lifting
  while (collidesAt(currentPiece, 0, 0)) currentPiece.row--;
  nextPiece = randomPiece();
  renderNext();
  renderPiece();
}

// ==========================================================================
// Movement / collision
// ==========================================================================
function collidesAt(piece, rowOffset, colOffset, rotation) {
  const rot = rotation !== undefined ? rotation : piece.rotation;
  const cells = PIECES[piece.type][rot];
  for (const [r, c] of cells) {
    const newRow = piece.row + r + rowOffset;
    const newCol = piece.col + c + colOffset;
    if (newCol < 0 || newCol >= COLS) return true;
    if (newRow >= ROWS) return true;
    if (newRow >= 0 && board[newRow][newCol]) return true;
  }
  return false;
}

function movePiece(dr, dc) {
  if (collidesAt(currentPiece, dr, dc)) return false;
  currentPiece.row += dr;
  currentPiece.col += dc;
  renderPiece();
  return true;
}

function rotatePiece(dir = 1) {
  const newRot = (currentPiece.rotation + dir + 4) % 4;
  // Simple wall kicks: try offsets
  const kicks = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2]];
  for (const [dr, dc] of kicks) {
    if (!collidesAt(currentPiece, dr, dc, newRot)) {
      currentPiece.row += dr;
      currentPiece.col += dc;
      currentPiece.rotation = newRot;
      renderPiece();
      return;
    }
  }
}

function softDrop() {
  if (movePiece(1, 0)) {
    score += 1;
    updateStats();
  }
}

function hardDrop() {
  let drop = 0;
  while (!collidesAt(currentPiece, drop + 1, 0)) drop++;
  if (drop > 0) {
    currentPiece.row += drop;
    score += drop * 2;
    updateStats();
  }
  lockPiece();
}

// ==========================================================================
// Lock + line clear
// ==========================================================================
function lockPiece() {
  const cells = PIECES[currentPiece.type][currentPiece.rotation];
  for (const [r, c] of cells) {
    const row = currentPiece.row + r;
    const col = currentPiece.col + c;
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      board[row][col] = currentPiece.type;
    }
  }

  // Detect full lines
  const fullRows = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell !== null)) fullRows.push(r);
  }

  if (fullRows.length > 0) {
    animateClear(fullRows, () => {
      for (const r of fullRows.sort((a, b) => b - a)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
      }
      const points = [0, 100, 300, 500, 800][fullRows.length] || 0;
      score += points * level;
      lines += fullRows.length;
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        recomputeDropInterval();
      }
      updateStats();
      renderBoard();
      afterLock();
    });
  } else {
    renderBoard();
    afterLock();
  }
}

function afterLock() {
  spawnPiece();
  if (collidesAt(currentPiece, 0, 0)) {
    endGame();
  }
}

function animateClear(rows, done) {
  // Tag cells in full rows with .clearing
  const cellsToAnimate = [];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) cellsToAnimate.push(cellEls[r][c]);
  }
  for (const cell of cellsToAnimate) cell.classList.add('clearing');
  pieceLayerEl.innerHTML = '';
  ghostLayerEl.innerHTML = '';
  setTimeout(done, 280);
}

// ==========================================================================
// Rendering
// ==========================================================================
function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellEls[r][c];
      const type = board[r][c];
      cell.className = 'cell';
      if (type) cell.classList.add('filled', type);
    }
  }
}

function renderPiece() {
  if (!currentPiece) return;
  pieceLayerEl.innerHTML = '';
  ghostLayerEl.innerHTML = '';

  const cells = PIECES[currentPiece.type][currentPiece.rotation];

  // Compute ghost drop
  let ghostDrop = 0;
  while (!collidesAt(currentPiece, ghostDrop + 1, 0)) ghostDrop++;

  // Ghost piece
  const ghostGrid = document.createElement('div');
  ghostGrid.className = 'piece-grid';
  for (let i = 0; i < 16; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    ghostGrid.appendChild(c);
  }
  for (const [r, c] of cells) {
    ghostGrid.children[r * 4 + c].classList.add('filled', currentPiece.type, 'ghost');
  }
  ghostGrid.style.left = ((currentPiece.col * 100) / COLS) + '%';
  ghostGrid.style.top  = (((currentPiece.row + ghostDrop) * 100) / ROWS) + '%';
  ghostLayerEl.appendChild(ghostGrid);

  // Active piece
  const pieceGrid = document.createElement('div');
  pieceGrid.className = 'piece-grid';
  for (let i = 0; i < 16; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    pieceGrid.appendChild(c);
  }
  for (const [r, c] of cells) {
    pieceGrid.children[r * 4 + c].classList.add('filled', currentPiece.type);
  }
  pieceGrid.style.left = ((currentPiece.col * 100) / COLS) + '%';
  pieceGrid.style.top  = ((currentPiece.row * 100) / ROWS) + '%';
  pieceLayerEl.appendChild(pieceGrid);
}

function renderNext() {
  const cells = nextEl.children;
  for (let i = 0; i < cells.length; i++) {
    cells[i].className = 'cell next-cell';
  }
  // Show shape centered (assume top-left of piece 4x4)
  const shape = PIECES[nextPiece.type][0];
  for (const [r, c] of shape) {
    const idx = r * 4 + c;
    if (cells[idx]) cells[idx].classList.add('filled', nextPiece.type);
  }
}

// ==========================================================================
// Game lifecycle
// ==========================================================================
function startGame() {
  init();
  nextPiece = randomPiece();
  spawnPiece();
  started = true;
  gameOver = false;
  paused = false;
  hideOverlay();
  lastDropTime = performance.now();
  if (!rafId) rafId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameOver = true;
  started = false;
  showOverlay('Game Over', `Final score: <strong>${score}</strong> &middot; ${lines} lines`);
}

function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  if (paused) {
    showOverlay('Paused', 'Press <kbd>P</kbd> to resume');
  } else {
    hideOverlay();
    lastDropTime = performance.now();
  }
}

function gameLoop(now) {
  rafId = requestAnimationFrame(gameLoop);
  if (!started || gameOver || paused) return;
  if (now - lastDropTime >= dropInterval) {
    if (!movePiece(1, 0)) lockPiece();
    lastDropTime = now;
  }
}

// ==========================================================================
// Input
// ==========================================================================
document.addEventListener('keydown', (e) => {
  // Start from any state on Space/Enter if not actively playing
  if (!started || gameOver) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (paused) return;

  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      movePiece(0, -1);
      break;
    case 'ArrowRight':
      e.preventDefault();
      movePiece(0, 1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      e.preventDefault();
      rotatePiece(1);
      break;
    case 'KeyZ':
      e.preventDefault();
      rotatePiece(-1);
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
});

startBtn.addEventListener('click', () => startGame());

// Touch button bindings
function bindTouch(el, fn) {
  if (!el) return;
  let pressed = false;
  const fire = (e) => { e.preventDefault(); fn(); };
  el.addEventListener('click', fire);
  el.addEventListener('touchstart', fire, { passive: false });
}
bindTouch(tLeft,   () => movePiece(0, -1));
bindTouch(tRight,  () => movePiece(0, 1));
bindTouch(tRotate, () => rotatePiece(1));
bindTouch(tSoft,   () => softDrop());
bindTouch(tDrop,   () => hardDrop());

// Speed selector
function setSpeed(level) {
  speedLevel = level;
  recomputeDropInterval();
  document.querySelectorAll('.speed-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.speed, 10) === level);
  });
}
document.querySelectorAll('.speed-btn').forEach((btn) => {
  btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed, 10)));
});

// Init on load
init();
