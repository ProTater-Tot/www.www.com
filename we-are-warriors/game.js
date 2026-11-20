const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const meta = {
  coins: 0, foodLevel: 1, foodCost: 15,
  baseLevel: 1, baseCost: 15,
  unlockedSlinger: false, unlockedDino: false
};

let inBattle = false, food = 0, foodAcc = 0, lastTime = 0, waveTimer = 0, matchTime = 0;
let playerBase = { x: 45, y: 270, hp: 200, maxHp: 200 };
let enemyBase = { x: 735, y: 270, hp: 260, maxHp: 260 };
let playerUnits = [], enemyUnits = [], projectiles = [], floatTexts = [];

const UNITS = {
  clubman: { cost: 8,  hp: 55,  dmg: 12, speed: 52, range: 26,  reward: 4 },
  slinger: { cost: 18, hp: 38,  dmg: 15, speed: 46, range: 150, reward: 8 },
  dino:    { cost: 40, hp: 190, dmg: 32, speed: 36, range: 34,  reward: 18 }
};

const getFoodRate = () => +(1.2 + (meta.foodLevel - 1) * 0.45).toFixed(2);
const getBaseHp = () => 200 + (meta.baseLevel - 1) * 75;

function buyUpgrade(type) {
  if (type === 'food' && meta.coins >= meta.foodCost) {
    meta.coins -= meta.foodCost; meta.foodLevel++; meta.foodCost = Math.floor(meta.foodCost * 1.45);
  } else if (type === 'base' && meta.coins >= meta.baseCost) {
    meta.coins -= meta.baseCost; meta.baseLevel++; meta.baseCost = Math.floor(meta.baseCost * 1.45);
  } else if (type === 'slinger' && !meta.unlockedSlinger && meta.coins >= 30) {
    meta.coins -= 30; meta.unlockedSlinger = true;
  } else if (type === 'dino' && !meta.unlockedDino && meta.coins >= 75) {
    meta.coins -= 75; meta.unlockedDino = true;
  }
  updateMenuUI();
}

function updateMenuUI() {
  document.getElementById('coinDisplay').innerText = meta.coins;
  document.getElementById('foodLvlDisplay').innerText = meta.foodLevel;
  document.getElementById('foodRateDisplay').innerText = getFoodRate();
  const bFood = document.getElementById('btnUpgradeFood');
  bFood.innerText = `Upgrade (🪙 ${meta.foodCost})`; bFood.disabled = meta.coins < meta.foodCost;

  document.getElementById('baseLvlDisplay').innerText = meta.baseLevel;
  document.getElementById('baseHpDisplay').innerText = getBaseHp();
  const bBase = document.getElementById('btnUpgradeBase');
  bBase.innerText = `Upgrade (🪙 ${meta.baseCost})`; bBase.disabled = meta.coins < meta.baseCost;

  const bSling = document.getElementById('btnUnlockSlinger');
  if (meta.unlockedSlinger) { bSling.innerText = 'UNLOCKED ✓'; bSling.classList.add('unlocked'); bSling.disabled = true; }
  else bSling.disabled = meta.coins < 30;

  const bDino = document.getElementById('btnUnlockDino');
  if (meta.unlockedDino) { bDino.innerText = 'UNLOCKED ✓'; bDino.classList.add('unlocked'); bDino.disabled = true; }
  else bDino.disabled = meta.coins < 75;
}

function startBattle() {
  inBattle = true; food = 10; foodAcc = 0; matchTime = 0; waveTimer = 1.5;
  playerBase.hp = playerBase.maxHp = getBaseHp();
  enemyBase.hp = enemyBase.maxHp = 260;
  playerUnits = []; enemyUnits = []; projectiles = []; floatTexts = [];

  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('battleControls').classList.remove('hidden');
  document.getElementById('btnSpawnSlinger').classList.toggle('hidden', !meta.unlockedSlinger);
  document.getElementById('btnSpawnDino').classList.toggle('hidden', !meta.unlockedDino);
  updateBattleUI();
}

function endBattle(win) {
  inBattle = false;
  if (win) meta.coins += 25;
  document.getElementById('menuTitle').innerText = win ? '🏆 VICTORY!' : '💀 DEFEAT';
  document.getElementById('menuSubtitle').innerText = win ? 'Base destroyed! +25 Bonus Coins!' : 'Upgrade your tribe and try again!';
  document.getElementById('battleControls').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
  updateMenuUI();
}

