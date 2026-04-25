import { PICKUP_PULL_RADIUS } from '../systems/economy.js';
import { HOME_HEAL_RADIUS } from '../entities/playerShip.js';

// seeded RNG for deterministic starfield
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(count, rng) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      nx: rng(),    // normalized [0,1] position
      ny: rng(),
      alpha: 0.15 + rng() * 0.55,
      size: rng() < 0.07 ? 1.5 : 0.9,
      layer: rng() < 0.45 ? 0 : 1,  // 0=far, 1=near
    });
  }
  return stars;
}

const rng = seededRng(12345);
const STARS = generateStars(220, rng);

function wmod(v, m) { return ((v % m) + m) % m; }

// ─── Ship/enemy triangle shape ──────────────────────────────────────────────

function drawTriangle(ctx, x, y, size, heading, strokeColor, lineWidth = 1.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.beginPath();
  ctx.moveTo(size * 1.1, 0);
  ctx.lineTo(-size * 0.7, size * 0.55);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.7, -size * 0.55);
  ctx.closePath();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawChevron(ctx, x, y, size, heading, color) {
  // Bomber silhouette: wide chevron
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(-size * 0.5, size * 0.9);
  ctx.lineTo(-size * 0.2, 0);
  ctx.lineTo(-size * 0.5, -size * 0.9);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawMiniboss(ctx, x, y, size, heading, color) {
  // Larger, jagged outline
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(size * 0.4, size * 0.7);
  ctx.lineTo(-size * 0.2, size * 1.1);
  ctx.lineTo(-size * 0.7, size * 0.6);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.6);
  ctx.lineTo(-size * 0.2, -size * 1.1);
  ctx.lineTo(size * 0.4, -size * 0.7);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// ─── Building shapes ─────────────────────────────────────────────────────────

function drawExtractor(ctx, x, y, color) {
  const s = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLightTurret(ctx, x, y, color, heading) {
  const s = 11;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.85, s * 0.5);
  ctx.lineTo(-s * 0.85, s * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(0, -s - 10);
  ctx.stroke();
  ctx.restore();
}

function drawTurretPlatform(ctx, x, y, color, heading) {
  const s = 16;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  // Hexagon base — no rotation, it's symmetric
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const px = x + Math.cos(a) * s;
    const py = y + Math.sin(a) * s;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Rotating barrel
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, -s - 8);
  ctx.stroke();
  ctx.restore();
}

function drawShipyard(ctx, x, y, color) {
  const w = 28, h = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  // Two landing pad wings
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2 - 8, y);
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2 + 8, y);
  ctx.stroke();
  // Small rectangle inside
  ctx.strokeRect(x - 5, y - 5, 10, 10);
}

// ─── Main render function ────────────────────────────────────────────────────

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  window.addEventListener('resize', resize);
  resize();

  return { render, ctx };

  function render(state, camera) {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Reset to physical-pixel space
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    // Grid overlay (screen-space tactical display)
    drawGrid(ctx, camera, W, H);

    // Starfield (screen-space parallax)
    drawStarfield(ctx, camera, W, H);

    // World-space drawing
    ctx.save();
    camera.applyTransform(ctx);

    drawOrbitRings(ctx, state.bodies);
    drawHealAura(ctx, state.bodies);
    drawBodies(ctx, state.bodies);
    drawWrecks(ctx, state.wrecks, state.bodies);
    drawBuildings(ctx, state.buildings);
    drawPickups(ctx, state.pickups);
    drawFx(ctx, state.fx);
    drawProjectiles(ctx, state.projectiles);

    for (const f of state.fleet) drawFleetShip(ctx, f);
    for (const e of state.enemies) drawEnemy(ctx, e);

    drawPlayerShip(ctx, state.playerShip);
    drawPullRadius(ctx, state.playerShip);

    // Build progress arc around player
    if (state.buildPhase === 'holding') {
      drawBuildArc(ctx, state.playerShip, state.buildProgress);
    }

    ctx.restore();

    // Screen-space overlays (after world restore — coordinates are CSS pixels)
    if (state.gameStatus === 'playing' || state.gameStatus === 'paused') {
      drawWaveOriginIndicators(ctx, state, camera, W, H);
      drawOffscreenEnemyMarkers(ctx, state, camera, W, H);
    }
  }
}

