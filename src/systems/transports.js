import {
  TRANSPORT_INTERACT_RADIUS, TRANSPORT_CARGO_CAP,
  TRANSPORT_BUILD_COST_METAL, TRANSPORT_BUILD_COST_FUEL, TRANSPORT_BUILD_TIME,
} from '../entities/transportShip.js';
import {
  EXTRACTOR_HAUL_THRESHOLD,
  RAILGUN_REFILL_THRESHOLD, RAILGUN_AMMO_BUFFER,
  MISSILE_REFILL_THRESHOLD, MISSILE_AMMO_BUFFER,
  MISSILE_REFILL_METAL, MISSILE_REFILL_FUEL,
} from '../entities/building.js';
import { createTransportShip } from '../entities/transportShip.js';
import { nextId } from '../game/state.js';

export function updateTransports(state, dt) {
  if (state.gameStatus !== 'playing') return;

  const bodyById = {};
  for (const b of state.bodies) bodyById[b.id] = b;

  // Assign jobs to idle ships
  for (const ship of state.transportShips) {
    if (ship.state === 'idle') assignJob(state, ship, bodyById);
  }

  // Refresh live target positions (orbits move). Idle ships stay docked at station.
  for (const ship of state.transportShips) {
    if (ship.state === 'idle' || ship.state === 'toStation') {
      ship.targetX = state.station.x;
      ship.targetY = state.station.y;
    } else if (ship.jobTargetId) {
      if (ship.jobKind === 'collect') {
        const pk = state.pickups.find(p => p.id === ship.jobTargetId);
        if (pk) { ship.targetX = pk.x; ship.targetY = pk.y; }
      } else {
        const bldg = state.buildings.find(b => b.id === ship.jobTargetId);
        if (bldg) { ship.targetX = bldg.x; ship.targetY = bldg.y; }
      }
    }

    // Arrival check only applies to dispatched ships
    if (ship.state !== 'idle') {
      const dist = Math.hypot(ship.x - ship.targetX, ship.y - ship.targetY);
      if (dist < TRANSPORT_INTERACT_RADIUS) {
        handleArrival(state, ship);
      }
    }
  }

  // Tick any in-progress transport build (build is initiated manually via HUD)
  tickTransportBuild(state, dt);
}

function assignJob(state, ship, bodyById) {
  let best = null;
  let bestDist = Infinity;

  // Priority 1: extractor with unclaimed buffer ready for hauling
  for (const bldg of state.buildings) {
    if (bldg.type !== 'metalExtractor' && bldg.type !== 'waterExtractor') continue;
    if (bldg.buffer < EXTRACTOR_HAUL_THRESHOLD) continue;
    if (bldg.claimed) continue;
    const body = bodyById[bldg.bodyId];
    if (!body) continue;
    const d = Math.hypot(ship.x - body.x, ship.y - body.y);
    if (d < bestDist) { bestDist = d; best = { kind: 'pickup', bldg }; }
  }

  // Priority 2: railgun turret needing ammo refill
  if (!best) {
    for (const bldg of state.buildings) {
      if (bldg.type !== 'railgunTurret') continue;
      if (bldg.ammo >= RAILGUN_REFILL_THRESHOLD) continue;
      if (bldg.refillClaimed) continue;
      const ammoNeeded = Math.min(RAILGUN_AMMO_BUFFER - bldg.ammo, 15);
      if (state.resources.metal < ammoNeeded) continue;
      const body = bodyById[bldg.bodyId];
      if (!body) continue;
      const d = Math.hypot(ship.x - body.x, ship.y - body.y);
      if (d < bestDist) { bestDist = d; best = { kind: 'refill', bldg, ammoNeeded, ammoFuel: 0 }; }
    }
  }

  // Priority 3: missile turret needing ammo refill (requires metal + fuel)
  if (!best) {
    for (const bldg of state.buildings) {
      if (bldg.type !== 'missileTurret') continue;
      if (bldg.ammo >= MISSILE_REFILL_THRESHOLD) continue;
      if (bldg.refillClaimed) continue;
      if (state.resources.metal < MISSILE_REFILL_METAL) continue;
      if (state.resources.fuel  < MISSILE_REFILL_FUEL)  continue;
      const body = bodyById[bldg.bodyId];
      if (!body) continue;
      const d = Math.hypot(ship.x - body.x, ship.y - body.y);
      if (d < bestDist) {
        bestDist = d;
        best = {
          kind: 'refill', bldg,
          ammoNeeded: Math.min(MISSILE_AMMO_BUFFER - bldg.ammo, 4),
          ammoFuel: MISSILE_REFILL_FUEL,
          isMissile: true,
        };
      }
    }
  }

  // Priority 4: loose enemy-drop pickups
  if (!best) {
    for (const pk of state.pickups) {
      if (pk.claimed) continue;
      const d = Math.hypot(ship.x - pk.x, ship.y - pk.y);
      if (d < bestDist) { bestDist = d; best = { kind: 'collect', pk }; }
    }
  }

  if (!best) return;

  // Pickup collection has no associated building — handle before the body lookup
  if (best.kind === 'collect') {
    best.pk.claimed = true;
    best.pk.claimedBy = ship.id;
    ship.state = 'toSource';
    ship.jobKind = 'collect';
    ship.jobTargetId = best.pk.id;
    ship.targetX = best.pk.x;
    ship.targetY = best.pk.y;
    return;
  }

  const body = bodyById[best.bldg.bodyId];
  if (!body) return;

  if (best.kind === 'pickup') {
    best.bldg.claimed = true;
    best.bldg.claimedBy = ship.id;
    ship.state = 'toSource';
    ship.jobKind = 'pickup';
    ship.jobTargetId = best.bldg.id;
    ship.targetX = body.x;
    ship.targetY = body.y;
  } else {
    state.resources.metal -= best.ammoNeeded;
    if (best.isMissile) state.resources.fuel -= best.ammoFuel;
    best.bldg.refillClaimed = true;
    best.bldg.refillClaimedBy = ship.id;
    ship.state = 'toTurret';
    ship.jobKind = 'refill';
    ship.jobTargetId = best.bldg.id;
    ship.cargoKind = 'metal';
    ship.cargoAmount = best.ammoNeeded;
    ship.targetX = body.x;
    ship.targetY = body.y;
  }
}