function spawnUnit(type) {
  const d = UNITS[type];
  if (!inBattle || food < d.cost) return;
  food -= d.cost;
  playerUnits.push({ ...d, type, team: 'player', x: playerBase.x + 55, y: 262 + Math.random() * 76, maxHp: d.hp, cd: 0, phase: Math.random() * 6 });
  updateBattleUI();
}

function spawnEnemy(type) {
  const d = UNITS[type];
  enemyUnits.push({ ...d, type, team: 'enemy', x: enemyBase.x - 15, y: 262 + Math.random() * 76, maxHp: d.hp, cd: 0, phase: Math.random() * 6 });
}

function updateBattleUI() {
  document.getElementById('coinDisplay').innerText = meta.coins;
  document.getElementById('foodDisplay').innerText = Math.floor(food);
  document.getElementById('foodProgress').style.width = `${foodAcc * 100}%`;
  document.getElementById('btnSpawnClubman').disabled = food < UNITS.clubman.cost;
  document.getElementById('btnSpawnSlinger').disabled = food < UNITS.slinger.cost;
  document.getElementById('btnSpawnDino').disabled = food < UNITS.dino.cost;
}

function update(dt) {
  if (!inBattle) return;
  matchTime += dt;
  foodAcc += getFoodRate() * dt;
  if (foodAcc >= 1) { food += Math.floor(foodAcc); foodAcc %= 1; }
  updateBattleUI();

  waveTimer -= dt;
  if (waveTimer <= 0) {
    const r = Math.random();
    spawnEnemy(matchTime > 28 && r < 0.22 ? 'dino' : matchTime > 12 && r < 0.5 ? 'slinger' : 'clubman');
    waveTimer = Math.max(1.8, 3.6 - matchTime * 0.025);
  }

  playerUnits.forEach(u => stepUnit(u, enemyUnits, enemyBase, 1, dt));
  enemyUnits.forEach(u => stepUnit(u, playerUnits, playerBase, -1, dt));

  projectiles.forEach(p => {
    p.t += dt * 3.5;
    p.x = p.sx + (p.tx - p.sx) * p.t;
    p.y = p.sy + (p.ty - p.sy) * p.t - Math.sin(p.t * Math.PI) * 35;
  });
  projectiles = projectiles.filter(p => p.t < 1);

  enemyUnits = enemyUnits.filter(e => {
    if (e.hp <= 0) { meta.coins += e.reward; floatTexts.push({ x: e.x, y: e.y - 35, txt: `+${e.reward} 🪙`, life: 1 }); return false; }
    return true;
  });
  playerUnits = playerUnits.filter(p => p.hp > 0);
  floatTexts.forEach(f => { f.y -= 25 * dt; f.life -= dt; });
  floatTexts = floatTexts.filter(f => f.life > 0);

  if (enemyBase.hp <= 0) endBattle(true);
  else if (playerBase.hp <= 0) endBattle(false);
}

function stepUnit(u, foes, base, dir, dt) {
  u.cd = Math.max(0, u.cd - dt);
  const target = foes.find(f => (f.x - u.x) * dir > 0 && Math.abs(f.x - u.x) <= u.range);
  const baseDist = dir === 1 ? base.x - u.x : u.x - (base.x + 40);

  if (target || baseDist <= u.range) {
    if (u.cd === 0) {
      const hit = target || base;
      hit.hp -= u.dmg;
      u.cd = 1.05;
      if (u.type === 'slinger') projectiles.push({ sx: u.x, sy: u.y - 22, tx: hit.x + (target ? 0 : 20), ty: hit.y - 20, t: 0 });
    }
  } else {
    u.x += u.speed * dir * dt;
    u.phase += dt * 10;
  }
}
function drawBase(x, y, isPlayer, hp, maxHp) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(25, 35, 52, 16, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = isPlayer ? '#57534e' : '#7f1d1d';
  ctx.beginPath(); ctx.moveTo(-25, 35); ctx.quadraticCurveTo(-20, -65, 25, -65); ctx.quadraticCurveTo(70, -65, 75, 35); ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.arc(25, 35, 24, Math.PI, 0); ctx.fill();

  ctx.strokeStyle = '#451a03'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(25, -62); ctx.lineTo(25, -95); ctx.stroke();

  ctx.fillStyle = isPlayer ? '#3b82f6' : '#ef4444';
  ctx.beginPath(); ctx.moveTo(25, -95); ctx.lineTo(isPlayer ? 55 : -5, -85); ctx.lineTo(25, -75); ctx.fill();

  ctx.fillStyle = '#0f172a'; ctx.fillRect(-15, -112, 80, 10);
  ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444'; ctx.fillRect(-13, -110, 76 * Math.max(0, hp / maxHp), 6);
  ctx.restore();
}

