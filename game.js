const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID = 20;
const COLS = canvas.width / GRID;
const ROWS = canvas.height / GRID;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const speedEl = document.getElementById('speed');
const finalScoreEl = document.getElementById('finalScore');
const startOverlay = document.getElementById('startOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');

const EAT_PALETTES = [
  [0, 240, 255],
  [255, 0, 170],
  [0, 255, 136],
  [123, 47, 255],
  [255, 200, 0],
];

let snake, direction, nextDirection, food, score, highScore, gameLoop, state;
let baseSpeed = 120;
let eatAnimEnd = 0;
let eatAnimStart = 0;
let eatPaletteIndex = 0;

highScore = parseInt(localStorage.getItem('cyberSnakeHigh') || '0', 10);
highScoreEl.textContent = String(highScore).padStart(4, '0');

function wrapCoord(value, max) {
  return ((value % max) + max) % max;
}

function init() {
  const mid = Math.floor(COLS / 2);
  snake = [
    { x: mid, y: Math.floor(ROWS / 2) },
    { x: mid - 1, y: Math.floor(ROWS / 2) },
    { x: mid - 2, y: Math.floor(ROWS / 2) },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  eatAnimEnd = 0;
  eatAnimStart = 0;
  scoreEl.textContent = '0000';
  speedEl.textContent = '1.0x';
  baseSpeed = 120;
  spawnFood();
}

function spawnFood() {
  const empty = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) {
    food = null;
    return;
  }
  food = empty[Math.floor(Math.random() * empty.length)];
}

function triggerEatAnimation() {
  eatPaletteIndex = (eatPaletteIndex + 1) % EAT_PALETTES.length;
  eatAnimStart = Date.now();
  eatAnimEnd = eatAnimStart + 600;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getEatAnimMix() {
  if (Date.now() >= eatAnimEnd) return 0;
  const elapsed = Date.now() - eatAnimStart;
  const t = elapsed / (eatAnimEnd - eatAnimStart);
  return Math.sin(t * Math.PI);
}

function getAnimatedColor(baseR, baseG, baseB, segIndex) {
  const mix = getEatAnimMix();
  if (mix <= 0) return { r: baseR, g: baseG, b: baseB };

  const elapsed = Date.now() - eatAnimStart;
  const cycle = (elapsed / 120 + segIndex * 0.15) % EAT_PALETTES.length;
  const idx = Math.floor(cycle);
  const next = (idx + 1) % EAT_PALETTES.length;
  const localT = cycle - idx;
  const [r1, g1, b1] = EAT_PALETTES[(idx + eatPaletteIndex) % EAT_PALETTES.length];
  const [r2, g2, b2] = EAT_PALETTES[(next + eatPaletteIndex) % EAT_PALETTES.length];
  const flashR = lerp(r1, r2, localT);
  const flashG = lerp(g1, g2, localT);
  const flashB = lerp(b1, b2, localT);

  const wave = mix * (0.7 + 0.3 * Math.sin(elapsed / 40 + segIndex * 0.5));
  return {
    r: Math.round(lerp(baseR, flashR, wave)),
    g: Math.round(lerp(baseG, flashG, wave)),
    b: Math.round(lerp(baseB, flashB, wave)),
  };
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * GRID, 0);
    ctx.lineTo(x * GRID, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * GRID);
    ctx.lineTo(canvas.width, y * GRID);
    ctx.stroke();
  }
}

