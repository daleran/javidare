import {
  BUILDING_FIRE_RATE, BUILDING_FIRE_RANGE,
  BUILDING_PROJECTILE_DAMAGE, BUILDING_PROJECTILE_SPEED,
} from '../entities/building.js';
import { ENEMY_DEFS } from '../entities/enemy.js';
import { createProjectile, createMissile, MISSILE_TURN_RATE } from '../entities/projectile.js';
import {
  STATION_SHIELD_REGEN_DELAY,
} from '../entities/station.js';
import { nextId } from '../game/state.js';
import { releaseTransportClaims } from './transports.js';
import { getShieldRegen, getWeaponsScale } from './upgrades.js';

const FIGHTER_STRAFE_RANGE  = 180;
const FIGHTER_STRAFE_PERIOD = 2.5;

export function updateCombat(state, dt) {
  if (state.gameStatus !== 'playing') return;

  updateProjectiles(state, dt);
  updateEnemyAI(state, dt);
  buildingAutofire(state, dt);
  updateShieldRegen(state, dt);
}

function updateShieldRegen(state, dt) {
  const st = state.station;
  if (!st) return;
  if (st.shieldHitTimer > 0) {
    st.shieldHitTimer -= dt;
    return;
  }
  if (st.shieldHp < st.maxShieldHp) {
    st.shieldHp = Math.min(st.maxShieldHp, st.shieldHp + getShieldRegen(state) * dt);
  }
}

function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];

    // Missile homing
    if (p.kind === 'missile') {
      let target = state.enemies.find(e => e.id === p.targetId);
      if (!target && state.enemies.length > 0) {
        // Retarget nearest
        let bestD = Infinity;
        for (const e of state.enemies) {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < bestD) { bestD = d; target = e; }
        }
        if (target) p.targetId = target.id;
      }

      if (target) {
        const desiredAngle = Math.atan2(target.y - p.y, target.x - p.x);
        const currentAngle = Math.atan2(p.vy, p.vx);
        let da = desiredAngle - currentAngle;
        // Normalize to [-π, π]
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const turn = Math.min(Math.abs(da), MISSILE_TURN_RATE * dt) * Math.sign(da);
        const newAngle = currentAngle + turn;
        p.vx = Math.cos(newAngle) * p.speed;
        p.vy = Math.sin(newAngle) * p.speed;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) { state.projectiles.splice(i, 1); continue; }

    if (p.faction === 'friendly') {
      // Friendly rounds hit enemies
      const hitRadius = p.kind === 'missile' ? 18 : 14;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < hitRadius) {
          e.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (e.hp <= 0) killEnemy(state, j);
          break;
        }
      }
    } else {
      // Enemy rounds hit: buildings first, then transports, then station
      let hitBuilding = false;
      for (let j = state.buildings.length - 1; j >= 0; j--) {
        const b = state.buildings[j];
        if (Math.hypot(p.x - b.x, p.y - b.y) < 22) {
          b.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (b.hp <= 0) killBuilding(state, j);
          hitBuilding = true;
          break;
        }
      }
      if (hitBuilding) continue;

      let hitTransport = false;
      for (let j = state.transportShips.length - 1; j >= 0; j--) {
        const t = state.transportShips[j];
        if (Math.hypot(p.x - t.x, p.y - t.y) < 10) {
          t.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (t.hp <= 0) killTransport(state, j);
          hitTransport = true;
          break;
        }
      }
      if (hitTransport) continue;

      // Hit station (shield → hull)
      if (state.station) {
        if (Math.hypot(p.x - state.station.x, p.y - state.station.y) < 20) {
          applyDamageToStation(state, p.damage);
          state.projectiles.splice(i, 1);
        }
      }
    }
  }
}

function applyDamageToStation(state, damage) {
  const st = state.station;
  if (!st) return;
  st.shieldHitTimer = STATION_SHIELD_REGEN_DELAY;

  if (st.shieldHp > 0) {
    const absorbed = Math.min(st.shieldHp, damage);
    st.shieldHp -= absorbed;
    damage -= absorbed;
  }
  if (damage > 0) {
    st.hp -= damage;
    if (st.hp <= 0) {
      st.hp = 0;
      state.gameStatus = 'gameover';
    }
  }
}