function drawUnit(u) {
  const dir = u.team === 'player' ? 1 : -1;
  const scale = 0.88 + ((u.y - 255) / 90) * 0.25;
  const bob = Math.abs(Math.sin(u.phase)) * 3;
  const leg = Math.sin(u.phase) * 5;

  ctx.save(); ctx.translate(u.x, u.y); ctx.scale(dir * scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 0, u.type === 'dino' ? 22 : 12, 5, 0, 0, Math.PI * 2); ctx.fill();

  if (u.type === 'dino') {
    ctx.fillStyle = u.team === 'player' ? '#15803d' : '#991b1b';
    ctx.beginPath(); ctx.ellipse(0, -18 - bob, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16, -18 - bob); ctx.lineTo(-32, -24 - bob); ctx.lineTo(-16, -12 - bob); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, -28 - bob, 10, 7, 0.2, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = u.team === 'player' ? '#166534' : '#7f1d1d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-8 + leg, 0); ctx.moveTo(8, -10); ctx.lineTo(8 - leg, 0); ctx.stroke();

    ctx.fillStyle = '#fdba74'; ctx.beginPath(); ctx.arc(0, -38 - bob, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -32 - bob); ctx.lineTo(26, -36 - bob); ctx.stroke();
  } else {
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(-3 + leg, 0); ctx.moveTo(3, -10); ctx.lineTo(3 - leg, 0); ctx.stroke();

    ctx.fillStyle = u.team === 'player' ? '#2563eb' : '#dc2626';
    ctx.beginPath(); ctx.roundRect(-7, -24 - bob, 14, 15, 4); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.fillRect(-7, -13 - bob, 14, 3);

    ctx.fillStyle = '#fdba74'; ctx.beginPath(); ctx.arc(0, -30 - bob, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(-1, -32 - bob, 6.5, Math.PI * 0.8, Math.PI * 2.1); ctx.fill();

    ctx.save(); ctx.translate(5, -20 - bob);
    if (u.cd > 0.75) ctx.rotate(0.9);
    if (u.type === 'clubman') {
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -12); ctx.lineTo(18, -8); ctx.lineTo(2, 3); ctx.fill();
    } else {
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -10); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  if (u.hp < u.maxHp) {
    const by = u.type === 'dino' ? u.y - 52 : u.y - 44;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(u.x - 12, by, 24, 4);
    ctx.fillStyle = u.team === 'player' ? '#22c55e' : '#ef4444'; ctx.fillRect(u.x - 12, by, 24 * Math.max(0, u.hp / u.maxHp), 4);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, '#38bdf8'); sky.addColorStop(1, '#bae6fd');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, 250);

  ctx.fillStyle = '#64748b';
  ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(140, 130); ctx.lineTo(290, 250); ctx.lineTo(480, 110); ctx.lineTo(680, 250); ctx.lineTo(850, 160); ctx.lineTo(850, 250); ctx.fill();

  const ground = ctx.createLinearGradient(0, 245, 0, 380);
  ground.addColorStop(0, '#65a30d'); ground.addColorStop(1, '#3f6212');
  ctx.fillStyle = ground; ctx.fillRect(0, 245, canvas.width, 135);
  ctx.fillStyle = 'rgba(161, 98, 7, 0.35)'; ctx.fillRect(0, 265, canvas.width, 75);

  drawBase(playerBase.x, playerBase.y, true, playerBase.hp, playerBase.maxHp);
  drawBase(enemyBase.x, enemyBase.y, false, enemyBase.hp, enemyBase.maxHp);

  [...playerUnits, ...enemyUnits].sort((a, b) => a.y - b.y).forEach(drawUnit);

  ctx.fillStyle = '#334155';
  projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });

  ctx.font = 'bold 14px Segoe UI'; ctx.textAlign = 'center';
  floatTexts.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = '#ffd166';
    ctx.fillText(f.txt, f.x, f.y); ctx.globalAlpha = 1;
  });
}

function gameLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.1);
  lastTime = ts;
  update(dt); draw();
  requestAnimationFrame(gameLoop);
}

updateMenuUI();
draw();
requestAnimationFrame(gameLoop);
