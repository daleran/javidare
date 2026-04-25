import {
  PLAYER_FIRE_RATE, PLAYER_PROJECTILE_SPEED, PLAYER_PROJECTILE_DAMAGE, PLAYER_FIRE_RANGE,
  HOME_HEAL_RADIUS, HOME_HEAL_RATE,
} from '../entities/playerShip.js';
import {
  FLEET_FIRE_RATE, FLEET_PROJECTILE_SPEED, FLEET_PROJECTILE_DAMAGE, FLEET_FIRE_RANGE,
} from '../entities/fleetShip.js';
import {
  BUILDING_FIRE_RATE, BUILDING_FIRE_RANGE, BUILDING_PROJECTILE_DAMAGE, BUILDING_PROJECTILE_SPEED,
  CRYO_RANGE, CRYO_SLOW_FACTOR, CRYO_MAX_SLOW,
} from '../entities/building.js';
import { ENEMY_DEFS } from '../entities/enemy.js';
import { createProjectile } from '../entities/projectile.js';
import { nextId } from '../game/state.js';

const ENEMY_SPEED = { skirmisher: 180, bomber: 90, miniboss: 60 };

// Returns all player-controlled ships regardless of single/multi mode
function getAllPlayerShips(state) {
  if (state.players) return Object.values(state.players);
  return state.playerShip ? [state.playerShip] : [];
}

const STRAFE_PERIOD = 2.5; // seconds between strafe direction changes
const STRAFE_RANGE = 220;  // distance at which skirmisher strafes
const BOMB_CONTACT = 22;   // bomber contact radius for ram damage

export function updateCombat(state, dt) {
  if (state.gameStatus !== 'playing') return;

  // Update projectile positions and TTL
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }
    // Friendly hits enemies
    if (p.faction === 'friendly') {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < 14) {
          e.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (e.hp <= 0) killEnemy(state, j);
          break;
        }
      }
    } else {
      // Enemy projectile hits any player ship
      let hitPlayer = false;
      for (const ship of getAllPlayerShips(state)) {
        if (Math.hypot(p.x - ship.x, p.y - ship.y) < 14) {
          ship.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (ship.hp <= 0 && getAllPlayerShips(state).every(s => s.hp <= 0)) {
            state.gameStatus = 'gameover';
          }
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) continue;
      for (let j = state.fleet.length - 1; j >= 0; j--) {
        const f = state.fleet[j];
        if (Math.hypot(p.x - f.x, p.y - f.y) < 11) {
          f.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (f.hp <= 0) killFrigate(state, j);
          break;
        }
      }
      // Enemy projectile hits buildings
      for (let j = state.buildings.length - 1; j >= 0; j--) {
        const b = state.buildings[j];
        if (Math.hypot(p.x - b.x, p.y - b.y) < 22) {
          b.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (b.hp <= 0) killBuilding(state, j);
          break;
        }
      }
    }
  }

  // Enemy AI and autofire
  updateEnemyAI(state, dt);

  // Player autofire
  playerAutofire(state, dt);

  // Fleet autofire
  fleetAutofire(state, dt);

  // Building autofire
  buildingAutofire(state, dt);

  // Home planet healing aura
  const home = state.bodies.find(b => b.isHome);
  if (home) {
    for (const ship of getAllPlayerShips(state)) {
      if (ship.hp >= ship.maxHp) continue;
      const dist = Math.hypot(ship.x - home.x, ship.y - home.y);
      if (dist < HOME_HEAL_RADIUS) {
        ship.hp = Math.min(ship.maxHp, ship.hp + HOME_HEAL_RATE * dt);
      }
    }
  }
}

function cryoSlowFactor(state, x, y) {
  let total = 0;
  const r2 = CRYO_RANGE * CRYO_RANGE;
  for (const b of state.buildings) {
    if (b.type !== 'cryoBattery') continue;
    const d2 = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
    if (d2 < r2) total += CRYO_SLOW_FACTOR;
  }
  return Math.min(CRYO_MAX_SLOW, total);
}