function handleArrival(state, ship) {
  if (ship.state === 'toSource') {
    if (ship.jobKind === 'collect') {
      // Pickup collection — grab the drop and return to station
      const pkIdx = state.pickups.findIndex(p => p.id === ship.jobTargetId);
      if (pkIdx !== -1) {
        const pk = state.pickups[pkIdx];
        ship.cargoKind   = pk.kind;
        ship.cargoAmount = Math.min(pk.amount, TRANSPORT_CARGO_CAP);
        state.pickups.splice(pkIdx, 1);
      }
    } else {
      const bldg = state.buildings.find(b => b.id === ship.jobTargetId);
      if (bldg) {
        const amount = Math.min(bldg.buffer, TRANSPORT_CARGO_CAP);
        bldg.buffer -= amount;
        bldg.claimed = false;
        bldg.claimedBy = null;
        ship.cargoKind = bldg.type === 'waterExtractor' ? 'water' : 'metal';
        ship.cargoAmount = amount;
      }
    }
    ship.state = 'toStation';
    ship.jobTargetId = null;

  } else if (ship.state === 'toStation') {
    if (ship.cargoAmount > 0 && ship.cargoKind) {
      // Clamp to cap
      const cap = ship.cargoKind === 'metal' ? state.metalCap
                : ship.cargoKind === 'water'  ? state.waterCap
                : state.fuelCap;
      state.resources[ship.cargoKind] = Math.min(cap, (state.resources[ship.cargoKind] || 0) + ship.cargoAmount);
    }
    ship.cargoKind = null;
    ship.cargoAmount = 0;
    ship.state = 'idle';
    ship.jobKind = null;

  } else if (ship.state === 'toTurret') {
    const bldg = state.buildings.find(b => b.id === ship.jobTargetId);
    if (bldg) {
      bldg.ammo = Math.min(bldg.ammoCap, bldg.ammo + ship.cargoAmount);
      bldg.refillClaimed = false;
      bldg.refillClaimedBy = null;
    }
    ship.cargoKind = null;
    ship.cargoAmount = 0;
    ship.state = 'idle';
    ship.jobKind = null;
    ship.jobTargetId = null;
  }
}

function tickTransportBuild(state, dt) {
  if (!state.pendingTransportBuild) return;
  state.pendingTransportBuild.timer -= dt;
  if (state.pendingTransportBuild.timer <= 0) {
    const id = nextId(state);
    const t = createTransportShip(id, state.station.x, state.station.y);
    state.transportShips.push(t);
    state.pendingTransportBuild = null;
  }
}

export function requestTransportBuild(state) {
  if (state.gameStatus !== 'playing') return false;
  if (state.pendingTransportBuild) return false;
  if (state.transportShips.length >= state.transportCap) return false;
  if (state.resources.metal < TRANSPORT_BUILD_COST_METAL) return false;
  if (state.resources.fuel  < TRANSPORT_BUILD_COST_FUEL)  return false;
  state.resources.metal -= TRANSPORT_BUILD_COST_METAL;
  state.resources.fuel  -= TRANSPORT_BUILD_COST_FUEL;
  state.pendingTransportBuild = { timer: TRANSPORT_BUILD_TIME };
  return true;
}

export function releaseTransportClaims(state, buildingId) {
  for (const ship of state.transportShips) {
    if (ship.jobTargetId !== buildingId) continue;
    if (ship.state === 'toTurret') {
      state.resources.metal = Math.min(state.metalCap, (state.resources.metal || 0) + ship.cargoAmount);
    }
    ship.state = 'idle';
    ship.jobKind = null;
    ship.jobTargetId = null;
    ship.cargoKind = null;
    ship.cargoAmount = 0;
  }
}
