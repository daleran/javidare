import { EXTRACTOR_BASE_INCOME } from '../entities/building.js';
import { createFleetShip } from '../entities/fleetShip.js';
import { nextId } from '../game/state.js';

const PICKUP_COLLECT_RADIUS = 50;

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

  // Pickup collection: player or any frigate nearby auto-collects
  const collectors = [state.playerShip, ...state.fleet];
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.ttl -= dt;
    if (pk.ttl <= 0) { state.pickups.splice(i, 1); continue; }
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

  // Shipyard fleet replenishment
  for (const bldg of state.buildings) {
    if (bldg.type !== 'shipyard') continue;
    for (let si = 0; si < bldg.slots.length; si++) {
      const slot = bldg.slots[si];
      if (slot.occupied) continue;
      slot.respawnTimer -= dt;
      if (slot.respawnTimer <= 0) {
        const spawned = spawnFrigate(state, bldg, si);
        if (spawned) {
          slot.occupied = true;
        } else {
          slot.respawnTimer = 2; // retry after 2s if fleet is at cap
        }
      }
    }
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
