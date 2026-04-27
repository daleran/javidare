import { createState } from './state.js';
import { createLoop } from './loop.js';
import { createCamera } from '../render/camera.js';
import { createRenderer } from '../render/renderer.js';
import { createInput } from '../systems/input.js';
import { createHud, updateHud } from '../ui/hud.js';
import { initBodies, initWarpGates, updateOrbits } from '../world/solarSystem.js';
import { createStation } from '../entities/station.js';
import { updateStation, updateTransportMovement } from '../systems/movement.js';
import { updateTransports, requestTransportBuild } from '../systems/transports.js';
import { updateCombat } from '../systems/combat.js';
import { updateEconomy } from '../systems/economy.js';
import { updateWaves } from '../systems/waves.js';
import { updateSelection } from '../systems/selection.js';
import { attemptBuild } from '../systems/build.js';
import { purchaseUpgrade } from '../systems/upgrades.js';

export function createGame(canvas, hudContainer) {
  const camera = createCamera(canvas);
  const input = createInput(canvas);
  const { render } = createRenderer(canvas);

  let state = null;
  let hud = null;

  // ─── Initialization ──────────────────────────────────────────────────────

  function initState() {
    state = createState();
    state.bodies = initBodies();
    state.warpGates = initWarpGates();

    // Station always orbits the sun; start near the home planet
    const home = state.bodies.find(b => b.isHome);
    const stationOrbitRadius = home.orbitRadius + 80;
    const stationAngle = home.phase;
    state.station = createStation(stationOrbitRadius, stationAngle);
    state.station.x = Math.cos(stationAngle) * stationOrbitRadius;
    state.station.y = Math.sin(stationAngle) * stationOrbitRadius;

    // Starting resources
    state.resources.metal = 100;
    state.resources.fuel  = 50;

    // Center camera on station with no pan offset
    camera.panOffsetX = 0;
    camera.panOffsetY = 0;
    camera.x = state.station.x;
    camera.y = state.station.y;
  }

  function init() {
    initState();
    hud = createHud(hudContainer, onBuild, onUpgrade, onBuildTransport);
  }

  // ─── Callbacks ────────────────────────────────────────────────────────────

  function onBuild(type) {
    const sel = state.selection;
    if (sel.kind !== 'body' || sel.slotIndex == null) return;
    attemptBuild(state, sel.id, sel.slotIndex, type, performance.now() / 1000);
  }

  function onUpgrade(key) {
    purchaseUpgrade(state, key);
  }

  function onBuildTransport() {
    requestTransportBuild(state);
  }

  // ─── Game lifecycle ───────────────────────────────────────────────────────

  function restart() {
    initState();
  }

  function quit() {
    window.location.reload();
  }

  function resume() {
    if (state.gameStatus === 'paused') state.gameStatus = 'playing';
  }

  // ─── Update (fixed timestep) ──────────────────────────────────────────────

  function update(dt) {
    if (input.wasPressed('Escape')) {
      if (state.gameStatus === 'playing') state.gameStatus = 'paused';
      else if (state.gameStatus === 'paused') state.gameStatus = 'playing';
    }

    if (input.wasPressed('KeyR') && state.gameStatus === 'gameover') restart();

    if (state.gameStatus !== 'playing') {
      input.flush();
      return;
    }

    // Camera: WASD pan, Q/E and wheel zoom
    camera.applyScroll(input.mouse.scrollDelta);
    if (input.wasPressed('KeyQ') || input.wasPressed('Equal')) camera.zoom = Math.min(2.5, camera.zoom * 1.15);
    if (input.wasPressed('KeyE') || input.wasPressed('Minus')) camera.zoom = Math.max(0.3, camera.zoom / 1.15);

    const panX = (input.keys['KeyD'] ? 1 : 0) - (input.keys['KeyA'] ? 1 : 0);
    const panY = (input.keys['KeyS'] ? 1 : 0) - (input.keys['KeyW'] ? 1 : 0);
    if (panX !== 0 || panY !== 0) camera.pan(panX, panY, dt);
    camera.followStation(state.station);

    // Update mouse world position before selection
    input.updateMouseWorld(camera);

    // System tick order
    updateOrbits(state.bodies, dt);
    updateStation(state, dt);
    updateTransports(state, dt);
    updateTransportMovement(state, dt);
    updateCombat(state, dt);
    updateEconomy(state, dt);
    updateWaves(state, dt);
    updateSelection(state, input);

    input.flush();
  }

  // ─── Render (rAF, passes alpha for future interpolation) ─────────────────

  function renderFrame() {
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
