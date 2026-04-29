import { BUILDING_LABEL, BUILDING_COST } from '../world/bodies.js';
import { play, init as soundInit, getVolume, setVolume } from '../audio/sound.js';

const UPGRADE_DEFS = [
  {
    id: 'hullIntegrity',
    icon: '◆',
    name: 'Hull Integrity',
    desc: '+10% max hull',
    cost: 50,
    maxLevel: Infinity,
  },
  {
    id: 'scanner',
    icon: '⊕',
    name: 'Scanner Improvements',
    desc: '+10% zoom range',
    cost: 30,
    maxLevel: Infinity,
  },
  {
    id: 'turretRefinements',
    icon: '◉',
    name: 'Turret Refinements',
    desc: '+20% fire rate',
    cost: 40,
    maxLevel: 3,
  },
  {
    id: 'mechanic',
    icon: '◎',
    name: 'On-board Mechanic',
    desc: '+2 hull/s regen',
    cost: 100,
    maxLevel: 3,
  },
  {
    id: 'quantumOverdrive',
    icon: '▲',
    name: 'Quantum Overdrive',
    desc: '+20% move speed',
    cost: 50,
    maxLevel: 3,
  },
];

function applyUpgrade(id, state, camera) {
  if (id === 'hullIntegrity' && state.playerShip) {
    state.playerShip.maxHp = Math.round(state.playerShip.maxHp * 1.1);
  } else if (id === 'scanner') {
    camera.zoomMin = Math.max(0.05, camera.zoomMin * 0.9);
  }
  // turretRefinements, mechanic, quantumOverdrive: systems read state.upgrades each tick
}