function updateEnemyAI(state, dt) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const def = ENEMY_DEFS[e.type];
    const target = getPriorityTarget(state, e, def);
    if (!target) continue;

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);

    // Hunter: maintain standoff distance
    const standoff = def.standoffRange || 0;
    if (standoff > 0) {
      if (dist > standoff + 40) {
        e.vx = (dx / dist) * def.speed;
        e.vy = (dy / dist) * def.speed;
      } else if (dist < standoff - 40) {
        e.vx = -(dx / dist) * def.speed;
        e.vy = -(dy / dist) * def.speed;
      } else {
        // Orbit sideways
        const perpX = -dy / dist;
        const perpY =  dx / dist;
        e.vx = perpX * def.speed * e.strafeDir;
        e.vy = perpY * def.speed * e.strafeDir;
      }
    } else {
      // Strafing approach
      e.strafeTick += dt;
      if (e.strafeTick > FIGHTER_STRAFE_PERIOD) {
        e.strafeTick = 0;
        e.strafeDir *= -1;
      }

      if (dist > FIGHTER_STRAFE_RANGE + 60) {
        e.vx = (dx / dist) * def.speed;
        e.vy = (dy / dist) * def.speed;
      } else if (dist > 80) {
        const perpX = -dy / dist;
        const perpY =  dx / dist;
        const blend = Math.max(0, (dist - 100) / FIGHTER_STRAFE_RANGE);
        e.vx = ((dx / dist) * blend + perpX * (1 - blend) * e.strafeDir) * def.speed;
        e.vy = ((dy / dist) * blend + perpY * (1 - blend) * e.strafeDir) * def.speed;
      }
    }

    // Burst-fire
    if (e.burstRemaining > 0) {
      e.burstGapTimer -= dt;
      if (e.burstGapTimer <= 0) {
        const angle = Math.atan2(target.y - e.y, target.x - e.x);
        state.projectiles.push(createProjectile(e.x, e.y, angle, def.fireSpeed, def.fireDamage, 'enemy', 'slug'));
        e.burstRemaining--;
        e.burstGapTimer = def.burstGap;
        if (e.burstRemaining === 0) e.fireCooldown = 1 / def.fireRate;
      }
    } else {
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist < def.fireRange) {
        e.burstRemaining = def.burstCount;
        e.burstGapTimer = 0;
        e.fireCooldown = 0;
      }
    }

    if (dist > 0) e.heading = Math.atan2(e.vy, e.vx);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
}

