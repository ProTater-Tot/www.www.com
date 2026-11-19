const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score-display");
const sizeDisplay = document.getElementById("size-display");
const timeDisplay = document.getElementById("time-display");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySubtitle = document.getElementById("overlay-subtitle");
const playBtn = document.getElementById("play-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const WORLD_SIZE = 2400;
let gameRunning = false, score = 0, timeLeft = 60, timerInterval;
const player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 28, speed: 5 };
let targetOffsetX = 0, targetOffsetY = 0;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  targetOffsetX = e.clientX - rect.left - canvas.width / 2;
  targetOffsetY = e.clientY - rect.top - canvas.height / 2;
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  targetOffsetX = e.touches[0].clientX - rect.left - canvas.width / 2;
  targetOffsetY = e.touches[0].clientY - rect.top - canvas.height / 2;
}, { passive: false });

let items = [], bots = [];
const ITEM_TYPES = [
  { radius: 8, points: 10, color: "#ff7b00", shape: "circle" },
  { radius: 10, points: 15, color: "#4cc9f0", shape: "circle" },
  { radius: 18, points: 30, color: "#2dc653", shape: "circle" },
  { radius: 24, points: 50, color: "#e63946", shape: "rect" },
  { radius: 42, points: 120, color: "#f4a261", shape: "rect" },
  { radius: 68, points: 250, color: "#8d99ae", shape: "rect" }
];

function spawnWorld() {
  items = [];
  bots = [];
  for (let i = 0; i < 260; i++) {
    const r = Math.random();
    const type = r < 0.35 ? ITEM_TYPES[0] : r < 0.6 ? ITEM_TYPES[1] : r < 0.78 ? ITEM_TYPES[2] : r < 0.9 ? ITEM_TYPES[3] : r < 0.97 ? ITEM_TYPES[4] : ITEM_TYPES[5];
    items.push({ x: Math.random() * (WORLD_SIZE - 100) + 50, y: Math.random() * (WORLD_SIZE - 100) + 50, ...type, falling: false, scale: 1 });
  }
  const botColors = ["#ff0055", "#9b5de5", "#00bbf9", "#00f5d4", "#fee440", "#f15bb5"];
  for (let i = 0; i < 6; i++) {
    bots.push({ x: Math.random() * (WORLD_SIZE - 200) + 100, y: Math.random() * (WORLD_SIZE - 200) + 100, radius: 26 + Math.random() * 14, color: botColors[i], angle: Math.random() * Math.PI * 2, speed: 3.2 });
  }
}

function startGame() {
  score = 0; timeLeft = 60;
  player.x = WORLD_SIZE / 2; player.y = WORLD_SIZE / 2; player.radius = 28;
  targetOffsetX = 0; targetOffsetY = 0;
  scoreDisplay.textContent = score;
  sizeDisplay.textContent = "1.0";
  timeDisplay.textContent = timeLeft;
  spawnWorld();
  overlay.classList.add("hidden");
  gameRunning = true;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) endGame("TIME'S UP!", `Final Score: ${score} | Final Size: ${(player.radius / 28).toFixed(1)}m`);
  }, 1000);
  requestAnimationFrame(gameLoop);
}

function endGame(title, subtitle) {
  gameRunning = false;
  clearInterval(timerInterval);
  overlayTitle.textContent = title;
  overlaySubtitle.textContent = subtitle;
  playBtn.textContent = "PLAY AGAIN";
  overlay.classList.remove("hidden");
}

playBtn.addEventListener("click", startGame);

function update() {
  const dist = Math.hypot(targetOffsetX, targetOffsetY);
  if (dist > 10) {
    const moveSpeed = Math.min(player.speed, dist * 0.05);
    player.x += (targetOffsetX / dist) * moveSpeed;
    player.y += (targetOffsetY / dist) * moveSpeed;
  }
  player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));

  for (let b = bots.length - 1; b >= 0; b--) {
    const bot = bots[b];
    if (Math.random() < 0.03) bot.angle += (Math.random() - 0.5) * 1.5;
    bot.x += Math.cos(bot.angle) * bot.speed;
    bot.y += Math.sin(bot.angle) * bot.speed;
    if (bot.x < bot.radius || bot.x > WORLD_SIZE - bot.radius) bot.angle = Math.PI - bot.angle;
    if (bot.y < bot.radius || bot.y > WORLD_SIZE - bot.radius) bot.angle = -bot.angle;

    items.forEach((item) => {
      if (!item.falling && bot.radius > item.radius * 1.15 && Math.hypot(bot.x - item.x, bot.y - item.y) < bot.radius - item.radius * 0.3) {
        item.falling = true;
        bot.radius += item.radius * 0.04;
      }
    });

    if (Math.hypot(player.x - bot.x, player.y - bot.y) < Math.max(player.radius, bot.radius) * 0.8) {
      if (player.radius > bot.radius * 1.15) {
        player.radius += bot.radius * 0.25;
        score += 300;
        scoreDisplay.textContent = score;
        sizeDisplay.textContent = (player.radius / 28).toFixed(1);
        bots.splice(b, 1);
      } else if (bot.radius > player.radius * 1.15) {
        endGame("SWALLOWED!", `A bigger hole ate you! Final Score: ${score}`);
      }
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!item.falling && player.radius > item.radius * 1.15 && Math.hypot(player.x - item.x, player.y - item.y) < player.radius - item.radius * 0.25) {
      item.falling = true;
      score += item.points;
      player.radius += item.radius * 0.055;
      scoreDisplay.textContent = score;
      sizeDisplay.textContent = (player.radius / 28).toFixed(1);
    }
    if (item.falling) {
      item.scale -= 0.15;
      if (item.scale <= 0) items.splice(i, 1);
    }
  }

  if (items.length < 180) {
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    items.push({ x: Math.random() * (WORLD_SIZE - 100) + 50, y: Math.random() * (WORLD_SIZE - 100) + 50, ...type, falling: false, scale: 1 });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const zoom = Math.max(0.45, 28 / Math.pow(player.radius, 0.85));
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-player.x, -player.y);

  ctx.fillStyle = "#343a40";
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
  ctx.strokeStyle = "#495057";
  ctx.lineWidth = 4;
  for (let x = 0; x <= WORLD_SIZE; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke(); }
  for (let y = 0; y <= WORLD_SIZE; y += 120) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke(); }

  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  bots.forEach((bot) => {
    ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = bot.color; ctx.stroke();
  });

  ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = "#ffd700"; ctx.stroke();

  items.forEach((item) => {
    ctx.save(); ctx.translate(item.x, item.y); ctx.scale(item.scale, item.scale);
    ctx.fillStyle = item.color; ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
    if (item.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, item.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else { ctx.fillRect(-item.radius, -item.radius, item.radius * 2, item.radius * 2); ctx.strokeRect(-item.radius, -item.radius, item.radius * 2, item.radius * 2); }
    ctx.restore();
  });
  ctx.restore();
}

function gameLoop() {
  if (!gameRunning) return;
  update(); draw();
  requestAnimationFrame(gameLoop);
}