function drawFood() {
  if (!food) return;

  const cx = food.x * GRID + GRID / 2;
  const cy = food.y * GRID + GRID / 2;
  const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;

  ctx.save();
  ctx.shadowColor = '#ff00aa';
  ctx.shadowBlur = 15;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, GRID * 0.45 * pulse);
  grad.addColorStop(0, '#ff00aa');
  grad.addColorStop(0.5, '#7b2fff');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, GRID * 0.45 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake() {
  snake.forEach((seg, i) => {
    const t = i / Math.max(snake.length - 1, 1);
    const baseR = i === 0 ? 0 : 0;
    const baseG = i === 0 ? 240 : Math.round(240 - t * 80);
    const baseB = i === 0 ? 255 : Math.round(255 - t * 167);
    const { r, g, b } = getAnimatedColor(baseR, baseG, baseB, i);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = i === 0 ? 12 + getEatAnimMix() * 8 : 6 + getEatAnimMix() * 4;

    const pad = i === 0 ? 1 : 2;
    const size = GRID - pad * 2;
    const x = seg.x * GRID + pad;
    const y = seg.y * GRID + pad;

    ctx.fillStyle = color;
    ctx.globalAlpha = i === 0 ? 1 : 1 - t * 0.4;
    ctx.fillRect(x, y, size, size);

    if (i === 0) {
      ctx.fillStyle = '#0a0a12';
      const eyeOffset = 5;
      if (direction.x === 1) {
        ctx.fillRect(x + size - eyeOffset, y + 4, 3, 3);
        ctx.fillRect(x + size - eyeOffset, y + size - 7, 3, 3);
      } else if (direction.x === -1) {
        ctx.fillRect(x + 2, y + 4, 3, 3);
        ctx.fillRect(x + 2, y + size - 7, 3, 3);
      } else if (direction.y === -1) {
        ctx.fillRect(x + 4, y + 2, 3, 3);
        ctx.fillRect(x + size - 7, y + 2, 3, 3);
      } else {
        ctx.fillRect(x + 4, y + size - eyeOffset, 3, 3);
        ctx.fillRect(x + size - 7, y + size - eyeOffset, 3, 3);
      }
    }
    ctx.restore();
  });
}

function draw() {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  if (snake) drawSnake();
}

function renderLoop() {
  draw();
  requestAnimationFrame(renderLoop);
}

function hitsSelf(head, willEat) {
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    if (seg.x !== head.x || seg.y !== head.y) continue;
    if (i === snake.length - 1 && !willEat) continue;
    return true;
  }
  return false;
}

function tick() {
  direction = nextDirection;

  const head = {
    x: wrapCoord(snake[0].x + direction.x, COLS),
    y: wrapCoord(snake[0].y + direction.y, ROWS),
  };

  const willEat = food && head.x === food.x && head.y === food.y;

  if (hitsSelf(head, willEat)) {
    return gameOver();
  }

  snake.unshift(head);

  if (willEat) {
    score += 10;
    scoreEl.textContent = String(score).padStart(4, '0');
    triggerEatAnimation();
    spawnFood();
    if (!food) return winGame();
    baseSpeed = Math.max(60, baseSpeed - 3);
    const mult = (120 / baseSpeed).toFixed(1);
    speedEl.textContent = `${mult}x`;
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, baseSpeed);
  } else {
    snake.pop();
  }
}

function winGame() {
  state = 'gameover';
  clearInterval(gameLoop);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('cyberSnakeHigh', String(highScore));
    highScoreEl.textContent = String(highScore).padStart(4, '0');
  }
  finalScoreEl.textContent = score;
  gameOverOverlay.querySelector('h2').textContent = 'SYSTEM COMPLETE';
  gameOverOverlay.classList.remove('hidden');
}

function startGame() {
  init();
  state = 'playing';
  gameOverOverlay.querySelector('h2').textContent = 'SYSTEM FAILURE';
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  clearInterval(gameLoop);
  gameLoop = setInterval(tick, baseSpeed);
}

function gameOver() {
  state = 'gameover';
  clearInterval(gameLoop);
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('cyberSnakeHigh', String(highScore));
    highScoreEl.textContent = String(highScore).padStart(4, '0');
  }
  finalScoreEl.textContent = score;
  gameOverOverlay.classList.remove('hidden');
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    clearInterval(gameLoop);
    pauseOverlay.classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'playing';
    pauseOverlay.classList.add('hidden');
    gameLoop = setInterval(tick, baseSpeed);
  }
}

document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();

  if (key === ' ' || key === 'enter') {
    e.preventDefault();
    if (state === 'idle' || state === 'gameover' || !state) startGame();
    return;
  }

  if (key === 'p') {
    if (state === 'playing' || state === 'paused') togglePause();
    return;
  }

  if (state !== 'playing') return;

  const turns = {
    arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
  };

  const turn = turns[key];
  if (!turn) return;
  if (turn.x === -direction.x && turn.y === -direction.y) return;
  nextDirection = turn;
});

canvas.addEventListener('click', () => {
  if (state === 'idle' || state === 'gameover' || !state) startGame();
});

startOverlay.addEventListener('click', e => {
  e.stopPropagation();
  if (state === 'idle' || !state) startGame();
});

state = 'idle';
requestAnimationFrame(renderLoop);
