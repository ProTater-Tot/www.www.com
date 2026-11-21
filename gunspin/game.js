const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GUNS = [
  { name: 'Rusty Revolver', color: '#94a3b8', accent: '#78350f', bonusTxt: 'Standard Starter Gun', bFirst: 0, bPower: 0, bAmmo: 0, bBoost: 0 },
  { name: 'Desert Eagle',   color: '#e2e8f0', accent: '#1e293b', bonusTxt: 'BONUS: +25% Power & +15% First Shot', bFirst: 0.15, bPower: 0.25, bAmmo: 0, bBoost: 0 },
  { name: 'Tactical SMG',     color: '#38bdf8', accent: '#0f172a', bonusTxt: 'BONUS: +3 Max Ammo & +20% Box Boost', bFirst: 0, bPower: 0.1, bAmmo: 3, bBoost: 0.2 },
  { name: 'Golden Cannon',    color: '#facc15', accent: '#b45309', bonusTxt: 'BONUS: +45% Power, +40% First Shot, +2 Ammo', bFirst: 0.4, bPower: 0.45, bAmmo: 2, bBoost: 0.25 }
];

const state = {
  coins: 0, stage: 1, unlockedIdx: 0, selectedIdx: 0,
  upg: {
    firstShot: { lvl: 1, cost: 15 },
    power:     { lvl: 1, cost: 15 },
    ammo:      { lvl: 1, cost: 20 },
    boost:     { lvl: 1, cost: 15 }
  }
};

let mode = 'menu'; // 'menu', 'ready', 'flying'
let lastTime = 0, shake = 0;
let gun = { x: 140, y: 310, vx: 0, vy: 0, angle: -0.4, spin: 0, ammo: 5, maxAmmo: 5, firstUsed: false };
let bullets = [], particles = [], ammoBoxes = [], floatTexts = [];
let nextBoxX = 500;

const getStageGoal = () => 2800 + (state.stage - 1) * 1400;

function getStats() {
  const g = GUNS[state.selectedIdx];
  return {
    firstMult: (1.35 + (state.upg.firstShot.lvl - 1) * 0.22) * (1 + g.bFirst),
    power:     (520 + (state.upg.power.lvl - 1) * 75) * (1 + g.bPower),
    maxAmmo:   4 + (state.upg.ammo.lvl - 1) + g.bAmmo,
    boxBoost:  (380 + (state.upg.boost.lvl - 1) * 75) * (1 + g.bBoost)
  };
}

function cycleGun(dir) {
  state.selectedIdx = (state.selectedIdx + dir + GUNS.length) % GUNS.length;
  updateMenuUI();
}

function buyUpgrade(key) {
  const u = state.upg[key];
  if (state.coins >= u.cost) {
    state.coins -= u.cost;
    u.lvl++;
    u.cost = Math.floor(u.cost * 1.48);
    updateMenuUI();
  }
}

function updateMenuUI() {
  document.getElementById('stageNum').innerText = state.stage;
  document.getElementById('coinText').innerText = Math.floor(state.coins);

  const g = GUNS[state.selectedIdx];
  const locked = state.selectedIdx > state.unlockedIdx;
  document.getElementById('gunName').innerText = g.name;
  document.getElementById('gunBonusText').innerText = g.bonusTxt;

  const tag = document.getElementById('gunTag');
  tag.innerText = locked ? `BEAT STAGE ${state.selectedIdx}` : 'EQUIPPED';
  tag.classList.toggle('locked', locked);

  const playBtn = document.querySelector('.play-btn');
  playBtn.disabled = locked;
  playBtn.innerText = locked ? '🔒 GUN LOCKED' : '🔥 TAP TO LAUNCH';

  document.getElementById('lvlFirst').innerText = `Lv. ${state.upg.firstShot.lvl}`;
  document.getElementById('btnFirst').innerText = `🪙 ${state.upg.firstShot.cost}`;
  document.getElementById('btnFirst').disabled = state.coins < state.upg.firstShot.cost;

  document.getElementById('lvlPower').innerText = `Lv. ${state.upg.power.lvl}`;
  document.getElementById('btnPower').innerText = `🪙 ${state.upg.power.cost}`;
  document.getElementById('btnPower').disabled = state.coins < state.upg.power.cost;

  document.getElementById('lvlAmmo').innerText = `Lv. ${state.upg.ammo.lvl}`;
  document.getElementById('btnAmmo').innerText = `🪙 ${state.upg.ammo.cost}`;
  document.getElementById('btnAmmo').disabled = state.coins < state.upg.ammo.cost;

  document.getElementById('lvlBoost').innerText = `Lv. ${state.upg.boost.lvl}`;
  document.getElementById('btnBoost').innerText = `🪙 ${state.upg.boost.cost}`;
  document.getElementById('btnBoost').disabled = state.coins < state.upg.boost.cost;
}

