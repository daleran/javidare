import { SLOT_RADIUS, ALLOWED_FOR_BODY } from '../world/bodies.js';

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
      nx: rng(),
      ny: rng(),
      alpha: 0.15 + rng() * 0.55,
      size: rng() < 0.07 ? 1.5 : 0.9,
      layer: rng() < 0.45 ? 0 : 1,
    });
  }
  return stars;
}

const rng = seededRng(12345);
const STARS = generateStars(220, rng);

function wmod(v, m) { return ((v % m) + m) % m; }

// ─── Enemy ship shapes ────────────────────────────────────────────────────────

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

function drawSwarmer(ctx, e) {
  drawTriangle(ctx, e.x, e.y, 7, e.heading, '#ff8c00', 1.2);
}

function drawBreacher(ctx, e) {
  const s = 14;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.heading);
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo( s * 0.7,  0         );
  ctx.lineTo( s * 0.3,  s * 0.55  );
  ctx.lineTo(-s * 0.7,  s * 0.45  );
  ctx.lineTo(-s * 0.95, 0         );
  ctx.lineTo(-s * 0.7, -s * 0.45  );
  ctx.lineTo( s * 0.3, -s * 0.55  );
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHunter(ctx, e) {
  const s = 12;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.heading);
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 1.6;
  // Long needle silhouette
  ctx.beginPath();
  ctx.moveTo( s * 1.4,  0        );
  ctx.lineTo( s * 0.4,  s * 0.28 );
  ctx.lineTo(-s * 0.9,  s * 0.32 );
  ctx.lineTo(-s * 0.7,  0        );
  ctx.lineTo(-s * 0.9, -s * 0.32 );
  ctx.lineTo( s * 0.4, -s * 0.28 );
  ctx.closePath();
  ctx.stroke();
  // Sniper barrel
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.8, 0);
  ctx.lineTo(s * 1.6, 0);
  ctx.stroke();
  ctx.restore();
}

// ─── Building shapes ─────────────────────────────────────────────────────────

