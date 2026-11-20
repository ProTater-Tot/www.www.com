const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let food = 20;
let foodRate = 4; // Food per second
let foodUpgradeCost = 30;
let gameOver = false;
let lastTime = 0;
let enemySpawnTimer = 0;

// Bases
const playerBase = { x: 40, y: 190, width: 60, height: 110, hp: 500, maxHp: 500, color: '#3b82f6' };
const enemyBase = { x: 700, y: 190, width: 60, height: 110, hp: 500, maxHp: 500, color: '#ef4444' };

// Unit Archetypes
const unitTypes = {
  basic:  { name: 'Clubman',    cost: 10, hp: 60,  dmg: 12, speed: 55, range: 25,  color: '#2563eb', size: 22 },
  ranged: { name: 'Slinger',    cost: 25, hp: 40,  dmg: 18, speed: 50, range: 130, color: '#06b6d4', size: 20 },
  tank:   { name: 'Dino Rider', cost: 50, hp: 180, dmg: 30, speed: 35, range: 30,  color: '#1d4ed8', size: 32 }
};

let playerUnits = [];
let enemyUnits = [];

function spawnUnit(type) {
  if (gameOver) return;
  const stats = unitTypes[type];
  if (food >= stats.cost) {
    food -= stats.cost;
    playerUnits.push({
      ...stats,
      x: playerBase.x + playerBase.width,
      y: 300 - stats.size,
      maxHp: stats.hp,
      attackCooldown: 0
    });
    updateUI();
  }
}

function spawnEnemy() {
  const types = ['basic', 'basic', 'ranged', 'tank'];
  const pick = types[Math.floor(Math.random() * types.length)];
  const stats = unitTypes[pick];
  
  enemyUnits.push({
    ...stats,
    x: enemyBase.x - stats.size,
    y: 300 - stats.size,
    maxHp: stats.hp,
    color: pick === 'tank' ? '#991b1b' : '#dc2626',
    attackCooldown: 0
  });
}

function upgradeFoodRate() {
  if (food >= foodUpgradeCost && !gameOver) {
    food -= foodUpgradeCost;
    foodRate += 2.5;
    foodUpgradeCost = Math.floor(foodUpgradeCost * 1.6);
    document.getElementById('upgradeFood').innerText = `Upgrade Food (${foodUpgradeCost} Food)`;
    updateUI();
  }
}

function updateUI() {
  document.getElementById('foodDisplay').innerText = Math.floor(food);
  document.getElementById('spawnBasic').disabled = food < unitTypes.basic.cost;
  document.getElementById('spawnRanged').disabled = food < unitTypes.ranged.cost;
  document.getElementById('spawnTank').disabled = food < unitTypes.tank.cost;
  document.getElementById('upgradeFood').disabled = food < foodUpgradeCost;
}

function update(dt) {
  if (gameOver) return;

  // Generate Food
  food += foodRate * dt;
  updateUI();

  // Enemy AI Spawner
  enemySpawnTimer += dt;
  if (enemySpawnTimer >= 3.2) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  // Update Player Units
  playerUnits.forEach(unit => {
    unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
    let target = enemyUnits.find(e => Math.abs((e.x) - (unit.x + unit.size)) <= unit.range);

    if (target) {
      if (unit.attackCooldown === 0) {
        target.hp -= unit.dmg;
        unit.attackCooldown = 1.0;
      }
    } else if (enemyBase.x - (unit.x + unit.size) <= unit.range) {
      if (unit.attackCooldown === 0) {
        enemyBase.hp -= unit.dmg;
        unit.attackCooldown = 1.0;
      }
    } else {
      unit.x += unit.speed * dt;
    }
  });

  // Update Enemy Units
  enemyUnits.forEach(unit => {
    unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
    let target = playerUnits.find(p => Math.abs((unit.x) - (p.x + p.size)) <= unit.range);

    if (target) {
      if (unit.attackCooldown === 0) {
        target.hp -= unit.dmg;
        unit.attackCooldown = 1.0;
      }
    } else if (unit.x - (playerBase.x + playerBase.width) <= unit.range) {
      if (unit.attackCooldown === 0) {
        playerBase.hp -= unit.dmg;
        unit.attackCooldown = 1.0;
      }
    } else {
      unit.x -= unit.speed * dt;
    }
  });

  // Remove Dead Units
  playerUnits = playerUnits.filter(u => u.hp > 0);
  enemyUnits = enemyUnits.filter(u => u.hp > 0);

  // Check Win/Loss
  if (enemyBase.hp <= 0) {
    enemyBase.hp = 0;
    gameOver = true;
    alert('Victory! You destroyed the enemy base!');
  } else if (playerBase.hp <= 0) {
    playerBase.hp = 0;
    gameOver = true;
    alert('Defeat! Your base was destroyed.');
  }
}

function drawHealthBar(x, y, width, hp, maxHp) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y - 10, width, 6);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x, y - 10, width * (hp / maxHp), 6);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, 300, canvas.width, 50);

  // Player Base
  ctx.fillStyle = playerBase.color;
  ctx.fillRect(playerBase.x, playerBase.y, playerBase.width, playerBase.height);
  drawHealthBar(playerBase.x, playerBase.y, playerBase.width, playerBase.hp, playerBase.maxHp);

  // Enemy Base
  ctx.fillStyle = enemyBase.color;
  ctx.fillRect(enemyBase.x, enemyBase.y, enemyBase.width, enemyBase.height);
  drawHealthBar(enemyBase.x, enemyBase.y, enemyBase.width, enemyBase.hp, enemyBase.maxHp);

  // Draw Units
  [...playerUnits, ...enemyUnits].forEach(u => {
    ctx.fillStyle = u.color;
    ctx.fillRect(u.x, u.y, u.size, u.size);
    drawHealthBar(u.x, u.y, u.size, u.hp, u.maxHp);
  });
}

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

requestAnimationFrame(gameLoop);
