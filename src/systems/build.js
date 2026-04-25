import { BUILDING_FOR_BODY, BUILDING_COST } from '../world/bodies.js';
import { createBuilding } from '../entities/building.js';
import { nextId } from '../game/state.js';

const BUILD_DURATION = 1.0;  // seconds to hold Space
const BUILD_OVERLAP  = 18;   // extra pixels beyond body radius to trigger build zone

function availableTypes(body, now) {
  const allowed = BUILDING_FOR_BODY[body.type] || [];
  return allowed.filter(t => {
    if (body.buildings.find(b => b.type === t)) return false;
    const cd = (body.cooldowns && body.cooldowns[t]) || 0;
    if (now < cd) return false;
    return true;
  });
}

export function updateBuild(state, input, dt, now) {
  if (state.gameStatus !== 'playing') {
    state.buildPhase = 'idle';
    return;
  }

  const ship = state.playerShip;

  // Find the closest body the ship is overlapping (multiple bodies can be near)
  let overlappingBody = null;
  let bestDist = Infinity;
  for (const body of state.bodies) {
    if (body.type === 'sun') continue;
    const dist = Math.hypot(ship.x - body.x, ship.y - body.y);
    if (dist <= body.radius + 12 + BUILD_OVERLAP && dist < bestDist) {
      overlappingBody = body;
      bestDist = dist;
    }
  }

  const spaceHeld = input.keys['Space'];

  if (state.buildPhase === 'holding') {
    const stillOnBody = overlappingBody && overlappingBody.id === state.buildBodyId;
    if (!spaceHeld || !stillOnBody) {
      state.buildPhase = 'idle';
      state.buildProgress = 0;
      state.buildBodyId = null;
      return;
    }
    state.buildProgress += dt / BUILD_DURATION;
    if (state.buildProgress >= 1) {
      completeBuild(state, now);
    }
    return;
  }

  // IDLE phase
  state.buildBodyId = null;
  state.buildProgress = 0;
  state.buildType = null;
  state.buildOptions = null;

  if (!overlappingBody) {
    state.buildOptionIndex = 0;
    return;
  }
  const body = overlappingBody;
  const options = availableTypes(body, now);
  if (options.length === 0) return;

  // Cycle option index when the player presses 1/2 or Tab
  if (input.wasPressed && input.wasPressed('Digit1')) state.buildOptionIndex = 0;
  if (input.wasPressed && input.wasPressed('Digit2') && options.length > 1) state.buildOptionIndex = 1;
  if (input.wasPressed && input.wasPressed('Tab')) state.buildOptionIndex = ((state.buildOptionIndex || 0) + 1);

  const idx = (((state.buildOptionIndex || 0) % options.length) + options.length) % options.length;
  const buildingType = options[idx];
  const cost = BUILDING_COST[buildingType];

  state.buildBodyId = body.id;
  state.buildCost = cost;
  state.buildType = buildingType;
  state.buildOptions = options;
  state.buildOptionIdx = idx;
  state.buildAffordable = state.wallet >= cost;

  if (spaceHeld && state.wallet >= cost) {
    state.buildPhase = 'holding';
    state.buildProgress = dt / BUILD_DURATION;
  }
}

function completeBuild(state, now) {
  const body = state.bodies.find(b => b.id === state.buildBodyId);
  if (!body) { state.buildPhase = 'idle'; return; }

  const buildingType = state.buildType;
  if (!buildingType) { state.buildPhase = 'idle'; return; }

  const allowed = (BUILDING_FOR_BODY[body.type] || []).includes(buildingType);
  const alreadyBuilt = body.buildings.find(b => b.type === buildingType);
  if (!allowed || alreadyBuilt) { state.buildPhase = 'idle'; return; }

  const cost = BUILDING_COST[buildingType];
  if (state.wallet < cost) { state.buildPhase = 'idle'; return; }

  state.wallet -= cost;

  const id = nextId(state);
  const building = createBuilding(id, buildingType, body.id, body.x, body.y);
  state.buildings.push(building);
  body.buildings.push({ type: buildingType, id });

  if (buildingType === 'shipyard') {
    state.shipyardCount++;
    state.fleetCap = state.shipyardCount * 4;
    for (const slot of building.slots) {
      slot.respawnTimer = 2; // short delay before first frigate
    }
  }

  state.buildPhase = 'idle';
  state.buildProgress = 0;
  state.buildBodyId = null;
}
