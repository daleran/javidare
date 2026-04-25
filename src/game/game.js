import { createState, nextId } from './state.js';
import { createLoop } from './loop.js';
import { createCamera } from '../render/camera.js';
import { createRenderer } from '../render/renderer.js';
import { createInput } from '../systems/input.js';
import { createHud, updateHud } from '../ui/hud.js';
import { initBodies, updateOrbits } from '../world/solarSystem.js';
import { createPlayerShip } from '../entities/playerShip.js';
import { createBuilding } from '../entities/building.js';
import { updateMovement } from '../systems/movement.js';
import { updateCombat } from '../systems/combat.js';
import { updateBuild } from '../systems/build.js';
import { updateEconomy } from '../systems/economy.js';
import { updateWaves } from '../systems/waves.js';
import { BUILDING_FOR_BODY, BUILDING_COST } from '../world/bodies.js';

const BUILD_DURATION = 1.0; // matches build.js BUILD_DURATION

export function createGame(canvas, hudContainer, net = null) {
  const camera = createCamera(canvas);
  const input = createInput(canvas);
  const { render } = createRenderer(canvas);

  let state = null;
  let hud = null;

  // ─── Initialization ──────────────────────────────────────────────────────

  function initState() {
    state = createState();

    // Build solar system
    state.bodies = initBodies();

    // Spawn player near home planet
    const home = state.bodies.find(b => b.isHome);
    state.playerShip = createPlayerShip(home.x + home.radius + 24, home.y);
    camera.x = state.playerShip.x;
    camera.y = state.playerShip.y;

    // Pre-built extractor on home planet for seed income.
    // (Note: home is rocky, which doesn't normally take an extractor — but the
    // pre-build is purely for starting income, so we slot it directly.)
    const extId = nextId(state);
    const extractor = createBuilding(extId, 'extractor', home.id, home.x, home.y);
    state.buildings.push(extractor);
    home.buildings.push({ type: 'extractor', id: extId });

    // Build-system transient fields
    state.buildPhase = 'idle';
    state.buildProgress = 0;
    state.buildBodyId = null;
    state.buildCost = 0;
    state.buildType = null;
    state.buildAffordable = false;
  }

  function init() {
    initState();
    hud = createHud(hudContainer);

    if (net) {
      // net is already connected by the lobby — just wire up the tick handler
      net.onTick((delta) => net.applyTick(delta, state));
    }
  }

  // ─── Game lifecycle ───────────────────────────────────────────────────────

  function restart() {
    initState();
    // HUD DOM and its button listeners persist — closures over `state` ref pick up new state automatically
  }

  function quit() {
    window.location.reload();
  }

  function resume() {
    if (state.gameStatus === 'paused') state.gameStatus = 'playing';
  }

  // ─── Update (fixed timestep) ──────────────────────────────────────────────

  function update(dt) {
    // Pause toggle (runs even when paused so the key works)
    if (input.wasPressed('Escape')) {
      if (state.gameStatus === 'playing') state.gameStatus = 'paused';
      else if (state.gameStatus === 'paused') state.gameStatus = 'playing';
    }

    if (state.gameStatus !== 'playing') {
      input.flush();
      return;
    }

    camera.applyScroll(input.mouse.scrollDelta);

    if (net) {
      updateMultiplayer(dt);
    } else {
      updateOrbits(state.bodies, dt);
      updateMovement(state, input, dt);
      updateBuild(state, input, dt, performance.now() / 1000);
      updateCombat(state, dt);
      updateEconomy(state, dt);
      updateWaves(state, dt);
    }

    input.flush();
  }

  // Multiplayer update: predict local movement, send inputs, manage build UI
  function updateMultiplayer(dt) {
    updateOrbits(state.bodies, dt);

    // Predict local player movement at full 60 Hz — skip if ship is destroyed
    if (state.playerShip) updateMovement(state, input, dt);

    if (net.isOpen()) {
      const pressed = {};
      for (const code of ['Space', 'Tab', 'Digit1', 'Digit2']) {
        if (input.wasPressed(code)) pressed[code] = true;
      }
      net.sendInput({ ...input.keys }, pressed);
    }

    updateBuildProgressUI(dt);
  }

  function updateBuildProgressUI(dt) {
    const ship = state.playerShip;
    if (!ship) return;

    let overlappingBody = null;
    let bestDist = Infinity;
    for (const body of state.bodies) {
      if (body.type === 'sun') continue;
      const dist = Math.hypot(ship.x - body.x, ship.y - body.y);
      if (dist <= body.radius + 52 && dist < bestDist) {
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
        if (state.buildType && net.isOpen()) {
          net.sendBuildRequest(state.buildBodyId, state.buildType);
        }
        state.buildPhase = 'idle';
        state.buildProgress = 0;
        state.buildBodyId = null;
      }
      return;
    }

    state.buildBodyId = null;
    state.buildProgress = 0;
    state.buildType = null;
    state.buildOptions = null;

    if (!overlappingBody) { state.buildOptionIndex = 0; return; }

    const body = overlappingBody;
    const now = performance.now() / 1000;
    const allowed = getAvailableTypes(body, now);
    if (allowed.length === 0) return;

    if (input.wasPressed('Digit1')) state.buildOptionIndex = 0;
    if (input.wasPressed('Digit2') && allowed.length > 1) state.buildOptionIndex = 1;
    if (input.wasPressed('Tab')) state.buildOptionIndex = ((state.buildOptionIndex || 0) + 1);

    const idx = (((state.buildOptionIndex || 0) % allowed.length) + allowed.length) % allowed.length;
    const buildingType = allowed[idx];
    state.buildBodyId = body.id;
    state.buildType = buildingType;
    state.buildOptions = allowed;
    state.buildOptionIdx = idx;
    state.buildCost = BUILDING_COST[buildingType];
    state.buildAffordable = state.wallet >= state.buildCost;

    if (spaceHeld && state.buildAffordable) {
      state.buildPhase = 'holding';
      state.buildProgress = dt / BUILD_DURATION;
    }
  }

  function getAvailableTypes(body, now) {
    const allowed = BUILDING_FOR_BODY[body.type] || [];
    return allowed.filter(t => {
      if (body.buildings.find(b => b.type === t)) return false;
      const cd = (body.cooldowns && body.cooldowns[t]) || 0;
      return now >= cd;
    });
  }

  // ─── Render (rAF, passes alpha for future interpolation) ─────────────────

  function renderFrame() {
    if (state.playerShip) camera.follow(state.playerShip);
    render(state, camera);
    if (hud) updateHud(hud, state, camera, restart, quit, resume);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  const loop = createLoop(update, renderFrame);

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyR') restart();
  });

  return {
    start() {
      init();
      loop.start();
    },
  };
}