function drawGrid(ctx, camera, W, H) {
  ctx.save();
  ctx.strokeStyle = 'rgba(74,127,165,0.045)';
  ctx.lineWidth = 0.5;
  const gridSize = 60;
  const offX = wmod(-camera.x * 0.05, gridSize);
  const offY = wmod(-camera.y * 0.05, gridSize);
  for (let x = offX; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = offY; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

function drawStarfield(ctx, camera, W, H) {
  ctx.save();
  for (const s of STARS) {
    const factor = s.layer === 0 ? 0.12 : 0.28;
    const sx = wmod(s.nx * W - camera.x * factor, W);
    const sy = wmod(s.ny * H - camera.y * factor, H);
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawOrbitRings(ctx, bodies) {
  ctx.save();
  ctx.setLineDash([5, 9]);
  ctx.lineWidth = 0.6;
  const byId = {};
  for (const b of bodies) byId[b.id] = b;
  for (const b of bodies) {
    if (!b.parentId || b.orbitRadius <= 0) continue;
    const parent = byId[b.parentId];
    if (!parent) continue;
    ctx.strokeStyle = b.type === 'moon'
      ? 'rgba(74,127,165,0.38)'
      : 'rgba(74,127,165,0.55)';
    ctx.beginPath();
    ctx.arc(parent.x, parent.y, b.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHealAura(ctx, bodies) {
  const home = bodies.find(b => b.isHome);
  if (!home) return;
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);

  ctx.save();
  // Radial fill from planet edge outward
  const grad = ctx.createRadialGradient(home.x, home.y, home.radius, home.x, home.y, HOME_HEAL_RADIUS);
  grad.addColorStop(0, `rgba(0,220,140,${0.06 + 0.04 * pulse})`);
  grad.addColorStop(1, 'rgba(0,220,140,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(home.x, home.y, HOME_HEAL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Pulsing boundary ring
  ctx.globalAlpha = 0.12 + 0.10 * pulse;
  ctx.strokeStyle = '#00dc8c';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.arc(home.x, home.y, HOME_HEAL_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBodies(ctx, bodies) {
  for (const b of bodies) {
    if (b.type === 'sun') {
      drawSun(ctx, b);
    } else if (b.type === 'gas') {
      drawGasGiant(ctx, b);
    } else if (b.type === 'asteroid') {
      drawAsteroid(ctx, b);
    } else {
      drawPlanet(ctx, b);
    }
  }
}

function drawSun(ctx, b) {
  // Outer glow
  const gradient = ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 2.2);
  gradient.addColorStop(0, 'rgba(255,220,80,0.22)');
  gradient.addColorStop(1, 'rgba(255,220,80,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#ffe580';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  // Inner bright
  ctx.fillStyle = 'rgba(255,255,200,0.6)';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawGasGiant(ctx, b) {
  // Body fill
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();

  // Outline ring
  ctx.strokeStyle = shiftAlpha(b.color, 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Banding strokes (3 horizontal bands)
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = b.radius * 0.18;
  for (const yOff of [-b.radius * 0.4, 0, b.radius * 0.4]) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.radius, b.y + yOff);
    ctx.lineTo(b.x + b.radius, b.y + yOff);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAsteroid(ctx, b) {
  // Irregular polygon using seeded offsets based on body id
  const sides = 6;
  ctx.fillStyle = b.color;
  ctx.strokeStyle = shiftAlpha(b.color, 1.2);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const baseAngle = (i / sides) * Math.PI * 2;
    // Pseudo-random radius variation per body
    const seed = b.id.charCodeAt(b.id.length - 1) + i * 13;
    const r = b.radius * (0.7 + 0.35 * ((seed * 7 + 3) % 10) / 10);
    const px = b.x + Math.cos(baseAngle) * r;
    const py = b.y + Math.sin(baseAngle) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPlanet(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  // Outline ring
  ctx.strokeStyle = shiftAlpha(b.color, 1.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWrecks(ctx, wrecks, bodies) {
  const bodyMap = {};
  for (const b of bodies) bodyMap[b.id] = b;
  ctx.strokeStyle = 'rgba(74,127,165,0.4)';
  ctx.lineWidth = 1;
  for (const w of wrecks) {
    const b = bodyMap[w.bodyId];
    if (!b) continue;
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(b.x - s, b.y - s); ctx.lineTo(b.x + s, b.y + s);
    ctx.moveTo(b.x + s, b.y - s); ctx.lineTo(b.x - s, b.y + s);
    ctx.stroke();
  }
}

function drawBuildings(ctx, buildings) {
  for (const b of buildings) {
    // HP-based opacity
    const alpha = 0.5 + 0.5 * (b.hp / b.maxHp);
    ctx.save();
    ctx.globalAlpha = alpha;
    switch (b.type) {
      case 'extractor':      drawExtractor(ctx, b.x, b.y, '#00d4ff'); break;
      case 'lightTurret':    drawLightTurret(ctx, b.x, b.y, '#00d4ff', b.heading); break;
      case 'turretPlatform': drawTurretPlatform(ctx, b.x, b.y, '#00d4ff', b.heading); break;
      case 'shipyard':       drawShipyard(ctx, b.x, b.y, '#00d4ff'); break;
    }
    ctx.restore();
  }
}

function drawPickups(ctx, pickups) {
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 1;
  for (const p of pickups) {
    const s = 5;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

function drawFx(ctx, fx) {
  for (const f of fx) {
    const alpha = Math.max(0, f.ttl / f.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 1.2;
    const nx = Math.cos(Math.atan2(f.vy, f.vx));
    const ny = Math.sin(Math.atan2(f.vy, f.vx));
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x - nx * f.len, f.y - ny * f.len);
    ctx.stroke();
    ctx.restore();
  }
}

function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < 1) continue;
    const nx = p.vx / speed;
    const ny = p.vy / speed;
    const len = p.faction === 'friendly' ? 10 : 7;
    ctx.strokeStyle = p.faction === 'friendly' ? '#00d4ff' : '#ff8c00';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = Math.min(1, p.ttl * 4);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - nx * len, p.y - ny * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFleetShip(ctx, f) {
  drawTriangle(ctx, f.x, f.y, 10, f.heading, '#00d4ff', 1.2);
}

function drawEnemy(ctx, e) {
  switch (e.type) {
    case 'skirmisher': drawTriangle(ctx, e.x, e.y, 10, e.heading, '#ff8c00', 1.2); break;
    case 'bomber':     drawChevron(ctx, e.x, e.y, 13, e.heading, '#ff8c00'); break;
    case 'miniboss':   drawMiniboss(ctx, e.x, e.y, 22, e.heading, '#ff8c00'); break;
  }
}

function drawPlayerShip(ctx, ship) {
  if (!ship) return;
  // Subtle glow
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawTriangle(ctx, ship.x, ship.y, 14, ship.heading, '#ffffff', 1.8);
}

function drawPullRadius(ctx, ship) {
  if (!ship) return;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, PICKUP_PULL_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBuildArc(ctx, ship, progress) {
  ctx.save();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  const startAngle = -Math.PI / 2;
  ctx.arc(ship.x, ship.y, 30, startAngle, startAngle + progress * Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Utility: lighten a hex color or adjust opacity
function shiftAlpha(color, factor) {
  // Just use the color directly — we use it for stroke outlines
  return color;
}

// ─── Screen-edge indicator helpers ──────────────────────────────────────────

// Clamp a world-space point to a rectangle inset from the viewport edges.
// Returns { sx, sy, angle } where angle points outward from screen center toward the original point.
function clampToEdge(sx, sy, W, H, margin) {
  const cx = W / 2, cy = H / 2;
  const dx = sx - cx, dy = sy - cy;
  const angle = Math.atan2(dy, dx);
  const inW = W / 2 - margin, inH = H / 2 - margin;
  const scale = Math.min(inW / (Math.abs(dx) || 0.001), inH / (Math.abs(dy) || 0.001));
  const clamped = (sx >= margin && sx <= W - margin && sy >= margin && sy <= H - margin);
  return {
    sx: cx + dx * Math.min(scale, 1),
    sy: cy + dy * Math.min(scale, 1),
    angle,
    onScreen: clamped,
  };
}

function drawArrow(ctx, x, y, angle, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size,     0);
  ctx.lineTo(-size,  size * 0.65);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size, -size * 0.65);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWaveOriginIndicators(ctx, state, camera, W, H) {
  if (!state.waveOrigins || state.waveOrigins.length === 0) return;

  const t = performance.now() / 1000;
  const isBuildup = state.wavePhase === 'buildup';
  const margin = 36;

  for (const origin of state.waveOrigins) {
    const screen = camera.worldToScreen(origin.x, origin.y);
    const info = clampToEdge(screen.x, screen.y, W, H, margin);
    if (info.onScreen) continue; // origin is visible in world — no indicator needed

    const alpha = isBuildup
      ? 0.45 + 0.4 * Math.sin(t * 5)
      : 0.85;

    drawArrow(ctx, info.sx, info.sy, info.angle, 10, '#ff8c00', alpha);
  }
}

function drawOffscreenEnemyMarkers(ctx, state, camera, W, H) {
  if (!state.enemies || state.enemies.length === 0) return;

  const margin = 24;

  for (const e of state.enemies) {
    const screen = camera.worldToScreen(e.x, e.y);
    const info = clampToEdge(screen.x, screen.y, W, H, margin);
    if (info.onScreen) continue;

    drawArrow(ctx, info.sx, info.sy, info.angle, 5, '#ff8c00', 0.65);
  }
}