// Use per-type aggro list to find the highest-priority target
function getPriorityTarget(state, enemy, def) {
  const aggroList = def.aggro || ['metalExtractor', 'waterExtractor', 'railgunTurret', 'missileTurret', 'station'];

  for (const category of aggroList) {
    if (category === 'station') {
      if (state.station) return state.station;
      continue;
    }
    if (category === 'transport') {
      // Nearest transport
      let best = null, bestD = Infinity;
      for (const t of state.transportShips) {
        const d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (best) return best;
      continue;
    }
    // Building category
    let best = null, bestD = Infinity;
    for (const b of state.buildings) {
      if (b.type !== category) continue;
      const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) return best;
  }

  return state.station || null;
}

function buildingAutofire(state, dt) {
  const scale = getWeaponsScale(state);
  for (const bldg of state.buildings) {
    const baseRate = BUILDING_FIRE_RATE[bldg.type];
    if (!baseRate) continue;
    if (bldg.ammo <= 0) continue;

    const fireRate = baseRate * scale;
    const range    = BUILDING_FIRE_RANGE[bldg.type] * scale;
    const target   = nearestEnemy(state, bldg.x, bldg.y, range);
    if (target) bldg.heading = Math.atan2(target.y - bldg.y, target.x - bldg.x);
    bldg.fireCooldown -= dt;
    if (bldg.fireCooldown > 0 || !target) continue;

    bldg.fireCooldown = 1 / fireRate;
    bldg.ammo--;

    if (bldg.type === 'missileTurret') {
      const missile = createMissile(
        bldg.x, bldg.y,
        bldg.heading,
        BUILDING_PROJECTILE_SPEED[bldg.type],
        BUILDING_PROJECTILE_DAMAGE[bldg.type],
        target.id,
      );
      state.projectiles.push(missile);
      spawnMuzzleFlash(state, bldg.x, bldg.y, bldg.heading);
    } else {
      const speed = BUILDING_PROJECTILE_SPEED[bldg.type];
      const dmg   = BUILDING_PROJECTILE_DAMAGE[bldg.type];
      state.projectiles.push(createProjectile(bldg.x, bldg.y, bldg.heading, speed, dmg, 'friendly', 'cannon'));
      spawnMuzzleFlash(state, bldg.x, bldg.y, bldg.heading);
    }
  }
}

function nearestEnemy(state, x, y, range) {
  let best = null;
  let bestD2 = range * range;
  for (const e of state.enemies) {
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

function killEnemy(state, index) {
  const e = state.enemies[index];
  if (!e) return;
  state.waveKillCount++;
  spawnDropPickup(state, e);
  spawnDeathFx(state, e.x, e.y, '#ff8c00');
  state.enemies.splice(index, 1);
}

function killBuilding(state, index) {
  const b = state.buildings[index];
  spawnDeathFx(state, b.x, b.y, '#4a7fa5');

  releaseTransportClaims(state, b.id);

  const body = state.bodies.find(bd => bd.id === b.bodyId);
  if (body && body.slots) {
    const slot = body.slots[b.slotIndex];
    if (slot) {
      slot.occupied = false;
      slot.cooldownUntil = performance.now() / 1000 + 10;
      slot.buildingId = null;
    }
    body.buildings = body.buildings.filter(bb => bb.id !== b.id);
  }
  state.wrecks.push({ bodyId: b.bodyId, slotIndex: b.slotIndex, timer: 10 });
  state.buildings.splice(index, 1);
}

function killTransport(state, index) {
  const t = state.transportShips[index];
  spawnDeathFx(state, t.x, t.y, '#00d4ff');

  if (t.jobTargetId) {
    const bldg = state.buildings.find(b => b.id === t.jobTargetId);
    if (bldg) {
      if (bldg.claimed && bldg.claimedBy === t.id) { bldg.claimed = false; bldg.claimedBy = null; }
      if (bldg.refillClaimed && bldg.refillClaimedBy === t.id) { bldg.refillClaimed = false; bldg.refillClaimedBy = null; }
    }
    // Release any pickup claim
    const pk = state.pickups.find(p => p.id === t.jobTargetId);
    if (pk) { pk.claimed = false; pk.claimedBy = null; }

    if (t.state === 'toTurret' && t.cargoAmount > 0) {
      state.resources.metal = Math.min(state.metalCap, state.resources.metal + t.cargoAmount);
    }
  }
  state.transportShips.splice(index, 1);
}

function spawnDropPickup(state, enemy) {
  const def = ENEMY_DEFS[enemy.type];
  if (def.dropMetal > 0) {
    state.pickups.push({
      id: nextId(state),
      x: enemy.x + (Math.random() - 0.5) * 16,
      y: enemy.y + (Math.random() - 0.5) * 16,
      kind: 'metal',
      amount: def.dropMetal,
      claimed: false,
      claimedBy: null,
    });
  }
  if (def.dropFuel > 0) {
    state.pickups.push({
      id: nextId(state),
      x: enemy.x + (Math.random() - 0.5) * 16,
      y: enemy.y + (Math.random() - 0.5) * 16,
      kind: 'fuel',
      amount: def.dropFuel,
      claimed: false,
      claimedBy: null,
    });
  }
}

function spawnMuzzleFlash(state, x, y, angle) {
  state.fx.push({
    dot: true,
    x: x + Math.cos(angle) * 6,
    y: y + Math.sin(angle) * 6,
    vx: 0, vy: 0,
    ttl: 0.07, maxTtl: 0.07,
    color: '#9be7ff',
    size: 3.5,
  });
}

export function spawnDeathFx(state, x, y, color) {
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 60 + Math.random() * 100;
    state.fx.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl: 0.4 + Math.random() * 0.4,
      maxTtl: 0.8,
      color,
      len: 8 + Math.random() * 10,
    });
  }
}
