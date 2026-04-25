import { BUILDING_LABEL, BUILDING_COST } from '../world/bodies.js';

const TOTAL_WAVES = 6;

export function createHud(container) {
  container.innerHTML = `
    <div id="hud-wallet" class="hud-panel">
      <div id="hud-credits">CREDITS: 100</div>
      <div id="hud-income" style="color:var(--gold);font-size:10px;margin-top:2px">+0.0/s</div>
    </div>

    <div id="hud-wave" class="hud-panel">WAVE 0/6 — PREPARE</div>

    <div id="hud-fleet" class="hud-panel">FLEET 0/0</div>

    <div id="hud-hp" class="hud-panel">
      <div>HULL</div>
      <div id="hud-hp-bar-bg"><div id="hud-hp-bar-fill"></div></div>
    </div>

    <div id="hud-build-prompt" class="hud-panel"></div>

    <div id="hud-modal-gameover" class="hud-modal">
      <h1>SHIP DESTROYED</h1>
      <p>THE SYSTEM HAS FALLEN</p>
      <div class="hud-modal-buttons">
        <button class="hud-btn" id="btn-restart-gameover">RESTART</button>
        <button class="hud-btn secondary" id="btn-quit-gameover">QUIT</button>
      </div>
    </div>

    <div id="hud-modal-victory" class="hud-modal">
      <h1>VICTORY</h1>
      <p>THE SYSTEM IS SECURE</p>
      <div class="hud-modal-buttons">
        <button class="hud-btn" id="btn-restart-victory">PLAY AGAIN</button>
        <button class="hud-btn secondary" id="btn-quit-victory">QUIT</button>
      </div>
    </div>

    <div id="hud-modal-pause" class="hud-modal">
      <h1>PAUSED</h1>
      <p>PRESS ESC TO RESUME</p>
      <div class="hud-modal-buttons">
        <button class="hud-btn" id="btn-resume">RESUME</button>
        <button class="hud-btn secondary" id="btn-quit-pause">QUIT</button>
      </div>
    </div>
  `;

  const els = {
    credits: container.querySelector('#hud-credits'),
    income: container.querySelector('#hud-income'),
    wave: container.querySelector('#hud-wave'),
    fleet: container.querySelector('#hud-fleet'),
    hpFill: container.querySelector('#hud-hp-bar-fill'),
    buildPrompt: container.querySelector('#hud-build-prompt'),
    modalGameover: container.querySelector('#hud-modal-gameover'),
    modalVictory: container.querySelector('#hud-modal-victory'),
    modalPause: container.querySelector('#hud-modal-pause'),
  };

  return els;
}

export function updateHud(hud, state, camera, onRestart, onQuit, onResume) {
  // Wire up button listeners once (idempotent via flag)
  if (!hud._listenersAttached) {
    hud._listenersAttached = true;
    document.getElementById('btn-restart-gameover')?.addEventListener('click', onRestart);
    document.getElementById('btn-quit-gameover')?.addEventListener('click', onQuit);
    document.getElementById('btn-restart-victory')?.addEventListener('click', onRestart);
    document.getElementById('btn-quit-victory')?.addEventListener('click', onQuit);
    document.getElementById('btn-resume')?.addEventListener('click', onResume);
    document.getElementById('btn-quit-pause')?.addEventListener('click', onQuit);
  }

  // Modals
  hud.modalGameover.classList.toggle('visible', state.gameStatus === 'gameover');
  hud.modalVictory.classList.toggle('visible', state.gameStatus === 'victory');
  hud.modalPause.classList.toggle('visible', state.gameStatus === 'paused');

  // Wallet
  const credits = Math.floor(state.wallet);
  hud.credits.textContent = `CREDITS: ${credits}`;
  const ips = Math.max(0, state.incomePerSec).toFixed(1);
  hud.income.textContent = `+${ips}/s`;

  // Wave banner
  const wave = state.waveIndex;
  if (state.wavePhase === 'buildup' && wave < TOTAL_WAVES) {
    const secs = Math.ceil(state.waveTimer);
    hud.wave.textContent = `WAVE ${wave + 1}/${TOTAL_WAVES} — T-${secs}s`;
  } else if (state.wavePhase === 'combat') {
    hud.wave.textContent = `WAVE ${wave}/${TOTAL_WAVES} — COMBAT`;
  } else if (wave === 0 && state.wavePhase === 'buildup') {
    hud.wave.textContent = `PREPARE — T-${Math.ceil(state.waveTimer)}s`;
  } else {
    hud.wave.textContent = `WAVE ${wave}/${TOTAL_WAVES}`;
  }

  // Fleet counter
  hud.fleet.textContent = `FLEET ${state.fleet.length}/${state.fleetCap}`;

  // HP bar
  const ship = state.playerShip;
  const pct = ship ? Math.max(0, ship.hp / ship.maxHp) : 0;
  hud.hpFill.style.width = `${Math.round(pct * 100)}%`;
  hud.hpFill.style.background = pct > 0.5 ? 'var(--accent)' : pct > 0.25 ? 'var(--gold)' : 'var(--danger)';

  // Build prompt
  if (state.buildBodyId && ship && state.gameStatus === 'playing') {
    const label = BUILDING_LABEL[state.buildType] || state.buildType;
    const cost = state.buildCost;
    const affordable = state.buildAffordable;
    const screen = camera.worldToScreen(ship.x, ship.y - 52);
    hud.buildPrompt.style.display = 'block';
    hud.buildPrompt.style.transform = `translate(calc(${screen.x}px - 50%), ${screen.y}px)`;
    hud.buildPrompt.className = `hud-panel ${affordable ? 'affordable' : 'unaffordable'}`;
    hud.buildPrompt.textContent = affordable
      ? `HOLD SPACE — ${label} (${cost}¢)`
      : `${label} (${cost}¢) — INSUFFICIENT FUNDS`;
  } else {
    hud.buildPrompt.style.display = 'none';
  }
}