function updateEnemyAI(state, dt) {
  const now = state.waveTimer; // use as time reference for strafe
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const def = ENEMY_DEFS[e.type];

    // Cryo slow aura applies to this enemy's effective speed for this tick
    const slow = cryoSlowFactor(state, e.x, e.y);
    const speed = def.speed * (1 - slow);

    // Pick target — type-biased nearest-friendly
    let target = null;
    if (e.type === 'bomber') {
      target = nearestBuilding(state, e) || nearestShip(state, e);
    } else {
      // Skirmisher + miniboss prefer ships, fall back to buildings
      target = nearestShip(state, e) || nearestBuilding(state, e);
    }

    if (!target) continue;

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (e.type === 'skirmisher') {
      // Strafing behavior: at medium range, move perpendicular
      e.strafeTick += dt;
      if (e.strafeTick > STRAFE_PERIOD) {
        e.strafeTick = 0;
        e.strafeDir *= -1;
      }

      if (dist > STRAFE_RANGE + 60) {
        // Chase
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
      } else if (dist > 80) {
        // Strafe
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const chaseBlend = Math.max(0, (dist - 100) / STRAFE_RANGE);
        e.vx = ((dx / dist) * chaseBlend + perpX * (1 - chaseBlend) * e.strafeDir) * speed;
        e.vy = ((dy / dist) * chaseBlend + perpY * (1 - chaseBlend) * e.strafeDir) * speed;
      }
    } else if (e.type === 'bomber') {
      // Move straight at target
      if (dist > 0) {
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
      }
      // Ram damage on contact
      if (dist < BOMB_CONTACT) {
        if (getAllPlayerShips(state).includes(target)) {
          target.hp -= def.ramDamage;
          if (target.hp <= 0 && getAllPlayerShips(state).every(s => s.hp <= 0)) {
            state.gameStatus = 'gameover';
          }
        } else {
          const fIdx = state.fleet.indexOf(target);
          if (fIdx >= 0) {
            target.hp -= def.ramDamage;
            if (target.hp <= 0) killFrigate(state, fIdx);
          } else {
            // target is a building
            const bIdx = state.buildings.indexOf(target);
            if (bIdx >= 0) {
              target.hp -= def.ramDamage;
              if (target.hp <= 0) killBuilding(state, bIdx);
            }
          }
        }
        // Bomber dies on ram
        killEnemy(state, i);
        continue;
      }
    } else if (e.type === 'miniboss') {
      // Slow pursuit
      if (dist > 80 && dist > 0) {
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
      } else {
        e.vx *= 0.9;
        e.vy *= 0.9;
      }
      // Spawn adds
      if (e.type === 'miniboss') {
        e.addSpawnTimer -= dt;
        if (e.addSpawnTimer <= 0) {
          e.addSpawnTimer = def.addSpawnInterval;
          spawnAdd(state, e);
        }
      }
    }

    if (dist > 0) {
      e.heading = Math.atan2(e.vy, e.vx);
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Autofire
    if (def.fireRate > 0) {
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist < def.fireRange) {
        e.fireCooldown = 1 / def.fireRate;
        const angle = Math.atan2(dy, dx);
        state.projectiles.push(createProjectile(e.x, e.y, angle, def.fireSpeed, def.fireDamage, 'enemy'));
      }
    }
  }
}

function spawnAdd(state, miniboss) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 80;
  const x = miniboss.x + Math.cos(angle) * dist;
  const y = miniboss.y + Math.sin(angle) * dist;
  const id = nextId(state);
  const add = {
    id,
    type: 'skirmisher',
    hp: ENEMY_DEFS.skirmisher.hp,
    maxHp: ENEMY_DEFS.skirmisher.hp,
    x, y,
    vx: 0, vy: 0,
    heading: 0,
    fireCooldown: Math.random(),
    strafeTick: 0,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    isAdd: true,
  };
  state.enemies.push(add);
  miniboss.spawnedAddIds.push(id);
  state.waveSpawnCount++;
}

function killEnemy(state, index) {
  const e = state.enemies[index];
  if (!e) return;

  state.waveKillCount++;
  spawnDropPickup(state, e);
  spawnDeathFx(state, e.x, e.y, '#ff8c00');

  // Remove the enemy first, then handle miniboss special logic
  state.enemies.splice(index, 1);

  if (e.type === 'miniboss') {
    // Despawn all adds spawned by this boss (by id list)
    state.enemies = state.enemies.filter(en => !e.spawnedAddIds.includes(en.id));
    state.gameStatus = 'victory';
  }
}

function killFrigate(state, index) {
  const f = state.fleet[index];
  spawnDeathFx(state, f.x, f.y, '#00d4ff');

  // Mark its shipyard slot as unoccupied so it can respawn
  const shipyard = state.buildings.find(b => b.id === f.homeShipyardId);
  if (shipyard && shipyard.slots) {
    const slot = shipyard.slots[f.slotIndex % shipyard.slots.length];
    if (slot) {
      slot.occupied = false;
      slot.respawnTimer = 15;
    }
  }

  state.fleet.splice(index, 1);
}