function startRun() {
  if (state.selectedIdx > state.unlockedIdx) return;
  const s = getStats();
  mode = 'ready';
  gun = { x: 140, y: 310, vx: 0, vy: 0, angle: -0.45, spin: 0, ammo: s.maxAmmo, maxAmmo: s.maxAmmo, firstUsed: false };
  bullets = []; particles = []; ammoBoxes = []; floatTexts = [];
  nextBoxX = 520;
  for (let i = 0; i < 6; i++) spawnAmmoBox();

  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('ammoHud').classList.remove('hidden');
  renderAmmoPips();
  fireGun(); // First launch shot immediately!
}

function spawnAmmoBox() {
  ammoBoxes.push({
    x: nextBoxX,
    y: 120 + Math.random() * 215,
    collected: false,
    bob: Math.random() * 6
  });
  nextBoxX += 340 + Math.random() * 220;
}

function renderAmmoPips() {
  const hud = document.getElementById('ammoHud');
  hud.innerHTML = '';
  for (let i = 0; i < gun.maxAmmo; i++) {
    const div = document.createElement('div');
    div.className = 'bullet-pip' + (i >= gun.ammo ? ' empty' : '');
    hud.appendChild(div);
  }
}

function fireGun() {
  if (mode === 'menu' || gun.ammo <= 0) return;
  mode = 'flying';
  const s = getStats();

  let force = s.power;
  if (!gun.firstUsed) {
    force *= s.firstMult;
    gun.firstUsed = true;
  }

  // Barrel points along gun.angle; recoil pushes opposite (-cos, -sin)
  const dirX = Math.cos(gun.angle);
  const dirY = Math.sin(gun.angle);

  gun.vx += -dirX * force;
  gun.vy = Math.min(gun.vy - dirY * force * 0.85, -dirY * force * 0.85 - 120);
  gun.vx = Math.max(gun.vx, -120); // Prevent flying endlessly backward
  gun.spin += (dirY >= 0 ? 11 : -11) + (Math.random() * 4 - 2);

  gun.ammo--;
  shake = 7;
  renderAmmoPips();

  // Muzzle Bullet & Sparks
  const tipX = gun.x + dirX * 28;
  const tipY = gun.y + dirY * 28;
  bullets.push({ x: tipX, y: tipY, vx: dirX * 950, vy: dirY * 950, life: 0.45 });
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: tipX, y: tipY,
      vx: dirX * (150 + Math.random() * 220) + (Math.random() * 140 - 70),
      vy: dirY * (150 + Math.random() * 220) + (Math.random() * 140 - 70),
      life: 0.35, color: i % 2 === 0 ? '#facc15' : '#f97316'
    });
  }
}
canvas.addEventListener('pointerdown', () => { if (mode === 'flying') fireGun(); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (mode === 'flying') fireGun();
  }
});

function update(dt) {
  shake = Math.max(0, shake - dt * 35);

  if (mode === 'flying') {
    const goal = getStageGoal();
    const s = getStats();

    // Gravity & Air Drag
    gun.vy += 880 * dt;
    gun.vx *= (1 - 0.18 * dt);
    gun.x += gun.vx * dt;
    gun.y += gun.vy * dt;
    gun.angle += gun.spin * dt;
    gun.spin *= (1 - 0.6 * dt);

    // Ceiling Bounce
    if (gun.y < 35) { gun.y = 35; gun.vy = Math.abs(gun.vy) * 0.5; }

    // Spawn ahead Ammo Boxes
    while (nextBoxX < gun.x + 1100) spawnAmmoBox();

    // Check Ammo Box Pickups
    ammoBoxes.forEach(b => {
      b.bob += dt * 4;
      if (!b.collected && Math.hypot(gun.x - b.x, gun.y - b.y) < 42) {
        b.collected = true;
        gun.ammo = Math.min(gun.maxAmmo, gun.ammo + 2);
        gun.vx = Math.max(gun.vx + s.boxBoost, s.boxBoost * 1.15);
        gun.vy = Math.min(gun.vy - 180, -240);
        renderAmmoPips();
        floatTexts.push({ x: b.x, y: b.y - 20, txt: '+2 AMMO & BOOST!', color: '#4ade80', life: 1.0 });
        for (let i = 0; i < 10; i++) {
          particles.push({ x: b.x, y: b.y, vx: Math.random() * 240 - 120, vy: Math.random() * 240 - 120, life: 0.45, color: '#4ade80' });
        }
      }
    });

    // Update Progress Bar
    const pct = Math.min(100, Math.floor(((gun.x - 140) / goal) * 100));
    document.getElementById('progressBar').style.width = `${Math.max(0, pct)}%`;
    document.getElementById('progressText').innerText = `${Math.max(0, pct)}%`;

    // Stage 100% Complete!
    if (pct >= 100) {
      finishRun(true, pct);
      return;
    }

    // Ground Slide & Stop
    if (gun.y >= 375) {
      gun.y = 375;
      gun.vy = -gun.vy * 0.35;
      gun.vx *= 0.82;
      gun.spin *= 0.75;
      if (Math.abs(gun.vx) < 25 && Math.abs(gun.vy) < 40 && gun.ammo === 0) {
        finishRun(false, pct);
      } else if (Math.abs(gun.vx) < 15 && gun.ammo > 0) {
        gun.vx = 0;
      }
    }
  }

  bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
  bullets = bullets.filter(b => b.life > 0);

  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);

  floatTexts.forEach(f => { f.y -= 35 * dt; f.life -= dt; });
  floatTexts = floatTexts.filter(f => f.life > 0);
}

