const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GUNS = [
  { id: 'revolver', name: 'Rusty Revolver', color: '#94a3b8', accent: '#78350f', bonusTxt: 'Standard Starter Gun', bFirst: 0, bPower: 0, bAmmo: 0, bBoost: 0 },
  { id: 'deagle',   name: 'Desert Eagle',   color: '#e2e8f0', accent: '#1e293b', bonusTxt: 'BONUS: +25% Power & +15% First Shot', bFirst: 0.15, bPower: 0.25, bAmmo: 0, bBoost: 0 },
  { id: 'smg',      name: 'Tactical SMG',     color: '#38bdf8', accent: '#0f172a', bonusTxt: 'BONUS: +3 Max Ammo & +20% Box Boost', bFirst: 0, bPower: 0.1, bAmmo: 3, bBoost: 0.2 },
  { id: 'cannon',   name: 'Golden Cannon',    color: '#facc15', accent: '#b45309', bonusTxt: 'BONUS: +45% Power, +40% First Shot, +2 Ammo', bFirst: 0.4, bPower: 0.45, bAmmo: 2, bBoost: 0.25 }
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

let mode = 'menu'; // 'menu', 'aiming', 'flying'
let lastTime = 0, shake = 0, aimTimer = 0;
let gun = { x: 180, y: 230, vx: 0, vy: 0, angle: 2.35, spin: 0, ammo: 5, maxAmmo: 5, firstUsed: false };
let bullets = [], particles = [], ammoBoxes = [], floatTexts = [], stars = [];
let nextBoxX = 520;

for (let i = 0; i < 45; i++) {
  stars.push({ x: Math.random() * 850, y: Math.random() * 220, r: 0.8 + Math.random() * 1.5, a: 0.3 + Math.random() * 0.7 });
}

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

  ['firstShot', 'power', 'ammo', 'boost'].forEach((k, idx) => {
    const ids = ['First', 'Power', 'Ammo', 'Boost'];
    document.getElementById('lvl' + ids[idx]).innerText = `Lv. ${state.upg[k].lvl}`;
    document.getElementById('btn' + ids[idx]).innerText = `🪙 ${state.upg[k].cost}`;
    document.getElementById('btn' + ids[idx]).disabled = state.coins < state.upg[k].cost;
  });
}

function startRun() {
  if (state.selectedIdx > state.unlockedIdx) return;
  const s = getStats();
  mode = 'aiming'; // Hover & rotate mid-air for the first shot!
  aimTimer = 0;
  gun = { x: 180, y: 225, vx: 0, vy: 0, angle: 2.35, spin: 0, ammo: s.maxAmmo, maxAmmo: s.maxAmmo, firstUsed: false };
  bullets = []; particles = []; ammoBoxes = []; floatTexts = [];
  nextBoxX = 520;
  for (let i = 0; i < 6; i++) spawnAmmoBox();

  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('ammoHud').classList.remove('hidden');
  renderAmmoPips();
}

function spawnAmmoBox() {
  ammoBoxes.push({ x: nextBoxX, y: 115 + Math.random() * 215, collected: false, bob: Math.random() * 6 });
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

  const dirX = Math.cos(gun.angle);
  const dirY = Math.sin(gun.angle);

  gun.vx += -dirX * force;
  gun.vy = Math.min(gun.vy - dirY * force * 0.85, -dirY * force * 0.85 - 120);
  gun.vx = Math.max(gun.vx, -120);
  gun.spin += (dirY >= 0 ? 10.5 : -10.5) + (Math.random() * 3 - 1.5);

  gun.ammo--;
  shake = 8;
  renderAmmoPips();

  const tipX = gun.x + dirX * 34;
  const tipY = gun.y + dirY * 34;
  bullets.push({ x: tipX, y: tipY, vx: dirX * 1050, vy: dirY * 1050, life: 0.45 });
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: tipX, y: tipY,
      vx: dirX * (160 + Math.random() * 240) + (Math.random() * 140 - 70),
      vy: dirY * (160 + Math.random() * 240) + (Math.random() * 140 - 70),
      life: 0.35, color: i % 2 === 0 ? '#facc15' : '#fb7185'
    });
  }
}
canvas.addEventListener('pointerdown', () => { if (mode === 'aiming' || mode === 'flying') fireGun(); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (mode === 'aiming' || mode === 'flying') fireGun();
  }
});

