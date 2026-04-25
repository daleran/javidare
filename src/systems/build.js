import { BUILDING_FOR_BODY, BUILDING_COST } from '../world/bodies.js';
import { createBuilding } from '../entities/building.js';
import { nextId } from '../game/state.js';

const BUILD_DURATION = 1.0;  // seconds to hold Space
const BUILD_OVERLAP  = 18;   // extra pixels beyond body radius to trigger build zone

export function updateBuild(state, input, dt, now) {
  if (state.gameStatus !== 'playing') {
    state.buildPhase = 'idle';
    return;
  }

  const ship = state.playerShip;

  // Find which body the ship is overlapping
  let overlappingBody = null;
  for (const body of state.bodies) {
    if (body.type === 'sun') continue;
    const dist = Math.hypot(ship.x - body.x, ship.y - body.y);
    if (dist <= body.radius + 12 + BUILD_OVERLAP) {
      overlappingBody = body;
      break;
    }
  }

  const spaceHeld = input.keys['Space'];

  if (state.buildPhase === 'holding') {
    // Check cancellation conditions
    const stillOnBody = overlappingBody && overlappingBody.id === state.buildBodyId;
    if (!spaceHeld || !stillOnBody) {
      state.buildPhase = 'idle';
      state.buildProgress = 0;
      state.buildBodyId = null;
      return;
    }
    // Advance progress
    state.buildProgress += dt / BUILD_DURATION;
    if (state.buildProgress >= 1) {
      completeBuild(state, now);
    }
  } else {
    // IDLE phase — check if we should start holding
    state.buildBodyId = null;
    state.buildProgress = 0;

    if (!overlappingBody) return;
    const body = overlappingBody;
    if (body.building !== null) return;
    if (now < (body.buildableAt || 0)) return;
    const buildingType = BUILDING_FOR_BODY[body.type];
    if (!buildingType) return;
    const cost = BUILDING_COST[buildingType];

    // Store for HUD
    state.buildBodyId = body.id;
    state.buildCost = cost;
    state.buildType = buildingType;
    state.buildAffordable = state.wallet >= cost;

    if (spaceHeld && state.wallet >= cost) {
      state.buildPhase = 'holding';
      state.buildProgress = dt / BUILD_DURATION; // count this tick
    }
  }
}

function completeBuild(state, now) {
  const body = state.bodies.find(b => b.id === state.buildBodyId);
  if (!body) { state.buildPhase = 'idle'; return; }

  const buildingType = BUILDING_FOR_BODY[body.type];
  const cost = BUILDING_COST[buildingType];
  if (state.wallet < cost) { state.buildPhase = 'idle'; return; }

  state.wallet -= cost;

  const id = nextId(state);
  const building = createBuilding(id, buildingType, body.id, body.x, body.y);
  state.buildings.push(building);
  body.building = id;

  if (buildingType === 'shipyard') {
    state.shipyardCount++;
    state.fleetCap = state.shipyardCount * 4;
    // Initialize all slots as needing to spawn
    for (const slot of building.slots) {
      slot.respawnTimer = 2; // short delay before first frigate
    }
  }

  state.buildPhase = 'idle';
  state.buildProgress = 0;
  state.buildBodyId = null;
}
