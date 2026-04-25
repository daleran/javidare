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

export function createGame(canvas, hudContainer) {
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
    updateOrbits(state.bodies, dt);
    updateMovement(state, input, dt);
    updateBuild(state, input, dt, performance.now() / 1000);
    updateCombat(state, dt);
    updateEconomy(state, dt);
    updateWaves(state, dt);

    input.flush();
  }

  // ─── Render (rAF, passes alpha for future interpolation) ─────────────────

  function renderFrame() {
    if (state.playerShip) camera.follow(state.playerShip);
    render(state, camera);
    if (hud) updateHud(hud, state, camera, restart, quit, resume);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  const loop = createLoop(update, renderFrame);

  return {
    start() {
      init();
      loop.start();
    },
  };
}