function drawExtractor(ctx, x, y, color) {
  const s = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRailgunTurret(ctx, x, y, color, heading) {
  const s = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  // Hexagon base
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const px = Math.cos(a) * s;
    const py = Math.sin(a) * s;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Barrel
  ctx.rotate(heading + Math.PI / 2);
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(0, -s - 8);
  ctx.stroke();
  ctx.restore();
}

function drawMissileTurret(ctx, x, y, color, heading) {
  const s = 13;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  // Octagon base
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * s;
    const py = Math.sin(a) * s;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Twin launch tubes
  ctx.rotate(heading + Math.PI / 2);
  ctx.lineWidth = 2.5;
  for (const ox of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(ox, -3);
    ctx.lineTo(ox, -s - 6);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Station shape ────────────────────────────────────────────────────────────

function drawStation(ctx, station, isSelected) {
  const { x, y } = station;
  const s = 20;
  const t = performance.now() / 1000;

  // Shield bubble
  if (station.shieldHp > 0) {
    const shieldAlpha = (station.shieldHp / station.maxShieldHp) * 0.18;
    const pulseAlpha  = shieldAlpha * (0.7 + 0.3 * Math.sin(t * 2.2));
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.strokeStyle = '#a0d8ef';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, s + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Octagon hull
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = x + Math.cos(a) * s;
    const py = y + Math.sin(a) * s;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner cross (docking ring indicator)
  ctx.strokeStyle = 'rgba(180,220,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Selection ring
  if (isSelected) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(x, y, s + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ─── Transport ship ───────────────────────────────────────────────────────────

function drawTransport(ctx, ship) {
  const w = 13;
  const h = 6;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.heading);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

  // Front bulkhead notch — gives orientation cue
  ctx.beginPath();
  ctx.moveTo(w * 0.25, -h * 0.5);
  ctx.lineTo(w * 0.25,  h * 0.5);
  ctx.stroke();

  // Cargo block
  if (ship.cargoAmount > 0) {
    const fillColor = ship.cargoKind === 'metal' ? '#aaddff'
                    : ship.cargoKind === 'water'  ? '#88ccff'
                    : '#ffe066';
    ctx.fillStyle = fillColor;
    ctx.fillRect(-w * 0.45, -h * 0.32, w * 0.65, h * 0.64);
  }
  ctx.restore();
}

// ─── Slot notch markers ───────────────────────────────────────────────────────

function drawSlots(ctx, bodies, station, territoryRadius) {
  const t = performance.now() / 1000;
  for (const body of bodies) {
    if (!body.slots || body.slots.length === 0) continue;
    const allowed = ALLOWED_FOR_BODY[body.type] || [];
    if (allowed.length === 0) continue;

    const slotR = body.radius + SLOT_RADIUS;
    for (const slot of body.slots) {
      const sx = body.x + Math.cos(slot.angle) * slotR;
      const sy = body.y + Math.sin(slot.angle) * slotR;

      const inTerritory = !station || Math.hypot(sx - station.x, sy - station.y) <= territoryRadius;

      if (slot.occupied) {
        ctx.fillStyle = inTerritory ? '#00d4ff' : 'rgba(0,212,255,0.35)';
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty notch — bigger and brighter if in territory
        const pulse = inTerritory ? 0.5 + 0.5 * Math.sin(t * 1.5 + slot.angle) : 0;
        ctx.globalAlpha = inTerritory ? 0.55 + 0.25 * pulse : 0.18;
        ctx.strokeStyle = inTerritory ? '#00d4ff' : '#4a7fa5';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.stroke();
        // Inner cross — clear "build here" affordance when in territory
        if (inTerritory) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy);
          ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}

// ─── Territory ring ───────────────────────────────────────────────────────────

function drawTerritoryRing(ctx, station, radius) {
  const t = performance.now() / 1000;
  ctx.save();
  ctx.globalAlpha = 0.32 + 0.06 * Math.sin(t * 1.2);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.arc(station.x, station.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Station orbit rings ──────────────────────────────────────────────────────

function drawStationOrbitRings(ctx, station) {
  if (!station) return;
  const t = performance.now() / 1000;

  // Current orbit ring — violet, completely outside the cyan/amber/steel palette
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#c060ff';
  ctx.lineWidth = 1.1;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, station.orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Target orbit ring — hot magenta, flashes fast on command then pulses slowly
  if (station.targetOrbit) {
    const pulse = station.orbitFlashTimer > 0
      ? 0.70 + 0.30 * Math.sin(t * 14)
      : 0.50 + 0.20 * Math.sin(t * 2.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ff66ff';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, station.targetOrbit.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ─── Warp gates ───────────────────────────────────────────────────────────────

function drawWarpGates(ctx, gates, wavePhase) {
  const t = performance.now() / 1000;
  for (const gate of gates) {
    const s = gate.active ? 14 : 10;
    const pulse = gate.active ? 0.6 + 0.4 * Math.sin(t * 5) : 0.4;

    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(t * 0.3 + gate.angle);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = gate.active ? 2 : 1.2;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0,  -s);
    ctx.lineTo(s,   0);
    ctx.lineTo(0,   s);
    ctx.lineTo(-s,  0);
    ctx.closePath();
    ctx.stroke();
    // Inner cross
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0);
    ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── Buildings ────────────────────────────────────────────────────────────────

function drawBuildings(ctx, buildings) {
  for (const b of buildings) {
    const alpha = 0.5 + 0.5 * (b.hp / b.maxHp);
    ctx.save();
    ctx.globalAlpha = alpha;
    const color = '#00d4ff';
    switch (b.type) {
      case 'metalExtractor': drawExtractor(ctx, b.x, b.y, color); break;
      case 'waterExtractor': drawExtractor(ctx, b.x, b.y, '#88ccff'); break;
      case 'railgunTurret':  drawRailgunTurret(ctx, b.x, b.y, color, b.heading); break;
      case 'missileTurret':  drawMissileTurret(ctx, b.x, b.y, '#ffe066', b.heading); break;
    }
    ctx.restore();
  }
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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    drawGrid(ctx, camera, W, H);
    drawStarfield(ctx, camera, W, H);

    ctx.save();
    camera.applyTransform(ctx);

    drawOrbitRings(ctx, state.bodies);
    drawStationOrbitRings(ctx, state.station);
    drawBodies(ctx, state.bodies);
    drawWarpGates(ctx, state.warpGates || [], state.wavePhase);
    drawWrecks(ctx, state.wrecks, state.bodies);
    drawSlots(ctx, state.bodies, state.station, state.territoryRadius);
    drawBuildings(ctx, state.buildings);

    if (state.station) {
      drawTerritoryRing(ctx, state.station, state.territoryRadius);
      const isSelected = state.selection && state.selection.kind === 'station';
      drawStation(ctx, state.station, isSelected);
    }

    for (const t of state.transportShips) drawTransport(ctx, t);
    for (const e of state.enemies) drawEnemy(ctx, e);

    drawPickups(ctx, state.pickups);
    drawFx(ctx, state.fx);
    drawProjectiles(ctx, state.projectiles);

    ctx.restore();

    // Screen-space overlays
    if (state.gameStatus === 'playing' || state.gameStatus === 'paused') {
      drawWarpGateIndicators(ctx, state, camera, W, H);
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
    if (b.type === 'asteroid') continue;
    const parent = byId[b.parentId];
    if (!parent) continue;
    ctx.strokeStyle = (b.type === 'moon' || b.type === 'ice_moon')
      ? 'rgba(74,127,165,0.38)'
      : 'rgba(74,127,165,0.55)';
    ctx.beginPath();
    ctx.arc(parent.x, parent.y, b.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBodies(ctx, bodies) {
  for (const b of bodies) {
    if (b.type === 'sun') {
      drawSun(ctx, b);
    } else if (b.type === 'gas') {
      drawGasGiant(ctx, b);
    } else if (b.type === 'ringed_giant') {
      drawRingedGiant(ctx, b);
    } else if (b.type === 'asteroid') {
      drawAsteroid(ctx, b);
    } else if (b.type === 'ice_moon') {
      drawIceMoon(ctx, b);
    } else {
      drawPlanet(ctx, b);
    }
  }
}

function drawRingedGiant(ctx, b) {
  drawGasGiant(ctx, b);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(0.4);
  ctx.strokeStyle = 'rgba(180,200,220,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius * 1.85, b.radius * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(180,200,220,0.32)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius * 1.55, b.radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawIceMoon(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,240,255,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.4, b.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSun(ctx, b) {
  const gradient = ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 2.2);
  gradient.addColorStop(0, 'rgba(255,220,80,0.22)');
  gradient.addColorStop(1, 'rgba(255,220,80,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe580';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,200,0.6)';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawGasGiant(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.stroke();
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
  const sides = 6;
  ctx.fillStyle = b.color;
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const baseAngle = (i / sides) * Math.PI * 2;
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
  ctx.strokeStyle = b.color;
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
    if (!b || !b.slots || b.slots[w.slotIndex] == null) continue;
    const slot = b.slots[w.slotIndex];
    const slotR = b.radius + SLOT_RADIUS;
    const wx = b.x + Math.cos(slot.angle) * slotR;
    const wy = b.y + Math.sin(slot.angle) * slotR;
    const s = 6;
    ctx.beginPath();
    ctx.moveTo(wx - s, wy - s); ctx.lineTo(wx + s, wy + s);
    ctx.moveTo(wx + s, wy - s); ctx.lineTo(wx - s, wy + s);
    ctx.stroke();
  }
}

function drawPickups(ctx, pickups) {
  ctx.lineWidth = 1;
  for (const p of pickups) {
    const s = 5;
    ctx.strokeStyle = p.kind === 'fuel' ? '#ffe066' : '#aaddff';
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
    if (f.dot) {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.2;
      const nx = Math.cos(Math.atan2(f.vy, f.vx));
      const ny = Math.sin(Math.atan2(f.vy, f.vx));
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x - nx * f.len, f.y - ny * f.len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    const alpha = Math.min(1, p.ttl * 4);
    if (p.kind === 'missile') {
      // Small glowing chevron
      const spd = Math.hypot(p.vx, p.vy);
      if (spd < 1) continue;
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, 3);
      ctx.lineTo(-1, 0);
      ctx.lineTo(-3, -3);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'slug' || p.kind === 'tracer') {
      const spd = Math.hypot(p.vx, p.vy);
      if (spd < 1) continue;
      const nx = p.vx / spd;
      const ny = p.vy / spd;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff8c00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - nx * 6, p.y - ny * 6);
      ctx.stroke();
    } else {
      // Cannon round: glowing disc
      const core = p.faction === 'friendly' ? '#9be7ff' : '#ffd28a';
      const glow = p.faction === 'friendly' ? '#00d4ff' : '#ff8c00';
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, e) {
  switch (e.type) {
    case 'swarmer':  drawSwarmer(ctx, e);  break;
    case 'breacher': drawBreacher(ctx, e); break;
    case 'hunter':   drawHunter(ctx, e);   break;
  }
}

// ─── Screen-edge indicator helpers ──────────────────────────────────────────

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

function drawArrowIndicator(ctx, x, y, angle, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size, size * 0.65);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size, -size * 0.65);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWarpGateIndicators(ctx, state, camera, W, H) {
  if (!state.warpGates) return;
  const t = performance.now() / 1000;
  const margin = 36;

  for (const gate of state.warpGates) {
    const screen = camera.worldToScreen(gate.x, gate.y);
    const info = clampToEdge(screen.x, screen.y, W, H, margin);
    if (info.onScreen) continue;

    const alpha = gate.active
      ? 0.6 + 0.4 * Math.sin(t * 5)
      : 0.3;

    drawArrowIndicator(ctx, info.sx, info.sy, info.angle, 10, '#ff8c00', alpha);
  }
}

function drawOffscreenEnemyMarkers(ctx, state, camera, W, H) {
  if (!state.enemies || state.enemies.length === 0) return;
  const margin = 24;

  for (const e of state.enemies) {
    const screen = camera.worldToScreen(e.x, e.y);
    const info = clampToEdge(screen.x, screen.y, W, H, margin);
    if (info.onScreen) continue;

    const size  = e.type === 'breacher' ? 9 : 5;
    const alpha = e.type === 'hunter'   ? 0.85 : 0.55;
    drawArrowIndicator(ctx, info.sx, info.sy, info.angle, size, '#ff8c00', alpha);
  }
}