function update(dt) {
  shake = Math.max(0, shake - dt * 35);

  if (mode === 'aiming') {
    aimTimer += dt;
    gun.y = 225 + Math.sin(aimTimer * 3.5) * 8; // Gentle mid-air hover
    gun.angle += 2.6 * dt; // Steady rotation so player can line up the dotted shot line
  } else if (mode === 'flying') {
    const goal = getStageGoal();
    const s = getStats();

    gun.vy += 880 * dt;
    gun.vx *= (1 - 0.18 * dt);
    gun.x += gun.vx * dt;
    gun.y += gun.vy * dt;
    gun.angle += gun.spin * dt;
    gun.spin *= (1 - 0.6 * dt);

    if (gun.y < 35) { gun.y = 35; gun.vy = Math.abs(gun.vy) * 0.5; }
    while (nextBoxX < gun.x + 1100) spawnAmmoBox();

    ammoBoxes.forEach(b => {
      b.bob += dt * 4;
      if (!b.collected && Math.hypot(gun.x - b.x, gun.y - b.y) < 44) {
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

    const pct = Math.min(100, Math.floor(((gun.x - 180) / goal) * 100));
    document.getElementById('progressBar').style.width = `${Math.max(0, pct)}%`;
    document.getElementById('progressText').innerText = `${Math.max(0, pct)}%`;

    if (pct >= 100) { finishRun(true, pct); return; }

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
  const earned = Math.max(5, Math.floor((gun.x - 180) / 55) + (cleared ? 35 : 0));
  state.coins += earned;

  let sub = `Reached ${Math.max(0, pct)}% — Earned +${earned} 🪙`;
  if (cleared) {
    state.stage++;
    if (state.unlockedIdx < GUNS.length - 1) {
      state.unlockedIdx++;
      state.selectedIdx = state.unlockedIdx;
      sub = `STAGE CLEARED! Unlocked ${GUNS[state.unlockedIdx].name}! (+${earned} 🪙)`;
    } else sub = `STAGE CLEARED! +${earned} 🪙 Bonus!`;
  }

  document.getElementById('menuHeading').innerText = cleared ? '🏆 100% COMPLETE!' : 'OUT OF AMMO';
  document.getElementById('menuSub').innerText = sub;
  document.getElementById('ammoHud').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
  updateMenuUI();
}

function drawGunSprite(g) {
  ctx.save();
  ctx.translate(gun.x, gun.y);
  ctx.rotate(gun.angle);

  // Dotted Laser Aim Line extending from barrel
  if (gun.ammo > 0) {
    ctx.save();
    ctx.strokeStyle = mode === 'aiming' ? 'rgba(250, 204, 21, 0.85)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = mode === 'aiming' ? 2.5 : 1.5;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(32, -3);
    ctx.lineTo(mode === 'aiming' ? 190 : 115, -3);
    ctx.stroke();
    ctx.restore();
  }

  // Trigger Guard
  ctx.strokeStyle = g.accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-2, 4, 5, 0, Math.PI);
  ctx.stroke();

  if (g.id === 'revolver') {
    ctx.fillStyle = g.accent; ctx.beginPath(); ctx.roundRect(-16, 1, 10, 17, 3); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.fillRect(-10, -8, 13, 11); // Cylinder
    ctx.fillStyle = g.color;  ctx.fillRect(3, -8, 25, 7);   // Barrel
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(24, -11, 3, 3); // Front sight
  } else if (g.id === 'deagle') {
    ctx.fillStyle = g.accent; ctx.fillRect(-15, 2, 11, 18);
    ctx.fillStyle = g.color;  ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(29, -9); ctx.lineTo(32, -2); ctx.lineTo(28, 3); ctx.lineTo(-16, 3); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(-4, -9, 10, 4); // Ejection port
    ctx.fillStyle = '#ef4444'; ctx.fillRect(25, -12, 4, 3); // Red dot sight
  } else if (g.id === 'smg') {
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-26, -6, 12, 6); // Folding stock
    ctx.fillStyle = g.accent;  ctx.fillRect(-13, 2, 9, 15);  // Grip
    ctx.fillStyle = '#0284c7'; ctx.fillRect(2, 2, 8, 22);    // Extended clip
    ctx.fillStyle = g.color;   ctx.fillRect(-15, -9, 36, 11);// Receiver
    ctx.fillStyle = '#0f172a'; ctx.fillRect(21, -6, 12, 5);  // Suppressor
  } else {
    // Golden Cannon
    ctx.fillStyle = g.accent;  ctx.fillRect(-16, 2, 12, 18);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(-18, -11, 46, 8); // Top gold barrel
    ctx.fillStyle = '#fde047'; ctx.fillRect(-14, -2, 40, 6);  // Under barrel
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-6, -14, 14, 3);  // Scope
  }
  ctx.restore();
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate(Math.random() * shake - shake / 2, Math.random() * shake - shake / 2);
  const camX = Math.max(0, gun.x - 220);

  // Rich Twilight Sky Gradient
  const sky = ctx.createLinearGradient(0, 0, 0, 390);
  sky.addColorStop(0, '#090d16');
  sky.addColorStop(0.55, '#1e1b4b');
  sky.addColorStop(1, '#7c2d12');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Twinkling Stars
  ctx.fillStyle = '#fff';
  stars.forEach(s => {
    ctx.globalAlpha = s.a;
    ctx.beginPath(); ctx.arc((s.x - camX * 0.05 + 850) % 850, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Glowing Setting Sun
  const sunGrad = ctx.createRadialGradient(640, 250, 10, 640, 250, 95);
  sunGrad.addColorStop(0, '#fef08a');
  sunGrad.addColorStop(0.4, '#f97316');
  sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath(); ctx.arc(640, 250, 95, 0, Math.PI * 2); ctx.fill();

  // Far Parallax Mountain Range
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath(); ctx.moveTo(0, 390);
  for (let i = -1; i < 6; i++) {
    const mx = i * 260 - ((camX * 0.15) % 260);
    ctx.lineTo(mx + 130, 185); ctx.lineTo(mx + 260, 390);
  }
  ctx.fill();

  // Near Parallax Cyber-Canyon Towers
  ctx.fillStyle = '#0f172a';
  for (let i = -1; i < 6; i++) {
    const bx = i * 240 - ((camX * 0.35) % 240);
    ctx.fillRect(bx, 225, 95, 165);
    ctx.fillRect(bx + 115, 255, 80, 135);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(bx + 15, 240, 6, 40);
    ctx.fillStyle = '#0f172a';
  }

  ctx.save();
  ctx.translate(-camX, 0);

  // Neon-Trimmed Highway Ground
  ctx.fillStyle = '#090d16';
  ctx.fillRect(camX, 390, canvas.width, 50);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(camX, 390, canvas.width, 4);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px Segoe UI';
  const startMark = Math.floor(camX / 250) * 250;
  for (let mx = startMark; mx < camX + 950; mx += 250) {
    if (mx >= 180) {
      ctx.fillRect(mx, 394, 3, 12);
      ctx.fillText(`${Math.floor((mx - 180) / 10)}m`, mx - 12, 424);
    }
  }

  // 100% Finish Gate
  const goalX = 180 + getStageGoal();
  ctx.fillStyle = '#ef4444'; ctx.fillRect(goalX, 85, 8, 305);
  ctx.fillStyle = '#facc15'; ctx.fillRect(goalX - 30, 60, 68, 28);
  ctx.fillStyle = '#000'; ctx.fillText('100%', goalX - 16, 79);

  // Floating Ammo Crates
  ammoBoxes.forEach(b => {
    if (b.collected) return;
    const by = b.y + Math.sin(b.bob) * 6;
    ctx.fillStyle = '#15803d'; ctx.fillRect(b.x - 16, by - 16, 32, 32);
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2.5; ctx.strokeRect(b.x - 16, by - 16, 32, 32);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 16px Segoe UI'; ctx.fillText('⚡', b.x - 8, by + 6);
  });

  // Bullets & Sparks
  ctx.fillStyle = '#fef08a';
  bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6); ctx.globalAlpha = 1;
  });

  drawGunSprite(GUNS[state.selectedIdx]);

  // Aim Prompt while floating
  if (mode === 'aiming') {
    ctx.fillStyle = '#facc15';
    ctx.font = '900 18px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('AIM DOWN-LEFT & CLICK TO BLAST!', gun.x + 40, gun.y - 65);
    ctx.textAlign = 'left';
  }

  // Floating Text
  ctx.font = 'bold 15px Segoe UI';
  floatTexts.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x - 50, f.y); ctx.globalAlpha = 1;
  });

  ctx.restore();
  ctx.restore();
}

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt); draw();
  requestAnimationFrame(loop);
}

updateMenuUI();
requestAnimationFrame(loop);