function killBuilding(state, index) {
  const b = state.buildings[index];
  spawnDeathFx(state, b.x, b.y, '#4a7fa5');

  // If shipyard, update fleet cap and remove excess frigates
  if (b.type === 'shipyard') {
    state.shipyardCount = Math.max(0, state.shipyardCount - 1);
    state.fleetCap = state.shipyardCount * 4;
    while (state.fleet.length > state.fleetCap) {
      const removed = state.fleet.pop();
      spawnDeathFx(state, removed.x, removed.y, '#00d4ff');
    }
  }

  // Mark body on rebuild cooldown — only this slot (building type) is locked,
  // other slot types on the same body remain buildable.
  const body = state.bodies.find(bd => bd.id === b.bodyId);
  if (body) {
    body.buildings = body.buildings.filter(bb => bb.id !== b.id);
    body.cooldowns = body.cooldowns || {};
    body.cooldowns[b.type] = (Date.now() / 1000) + 10;
    state.wrecks.push({ bodyId: b.bodyId, timer: 10 });
  }

  state.buildings.splice(index, 1);
}

function nearestBuilding(state, enemy) {
  let best = null, bestDist = Infinity;
  for (const b of state.buildings) {
    const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best;
}

function nearestShip(state, enemy) {
  let best = null, bestDist = Infinity;
  const candidates = [...getAllPlayerShips(state), ...state.fleet];
  for (const s of candidates) {
    const d = Math.hypot(s.x - enemy.x, s.y - enemy.y);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}

function nearestEnemy(state, x, y, range) {
  let best = null, bestDist = range * range;
  for (const e of state.enemies) {
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bestDist) { bestDist = d2; best = e; }
  }
  return best;
}

function playerAutofire(state, dt) {
  for (const ship of getAllPlayerShips(state)) {
    ship.fireCooldown -= dt;
    if (ship.fireCooldown > 0) continue;
    const target = nearestEnemy(state, ship.x, ship.y, PLAYER_FIRE_RANGE);
    if (!target) continue;
    ship.fireCooldown = 1 / PLAYER_FIRE_RATE;
    const angle = Math.atan2(target.y - ship.y, target.x - ship.x);
    state.projectiles.push(createProjectile(ship.x, ship.y, angle, PLAYER_PROJECTILE_SPEED, PLAYER_PROJECTILE_DAMAGE, 'friendly'));
  }
}

function fleetAutofire(state, dt) {
  for (const frigate of state.fleet) {
    frigate.fireCooldown -= dt;
    if (frigate.fireCooldown > 0) continue;
    const target = nearestEnemy(state, frigate.x, frigate.y, FLEET_FIRE_RANGE);
    if (!target) continue;
    frigate.fireCooldown = 1 / FLEET_FIRE_RATE;
    const angle = Math.atan2(target.y - frigate.y, target.x - frigate.x);
    state.projectiles.push(createProjectile(frigate.x, frigate.y, angle, FLEET_PROJECTILE_SPEED, FLEET_PROJECTILE_DAMAGE, 'friendly'));
  }
}

function buildingAutofire(state, dt) {
  for (const bldg of state.buildings) {
    const fireRate = BUILDING_FIRE_RATE[bldg.type];
    if (!fireRate) continue;
    const range = BUILDING_FIRE_RANGE[bldg.type];
    const target = nearestEnemy(state, bldg.x, bldg.y, range);
    // Always track nearest enemy with the barrel, even between shots
    if (target) bldg.heading = Math.atan2(target.y - bldg.y, target.x - bldg.x);
    bldg.fireCooldown -= dt;
    if (bldg.fireCooldown > 0) continue;
    if (!target) continue;
    bldg.fireCooldown = 1 / fireRate;
    const speed = BUILDING_PROJECTILE_SPEED[bldg.type];
    const dmg = BUILDING_PROJECTILE_DAMAGE[bldg.type];
    state.projectiles.push(createProjectile(bldg.x, bldg.y, bldg.heading, speed, dmg, 'friendly'));
  }
}

function spawnDropPickup(state, enemy) {
  const def = ENEMY_DEFS[enemy.type];
  const value = Math.round(def.dropMin + Math.random() * (def.dropMax - def.dropMin));
  state.pickups.push({
    x: enemy.x + (Math.random() - 0.5) * 20,
    y: enemy.y + (Math.random() - 0.5) * 20,
    value,
    ttl: 12,
  });
}

function spawnDeathFx(state, x, y, color) {
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