function finishRun(cleared, pct) {
  mode = 'menu';
  const earned = Math.max(5, Math.floor((gun.x - 140) / 55) + (cleared ? 35 : 0));
  state.coins += earned;

  let sub = `Reached ${Math.max(0, pct)}% — Earned +${earned} 🪙`;
  if (cleared) {
    state.stage++;
    if (state.unlockedIdx < GUNS.length - 1) {
      state.unlockedIdx++;
      state.selectedIdx = state.unlockedIdx;
      sub = `STAGE CLEARED! Unlocked ${GUNS[state.unlockedIdx].name}! (+${earned} 🪙)`;
    } else {
      sub = `STAGE CLEARED! +${earned} 🪙 Bonus!`;
    }
  }

  document.getElementById('menuHeading').innerText = cleared ? '🏆 100% COMPLETE!' : 'OUT OF AMMO';
  document.getElementById('menuSub').innerText = sub;
  document.getElementById('ammoHud').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
  updateMenuUI();
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate(Math.random() * shake - shake / 2, Math.random() * shake - shake / 2);

  const camX = Math.max(0, gun.x - 220);

  // Sky Backdrop
  const sky = ctx.createLinearGradient(0, 0, 0, 390);
  sky.addColorStop(0, '#0f172a');
  sky.addColorStop(1, '#1e293b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Parallax City/Mountain Silhouettes
  ctx.fillStyle = '#172033';
  for (let i = -1; i < 6; i++) {
    const bx = i * 240 - ((camX * 0.25) % 240);
    ctx.fillRect(bx, 180, 110, 210);
    ctx.fillRect(bx + 125, 220, 90, 170);
  }

  ctx.save();
  ctx.translate(-camX, 0);

  // Ground & Distance Markers
  ctx.fillStyle = '#334155';
  ctx.fillRect(camX, 390, canvas.width, 50);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(camX, 390, canvas.width, 5);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px Segoe UI';
  const startMark = Math.floor(camX / 250) * 250;
  for (let mx = startMark; mx < camX + 950; mx += 250) {
    if (mx >= 140) {
      ctx.fillRect(mx, 395, 3, 12);
      ctx.fillText(`${Math.floor((mx - 140) / 10)}m`, mx - 12, 424);
    }
  }

  // 100% Finish Line Gate
  const goalX = 140 + getStageGoal();
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(goalX, 90, 8, 300);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(goalX - 30, 65, 68, 28);
  ctx.fillStyle = '#000';
  ctx.fillText('100%', goalX - 16, 84);

  // Floating Ammo Crates
  ammoBoxes.forEach(b => {
    if (b.collected) return;
    const by = b.y + Math.sin(b.bob) * 6;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(b.x - 16, by - 16, 32, 32);
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(b.x - 16, by - 16, 32, 32);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px Segoe UI';
    ctx.fillText('⚡', b.x - 8, by + 6);
  });

  // Bullets & Particles
  ctx.fillStyle = '#fef08a';
  bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    ctx.globalAlpha = 1;
  });

  // Draw Spinning Gun Sprite
  const gStyle = GUNS[state.selectedIdx];
  ctx.save();
  ctx.translate(gun.x, gun.y);
  ctx.rotate(gun.angle);

  // Grip
  ctx.fillStyle = gStyle.accent;
  ctx.fillRect(-14, 2, 11, 18);
  // Barrel & Slide
  ctx.fillStyle = gStyle.color;
  ctx.fillRect(-16, -8, 42, 12);
  // Sight
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(20, -11, 4, 3);
  ctx.restore();

  // Floating Text
  ctx.font = 'bold 15px Segoe UI';
  floatTexts.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x - 50, f.y);
    ctx.globalAlpha = 1;
  });

  ctx.restore();
  ctx.restore();
}

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

updateMenuUI();
requestAnimationFrame(loop);
