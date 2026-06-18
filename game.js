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

let snake, direction, nextDirection, food, score, highScore, gameLoop, state;
let baseSpeed = 120;
let particles = [];

highScore = parseInt(localStorage.getItem('cyberSnakeHigh') || '0', 10);
highScoreEl.textContent = String(highScore).padStart(4, '0');

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
  particles = [];
  scoreEl.textContent = '0000';
  speedEl.textContent = '1.0x';
  baseSpeed = 120;
  spawnFood();
}

function spawnFood() {
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

function spawnParticles(x, y) {
  const colors = ['#00f0ff', '#ff00aa', '#7b2fff', '#00ff88'];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    particles.push({
      x: x * GRID + GRID / 2,
      y: y * GRID + GRID / 2,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    return p.life > 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
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
    const r = Math.round(0 + t * 0);
    const g = Math.round(240 - t * 80);
    const b = Math.round(255 - t * 167);
    const color = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = i === 0 ? 12 : 6;

    const pad = i === 0 ? 1 : 2;
    const size = GRID - pad * 2;
    const x = seg.x * GRID + pad;
    const y = seg.y * GRID + pad;

    if (i === 0) {
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(x, y, size, size);
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
    } else {
      ctx.fillStyle = color;
      ctx.globalAlpha = 1 - t * 0.4;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  });
}

function draw() {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();
  updateParticles();
  drawParticles();
}

function tick() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = String(score).padStart(4, '0');
    spawnParticles(food.x, food.y);
    spawnFood();
    baseSpeed = Math.max(60, baseSpeed - 3);
    const mult = (120 / baseSpeed).toFixed(1);
    speedEl.textContent = `${mult}x`;
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, baseSpeed);
  } else {
    snake.pop();
  }

  draw();
}

function startGame() {
  init();
  state = 'playing';
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  draw();
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
draw();