export function createHud(container, getState, camera) {
  container.innerHTML = `
    <div id="hud-wallet" class="hud-panel">
      <div id="hud-credits">CREDITS: 5</div>
      <div id="hud-income" style="color:var(--gold);font-size:10px;margin-top:2px">+0.0/s</div>
    </div>

    <div id="hud-wave" class="hud-panel">WAVE 1 — PREPARE</div>

    <div id="hud-fleet" class="hud-panel">FLEET 0/0</div>

    <div id="hud-hp" class="hud-panel">
      <div>HULL</div>
      <div id="hud-hp-bar-bg"><div id="hud-hp-bar-fill"></div></div>
    </div>

    <div id="hud-build-prompt" class="hud-panel"></div>

    <button class="hud-btn" id="btn-upgrade-open">UPGRADE <span class="hud-key">Q</span></button>

    <div id="hud-upgrade-panel">
      <div id="hud-upgrade-header">
        <span>UPGRADE TERMINAL</span>
        <button class="hud-btn secondary" id="btn-upgrade-close">&#x2715;</button>
      </div>
      <div id="hud-upgrade-body"></div>
    </div>

    <div id="hud-modal-gameover" class="hud-modal">
      <h1>SHIP DESTROYED</h1>
      <p>THE SYSTEM HAS FALLEN</p>
      <div class="hud-modal-buttons">
        <button class="hud-btn" id="btn-restart-gameover">RESTART</button>
        <button class="hud-btn secondary" id="btn-mainmenu-gameover">MAIN MENU</button>
      </div>
    </div>

    <div id="hud-modal-pause" class="hud-modal">
      <h1>PAUSED</h1>
      <p>PRESS ESC TO RESUME</p>
      <div class="hud-modal-buttons">
        <button class="hud-btn" id="btn-resume">RESUME</button>
        <button class="hud-btn secondary" id="btn-mainmenu-pause">MAIN MENU</button>
      </div>
      <div id="hud-volume-row">
        <label for="hud-volume-slider">VOLUME</label>
        <input type="range" id="hud-volume-slider" min="0" max="1" step="0.01" />
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
    modalPause: container.querySelector('#hud-modal-pause'),
    upgradePanel: container.querySelector('#hud-upgrade-panel'),
    upgradeBody: container.querySelector('#hud-upgrade-body'),
    upgradeBtns: {},
  };

  // Unlock AudioContext and attach hover/click sounds to all hud buttons
  function attachButtonSounds(btn) {
    btn.addEventListener('mouseenter', () => play('button_hover'));
    btn.addEventListener('click', () => { soundInit(); play('button_click'); });
  }
  for (const btn of container.querySelectorAll('.hud-btn')) attachButtonSounds(btn);

  // Volume slider
  const volSlider = container.querySelector('#hud-volume-slider');
  volSlider.value = String(getVolume());
  volSlider.addEventListener('input', () => setVolume(parseFloat(volSlider.value)));

  const btnOpen = container.querySelector('#btn-upgrade-open');
  const btnClose = container.querySelector('#btn-upgrade-close');
  const togglePanel = () => els.upgradePanel.classList.toggle('open');
  btnOpen.addEventListener('click', togglePanel);
  btnClose.addEventListener('click', () => els.upgradePanel.classList.remove('open'));

  const SHORTCUT_KEYS = ['1','2','3','4','5','6','7','8','9','0'];

  for (let i = 0; i < UPGRADE_DEFS.length; i++) {
    const def = UPGRADE_DEFS[i];
    const key = SHORTCUT_KEYS[i] ?? '';
    const btn = document.createElement('button');
    btn.className = 'upgrade-item';
    btn.innerHTML = `
      ${key ? `<span class="upgrade-key">${key}</span>` : ''}
      <span class="upgrade-icon">${def.icon}</span>
      <div class="upgrade-info">
        <div class="upgrade-name">${def.name}</div>
        <div class="upgrade-desc">${def.desc}</div>
      </div>
      <div class="upgrade-right">
        <div class="upgrade-cost">${def.cost}¢</div>
        <div class="upgrade-level"></div>
      </div>
    `;
    btn.addEventListener('click', () => {
      const state = getState();
      if (state.gameStatus !== 'playing') return;
      const level = state.upgrades[def.id];
      if (level >= def.maxLevel) return;
      if (state.wallet < def.cost) return;
      state.wallet -= def.cost;
      state.upgrades[def.id]++;
      applyUpgrade(def.id, state, camera);
      play('upgrade');
    });
    btn.addEventListener('mouseenter', () => play('button_hover'));
    els.upgradeBody.appendChild(btn);
    els.upgradeBtns[def.id] = btn;
  }

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyQ') { togglePanel(); return; }
    if (!els.upgradePanel.classList.contains('open')) return;
    const match = e.code.match(/^Digit(\d)$/);
    if (!match) return;
    const idx = match[1] === '0' ? 9 : parseInt(match[1]) - 1;
    if (idx < UPGRADE_DEFS.length) els.upgradeBtns[UPGRADE_DEFS[idx].id]?.click();
  });

  return els;
}

export function updateHud(hud, state, camera, onRestart, onQuit, onResume) {
  if (!hud._listenersAttached) {
    hud._listenersAttached = true;
    document.getElementById('btn-restart-gameover')?.addEventListener('click', onRestart);
    document.getElementById('btn-mainmenu-gameover')?.addEventListener('click', onQuit);
    document.getElementById('btn-resume')?.addEventListener('click', onResume);
    document.getElementById('btn-mainmenu-pause')?.addEventListener('click', onQuit);
  }

  // Modals
  hud.modalGameover.classList.toggle('visible', state.gameStatus === 'gameover');
  hud.modalPause.classList.toggle('visible', state.gameStatus === 'paused');

  // Wallet
  const credits = Math.floor(state.wallet);
  hud.credits.textContent = `CREDITS: ${credits}`;
  const ips = Math.max(0, state.incomePerSec).toFixed(1);
  hud.income.textContent = `+${ips}/s`;

  // Wave banner
  const wave = state.waveIndex;
  if (state.wavePhase === 'buildup') {
    const secs = Math.ceil(state.waveTimer);
    const nextWave = wave + 1;
    const nextIsBoss = nextWave % 6 === 0;
    const label = nextIsBoss ? `WAVE ${nextWave} — BOSS` : `WAVE ${nextWave}`;
    hud.wave.textContent = wave === 0
      ? `PREPARE — T-${secs}s`
      : `${label} — T-${secs}s`;
  } else if (state.wavePhase === 'combat') {
    const label = state.waveBossWave ? `WAVE ${wave} — BOSS` : `WAVE ${wave}`;
    hud.wave.textContent = `${label} — COMBAT`;
  }

  // Fleet counter
  if (state.fleet.length < state.fleetCap) {
    let next = Infinity;
    for (const b of state.buildings) {
      if (b.type !== 'shipyard') continue;
      if (b.slots.every(s => s.occupied)) continue;
      if (b.respawnTimer < next) next = b.respawnTimer;
    }
    const nextStr = !isFinite(next) ? '' :
      next > 0 ? ` — NEXT ${Math.ceil(next)}s (1¢)` :
      state.wallet < 1 ? ' — NEED 1¢' : ' — NEXT …';
    hud.fleet.textContent = `FLEET ${state.fleet.length}/${state.fleetCap}${nextStr}`;
  } else {
    hud.fleet.textContent = `FLEET ${state.fleet.length}/${state.fleetCap}`;
  }

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

    const options = state.buildOptions || [state.buildType];
    if (options.length > 1) {
      const idx = state.buildOptionIdx || 0;
      const altType = options[(idx + 1) % options.length];
      const altLabel = BUILDING_LABEL[altType] || altType;
      hud.buildPrompt.textContent = affordable
        ? `HOLD SPACE — ${label} (${cost}¢)   |   TAB: ${altLabel}`
        : `${label} (${cost}¢) — INSUFFICIENT FUNDS   |   TAB: ${altLabel}`;
    } else {
      hud.buildPrompt.textContent = affordable
        ? `HOLD SPACE — ${label} (${cost}¢)`
        : `${label} (${cost}¢) — INSUFFICIENT FUNDS`;
    }
  } else {
    hud.buildPrompt.style.display = 'none';
  }

  // Upgrade button states
  for (const def of UPGRADE_DEFS) {
    const btn = hud.upgradeBtns[def.id];
    if (!btn) continue;
    const level = state.upgrades[def.id];
    const maxed = level >= def.maxLevel;
    const affordable = state.wallet >= def.cost;
    btn.disabled = maxed;
    btn.classList.toggle('maxed', maxed);
    btn.classList.toggle('unaffordable', !affordable && !maxed);
    const levelEl = btn.querySelector('.upgrade-level');
    if (def.maxLevel < Infinity) {
      levelEl.textContent = `${level}/${def.maxLevel}`;
    } else {
      levelEl.textContent = level > 0 ? `x${level}` : '';
    }
  }
}
