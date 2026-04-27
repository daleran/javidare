import { BUILDING_LABEL, BUILDING_COST, ALLOWED_FOR_BODY } from '../world/bodies.js';
import { UPGRADE_TRACKS } from '../systems/upgrades.js';
import {
  TRANSPORT_BUILD_COST_METAL, TRANSPORT_BUILD_COST_FUEL, TRANSPORT_BUILD_TIME,
} from '../entities/transportShip.js';

const TOTAL_WAVES_DISPLAY = '∞';

export function createHud(container, onBuild, onUpgrade, onBuildTransport) {
  const upgradeRowsHtml = Object.entries(UPGRADE_TRACKS).map(([key, def]) => `
    <div class="upgrade-row" data-key="${key}">
      <div class="up-header">
        <div class="up-label">${def.label}</div>
        <div class="up-pips" data-pips="${key}"></div>
        <button class="hud-btn up-buy" data-buy="${key}">—</button>
      </div>
      <div class="up-desc">${def.desc}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div id="hud-help" class="hud-panel">
      <div class="help-title">HOW TO PLAY</div>
      <div class="help-row"><span class="help-key">WASD</span><span>Pan camera</span></div>
      <div class="help-row"><span class="help-key">Scroll</span><span>Zoom</span></div>
      <div class="help-row"><span class="help-key">Left click</span><span>Select slot / station</span></div>
      <div class="help-row"><span class="help-key">Right click</span><span>Move station orbit</span></div>
      <div class="help-row"><span class="help-key">ESC</span><span>Pause</span></div>
      <div class="help-divider"></div>
      <div class="help-note">Build extractors on asteroids &amp; planets to gather resources. Deploy transports to haul them home. Survive the waves.</div>
    </div>

    <div id="hud-wave" class="hud-panel">PREPARE — T-60s</div>

    <div id="hud-sidebar">
      <div class="sidebar-station">
        <div class="sidebar-title">AEGIS STATION</div>
        <div class="bar-label">HULL</div>
        <div class="bar-bg"><div id="bar-hull" class="bar-fill hull"></div></div>
        <div class="bar-label">SHLD</div>
        <div class="bar-bg"><div id="bar-shield" class="bar-fill shield"></div></div>
      </div>
      <div class="sidebar-resources">
        <div class="res-row"><span class="res-label">METAL</span><span id="res-metal">0/200</span></div>
        <div class="res-row"><span class="res-label">WATER</span><span id="res-water">0/100</span></div>
        <div class="res-row"><span class="res-label">FUEL</span><span id="res-fuel">0/150</span></div>
      </div>
      <div class="sidebar-fleet">
        <div class="sidebar-title">FLEET</div>
        <div class="fleet-count">TRANSPORTS <span id="fleet-count">0/3</span></div>
        <div id="fleet-build-area"></div>
      </div>
      <div id="sidebar-context">
        <div id="ctx-upgrades">
          <div class="sidebar-title">UPGRADES</div>
          ${upgradeRowsHtml}
        </div>
        <div id="ctx-build" style="display:none">
          <div class="sidebar-title">BUILD</div>
          <div id="build-options"></div>
        </div>
      </div>
    </div>

    <div id="hud-modal-gameover" class="hud-modal">
      <h1>STATION DESTROYED</h1>
      <p id="modal-waves-text">WAVES SURVIVED: 0</p>
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
    </div>
  `;

  const els = {
    resMetal:     container.querySelector('#res-metal'),
    resWater:     container.querySelector('#res-water'),
    resFuel:      container.querySelector('#res-fuel'),
    wave:         container.querySelector('#hud-wave'),
    fleetCount:   container.querySelector('#fleet-count'),
    fleetBuild:   container.querySelector('#fleet-build-area'),
    barHull:      container.querySelector('#bar-hull'),
    barShield:    container.querySelector('#bar-shield'),
    ctxUpgrades:  container.querySelector('#ctx-upgrades'),
    ctxBuild:     container.querySelector('#ctx-build'),
    buildOptions: container.querySelector('#build-options'),
    upgradeBody:  container.querySelector('#sidebar-context'),
    modalGameover: container.querySelector('#hud-modal-gameover'),
    modalPause:    container.querySelector('#hud-modal-pause'),
    modalWaves:    container.querySelector('#modal-waves-text'),
  };

  // Upgrade button clicks
  container.querySelector('#sidebar-context').addEventListener('click', e => {
    const key = e.target.dataset.buy;
    if (key && onUpgrade) onUpgrade(key);
  });

  // Build button clicks (use closest() so child spans bubble correctly)
  els.buildOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-build]');
    if (btn && onBuild) onBuild(btn.dataset.build);
  });

  // Fleet build button
  els.fleetBuild.addEventListener('click', e => {
    if (e.target.closest('[data-build-transport]') && onBuildTransport) onBuildTransport();
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
  if (state.gameStatus === 'gameover') {
    hud.modalWaves.textContent = `WAVES SURVIVED: ${state.waveIndex}`;
  }

  // Resources
  const r = state.resources;
  hud.resMetal.textContent = `${Math.floor(r.metal)}/${state.metalCap}`;
  hud.resWater.textContent = `${Math.floor(r.water)}/${state.waterCap}`;
  hud.resFuel.textContent  = `${Math.floor(r.fuel)}/${state.fuelCap}`;

  // Wave banner
  if (state.wavePhase === 'buildup') {
    const secs = Math.ceil(Math.max(0, state.waveTimer));
    hud.wave.textContent = state.waveIndex === 0
      ? `PREPARE — T-${secs}s`
      : `WAVE ${state.waveIndex + 1} — T-${secs}s`;
  } else {
    hud.wave.textContent = `WAVE ${state.waveIndex} — COMBAT`;
  }

  // Fleet panel — transport count + build button or progress
  hud.fleetCount.textContent = `${state.transportShips.length}/${state.transportCap}`;
  updateFleetBuild(hud, state);

  // Station bars
  if (state.station) {
    const st = state.station;
    const hullPct   = Math.max(0, st.hp / st.maxHp);
    const shieldPct = Math.max(0, st.shieldHp / st.maxShieldHp);
    hud.barHull.style.width   = `${Math.round(hullPct * 100)}%`;
    hud.barShield.style.width = `${Math.round(shieldPct * 100)}%`;
    hud.barHull.style.background = hullPct > 0.5 ? 'var(--accent)' : hullPct > 0.25 ? 'var(--gold)' : 'var(--danger)';
  }

  // Sidebar context: build menu vs. upgrades
  const sel = state.selection;
  const showBuild = sel && sel.kind === 'body' && sel.slotIndex != null;

  if (showBuild) {
    hud.ctxUpgrades.style.display = 'none';
    hud.ctxBuild.style.display = 'block';
    updateBuildMenu(hud, state);
  } else {
    hud.ctxUpgrades.style.display = 'block';
    hud.ctxBuild.style.display = 'none';
    updateUpgradePanel(hud, state);
  }
}

function updateFleetBuild(hud, state) {
  const isBusy = !!state.pendingTransportBuild;
  const atCap  = state.transportShips.length >= state.transportCap;
  const mode   = isBusy ? 'building' : atCap ? 'cap' : 'buy';

  // Only rebuild the DOM structure when the mode changes — clicking destroys nodes if we
  // overwrite innerHTML every frame.
  if (hud._fleetMode !== mode) {
    hud._fleetMode = mode;
    if (mode === 'building') {
      hud.fleetBuild.innerHTML = `
        <div class="fleet-status" id="fleet-build-label"></div>
        <div class="bar-bg"><div class="bar-fill fleet-progress" id="fleet-build-bar"></div></div>
      `;
    } else if (mode === 'cap') {
      hud.fleetBuild.innerHTML = `<div class="fleet-status muted">FLEET AT CAP</div>`;
    } else {
      hud.fleetBuild.innerHTML = `
        <button class="hud-btn build-btn" data-build-transport="1">
          <span class="build-label">BUILD TRANSPORT</span>
          <span class="build-cost">${TRANSPORT_BUILD_COST_METAL}M ${TRANSPORT_BUILD_COST_FUEL}F</span>
        </button>
      `;
    }
  }

  // Update dynamic parts in-place (no innerHTML replacement)
  if (mode === 'building') {
    const remaining = state.pendingTransportBuild.timer;
    const pct = Math.max(0, Math.min(100, ((TRANSPORT_BUILD_TIME - remaining) / TRANSPORT_BUILD_TIME) * 100));
    const lbl = hud.fleetBuild.querySelector('#fleet-build-label');
    const bar = hud.fleetBuild.querySelector('#fleet-build-bar');
    if (lbl) lbl.textContent = `BUILDING ${Math.ceil(remaining)}s`;
    if (bar) bar.style.width = `${pct}%`;
  } else if (mode === 'buy') {
    const canAfford =
      state.resources.metal >= TRANSPORT_BUILD_COST_METAL &&
      state.resources.fuel  >= TRANSPORT_BUILD_COST_FUEL;
    const btn = hud.fleetBuild.querySelector('[data-build-transport]');
    if (btn) btn.classList.toggle('unaffordable', !canAfford);
  }
}

function updateBuildMenu(hud, state) {
  const sel = state.selection;
  const body = state.bodies && state.bodies.find(b => b.id === sel.id);
  if (!body) { hud.buildOptions.innerHTML = ''; hud._buildKey = null; return; }

  const slot = body.slots[sel.slotIndex];
  if (!slot) { hud.buildOptions.innerHTML = ''; hud._buildKey = null; return; }

  const now = performance.now() / 1000;
  const onCooldown = slot.cooldownUntil > now;
  const isOccupied = slot.occupied;
  const cooldownSec = onCooldown ? Math.ceil(slot.cooldownUntil - now) : 0;

  // Structural key: only rebuild DOM when slot or its status changes, not every frame.
  const structKey = `${sel.id}:${sel.slotIndex}:${isOccupied}:${onCooldown ? cooldownSec : 'ok'}`;
  if (hud._buildKey !== structKey) {
    hud._buildKey = structKey;
    let html = '';
    if (isOccupied) {
      html = '<div class="build-msg">SLOT OCCUPIED</div>';
    } else if (onCooldown) {
      html = `<div class="build-msg" id="build-cooldown-msg">COOLDOWN ${cooldownSec}s</div>`;
    } else {
      const allowed = ALLOWED_FOR_BODY[body.type] || [];
      for (const type of allowed) {
        const cost = BUILDING_COST[type];
        const label = BUILDING_LABEL[type] || type;
        const costStr = cost.fuel > 0 ? `${cost.metal}M ${cost.fuel}F` : `${cost.metal}M`;
        html += `
          <button class="hud-btn build-btn" data-build="${type}">
            <span class="build-label">${label}</span>
            <span class="build-cost">${costStr}</span>
          </button>
        `;
      }
      if (!html) html = '<div class="build-msg">NOTHING BUILDABLE</div>';
    }
    hud.buildOptions.innerHTML = html;
  }

  // Update affordability classes in-place (no innerHTML replacement)
  if (!isOccupied && !onCooldown) {
    for (const btn of hud.buildOptions.querySelectorAll('[data-build]')) {
      const cost = BUILDING_COST[btn.dataset.build];
      if (cost) {
        btn.classList.toggle('unaffordable',
          state.resources.metal < cost.metal || state.resources.fuel < cost.fuel);
      }
    }
  }
}

function updateUpgradePanel(hud, state) {
  for (const row of document.querySelectorAll('.upgrade-row')) {
    const key = row.dataset.key;
    const def = UPGRADE_TRACKS[key];
    if (!def) continue;
    const lvl = (state.upgrades && state.upgrades[key]) || 0;

    const pips = row.querySelector('.up-pips');
    if (pips) pips.textContent = '●'.repeat(lvl) + '○'.repeat(def.max - lvl);

    const btn = row.querySelector('.up-buy');
    if (btn) {
      if (lvl >= def.max) {
        btn.textContent = 'MAX';
        btn.disabled = true;
      } else {
        const [metalCost, fuelCost] = def.costs[lvl];
        const costStr = fuelCost > 0 ? `${metalCost}M ${fuelCost}F` : `${metalCost}M`;
        btn.textContent = costStr;
        btn.disabled = state.resources.metal < metalCost || state.resources.fuel < fuelCost;
      }
    }
  }
}
