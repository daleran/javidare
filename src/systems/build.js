import { BUILDING_FOR_BODY, BUILDING_COST } from '../world/bodies.js';
import { createBuilding } from '../entities/building.js';
import { nextId } from '../game/state.js';

const BUILD_DURATION = 1.0;  // seconds to hold Space
const BUILD_OVERLAP  = 40;   // extra pixels beyond body radius to trigger build zone

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

  // overlappingBody: closest body in range (used to cancel holds when player drifts away)
  // buildTarget: closest body in range that actually has options (used for idle-phase prompt)
  let overlappingBody = null;
  let buildTarget = null;
  let bestDist = Infinity;
  let bestBuildDist = Infinity;
  for (const body of state.bodies) {
    if (body.type === 'sun') continue;
    const dist = Math.hypot(ship.x - body.x, ship.y - body.y);
    if (dist <= body.radius + 12 + BUILD_OVERLAP) {
      if (dist < bestDist) { overlappingBody = body; bestDist = dist; }
      const opts = availableTypes(body, now);
      if (opts.length > 0 && dist < bestBuildDist) { buildTarget = body; bestBuildDist = dist; }
    }
  }

  const spaceHeld = input.keys['Space'];

  if (state.buildPhase === 'holding') {
    const buildBody = state.bodies.find(b => b.id === state.buildBodyId);
    const stillInRange = buildBody && Math.hypot(ship.x - buildBody.x, ship.y - buildBody.y) <= buildBody.radius + 12 + BUILD_OVERLAP;
    if (!spaceHeld || !stillInRange) {
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

  if (!buildTarget) {
    state.buildOptionIndex = 0;
    return;
  }
  const body = buildTarget;
  const options = availableTypes(body, now);

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
    building.respawnTimer = 2;
  }

  state.buildPhase = 'idle';
  state.buildProgress = 0;
  state.buildBodyId = null;
  state.buildType = null;
  state.buildOptions = null;

  // Pre-populate next build target so there's no one-frame gap that causes prompt flicker
  const ship = state.playerShip;
  let nextBody = null;
  let bestNextDist = Infinity;
  for (const b of state.bodies) {
    if (b.type === 'sun') continue;
    const dist = Math.hypot(ship.x - b.x, ship.y - b.y);
    if (dist <= b.radius + 12 + BUILD_OVERLAP) {
      const opts = availableTypes(b, now);
      if (opts.length > 0 && dist < bestNextDist) { nextBody = b; bestNextDist = dist; }
    }
  }
  if (nextBody) {
    const options = availableTypes(nextBody, now);
    const idx = (((state.buildOptionIndex || 0) % options.length) + options.length) % options.length;
    const buildingType = options[idx];
    state.buildBodyId = nextBody.id;
    state.buildCost = BUILDING_COST[buildingType];
    state.buildType = buildingType;
    state.buildOptions = options;
    state.buildOptionIdx = idx;
    state.buildAffordable = state.wallet >= BUILDING_COST[buildingType];
  }
}
