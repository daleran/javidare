import { EXTRACTOR_BASE_INCOME, SHIPYARD_RESPAWN_TIME } from '../entities/building.js';
import { createFleetShip, FLEET_COST } from '../entities/fleetShip.js';
import { nextId } from '../game/state.js';

const PICKUP_COLLECT_RADIUS = 50;
export const PICKUP_PULL_RADIUS = 480;
const PICKUP_PULL_SPEED = 280;
const PICKUP_VACUUM_SPEED = 800;

export function updateEconomy(state, dt) {
  if (state.gameStatus !== 'playing') return;

  // Extractor income
  let totalIncome = 0;
  for (const bldg of state.buildings) {
    if (bldg.type !== 'extractor') continue;
    const body = state.bodies.find(b => b.id === bldg.bodyId);
    const income = EXTRACTOR_BASE_INCOME * (body ? body.radius : 8) * dt;
    totalIncome += income;
  }
  state.wallet += totalIncome;
  state.incomePerSec = totalIncome / dt;

  // Update wreck cooldowns
  for (let i = state.wrecks.length - 1; i >= 0; i--) {
    state.wrecks[i].timer -= dt;
    if (state.wrecks[i].timer <= 0) state.wrecks.splice(i, 1);
  }

  // Move building positions to track their host body
  for (const bldg of state.buildings) {
    const body = state.bodies.find(b => b.id === bldg.bodyId);
    if (body) { bldg.x = body.x; bldg.y = body.y; }
  }

  // Pickup collection: all players and fleet auto-collect; nearest player pulls
  const playerShips = state.players ? Object.values(state.players) : (state.playerShip ? [state.playerShip] : []);
  const collectors = [...playerShips, ...state.fleet];
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];

    // Pull toward nearest player ship; vacuum mode ignores radius and uses constant speed
    let nearestPlayer = null, nearestDist = Infinity;
    for (const ps of playerShips) {
      const d = Math.hypot(ps.x - pk.x, ps.y - pk.y);
      if (d < nearestDist) { nearestDist = d; nearestPlayer = ps; }
    }
    if (nearestPlayer && nearestDist > 0) {
      const pdx = nearestPlayer.x - pk.x;
      const pdy = nearestPlayer.y - pk.y;
      if (pk.vacuum) {
        const step = Math.min(PICKUP_VACUUM_SPEED * dt, nearestDist);
        pk.x += (pdx / nearestDist) * step;
        pk.y += (pdy / nearestDist) * step;
      } else if (nearestDist < PICKUP_PULL_RADIUS) {
        const t = 1 - nearestDist / PICKUP_PULL_RADIUS;
        const easedSpeed = PICKUP_PULL_SPEED * (t * t);
        const step = Math.min(easedSpeed * dt, nearestDist);
        pk.x += (pdx / nearestDist) * step;
        pk.y += (pdy / nearestDist) * step;
      }
    }

    let collected = false;
    for (const c of collectors) {
      if (Math.hypot(c.x - pk.x, c.y - pk.y) < PICKUP_COLLECT_RADIUS) {
        state.wallet += pk.value;
        collected = true;
        break;
      }
    }
    if (collected) state.pickups.splice(i, 1);
  }

  // Shipyard fleet replenishment — serial per yard (one frigate at a time), costs FLEET_COST
  for (const bldg of state.buildings) {
    if (bldg.type !== 'shipyard') continue;

    const slotIdx = bldg.slots.findIndex(s => !s.occupied);
    if (slotIdx === -1) continue;

    if (bldg.respawnTimer > 0) {
      bldg.respawnTimer = Math.max(0, bldg.respawnTimer - dt);
    }
    if (bldg.respawnTimer > 0) continue;

    if (state.fleet.length >= state.fleetCap) continue;
    if (state.wallet < FLEET_COST) continue;

    state.wallet -= FLEET_COST;
    spawnFrigate(state, bldg, slotIdx);
    bldg.slots[slotIdx].occupied = true;
    bldg.respawnTimer = SHIPYARD_RESPAWN_TIME;
  }

  // Update FX
  for (let i = state.fx.length - 1; i >= 0; i--) {
    const fx = state.fx[i];
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
    fx.vx *= 0.92;
    fx.vy *= 0.92;
    fx.ttl -= dt;
    if (fx.ttl <= 0) state.fx.splice(i, 1);
  }
}

function spawnFrigate(state, shipyard, slotIndex) {
  if (state.fleet.length >= state.fleetCap) return false;
  const id = nextId(state);
  const frigate = createFleetShip(id, slotIndex, shipyard.id, shipyard.x + (Math.random() - 0.5) * 30, shipyard.y + (Math.random() - 0.5) * 30);
  state.fleet.push(frigate);
  return true;
}
