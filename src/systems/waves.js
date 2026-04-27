import { createEnemy } from '../entities/enemy.js';
import { ENEMY_DEFS } from '../entities/enemy.js';
import { nextId } from '../game/state.js';

const BUILDUP_TIME   = 60;   // initial prep time (first wave)
const BUILDUP_BETWEEN = 30;  // between waves
const COMBAT_TIMEOUT = 120;
const BASE_BUDGET    = 8;
const SPAWN_INTERVAL = 1.6;

// Wave composition: returns { swarmer, breacher, hunter } budget allocations
function waveComposition(waveIndex) {
  const swarmers  = Math.max(1, Math.round(waveIndex * 0.6));
  const breachers = waveIndex >= 2 ? Math.round(waveIndex * 0.2) : 0;
  const hunters   = waveIndex >= 4 ? Math.min(2, Math.round((waveIndex - 3) * 0.2)) : 0;
  return { swarmer: swarmers, breacher: breachers, hunter: hunters };
}

// Weighted pool that respects composition limits for this wave
function buildPool(waveIndex) {
  const pool = [{ type: 'swarmer', weight: 6, cost: 1 }];
  if (waveIndex >= 2) pool.push({ type: 'breacher', weight: 2, cost: 5 });
  if (waveIndex >= 4) pool.push({ type: 'hunter',   weight: 1, cost: 4 });
  return pool;
}

export function updateWaves(state, dt) {
  if (state.gameStatus !== 'playing') return;

  if (state.wavePhase === 'buildup') {
    // Activate a gate for the upcoming wave
    if (!state.waveActiveGate && state.warpGates.length > 0) {
      pickActiveGate(state);
    }
    // Pulse active gate
    if (state.waveActiveGate) {
      const gate = state.warpGates.find(g => g.id === state.waveActiveGate);
      if (gate) gate.active = true;
    }

    state.waveTimer -= dt;
    if (state.waveTimer <= 0) startWave(state);

  } else if (state.wavePhase === 'combat') {
    state.waveCombatTimer += dt;
    state.waveSpawnCooldown = (state.waveSpawnCooldown || 0) - dt;

    // Count hunters alive (cap at 2)
    const huntersAlive = state.enemies.filter(e => e.type === 'hunter').length;

    if (state.waveSpawnBudget > 0 && state.waveSpawnCooldown <= 0) {
      spawnNextEnemy(state, huntersAlive);
      state.waveSpawnCooldown = SPAWN_INTERVAL;
    }

    const budgetDone = state.waveSpawnBudget <= 0;
    const killRate = state.waveSpawnCount > 0 ? state.waveKillCount / state.waveSpawnCount : 1;
    const timedOut = state.waveCombatTimer >= COMBAT_TIMEOUT;

    if (budgetDone && (killRate >= 0.8 || timedOut)) {
      // Vacuum surviving pickups toward station
      for (const pk of state.pickups) pk.vacuum = true;

      // Deactivate gate, start next buildup
      if (state.waveActiveGate) {
        const gate = state.warpGates.find(g => g.id === state.waveActiveGate);
        if (gate) gate.active = false;
        state.waveActiveGate = null;
      }

      state.wavePhase = 'buildup';
      state.waveTimer = BUILDUP_BETWEEN;
    }
  }
}

function pickActiveGate(state) {
  if (state.warpGates.length === 0) return;
  // Round-robin: use waveIndex modulo gate count
  const idx = state.waveIndex % state.warpGates.length;
  state.waveActiveGate = state.warpGates[idx].id;
}

function startWave(state) {
  state.waveIndex++;
  state.waveKillCount = 0;
  state.waveSpawnCount = 0;
  state.waveCombatTimer = 0;
  state.waveSpawnCooldown = 0.5;
  state.waveSpawnBudget = Math.round(BASE_BUDGET * (1 + 0.4 * (state.waveIndex - 1)));
  state.wavePhase = 'combat';
}

function spawnNextEnemy(state, huntersAlive) {
  const pool = buildPool(state.waveIndex).filter(e => {
    if (e.cost > state.waveSpawnBudget) return false;
    // Enforce max 2 hunters alive
    if (e.type === 'hunter' && huntersAlive >= 2) return false;
    return true;
  });
  if (pool.length === 0) { state.waveSpawnBudget = 0; return; }

  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  let chosen = pool[0];
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) { chosen = entry; break; }
  }

  state.waveSpawnBudget -= ENEMY_DEFS[chosen.type].spawnCost;

  const pos = spawnPositionFromGate(state);
  const id = nextId(state);
  state.enemies.push(createEnemy(id, chosen.type, pos.x, pos.y));
  state.waveSpawnCount++;
}

function spawnPositionFromGate(state) {
  if (state.waveActiveGate) {
    const gate = state.warpGates.find(g => g.id === state.waveActiveGate);
    if (gate) {
      const jitter = (Math.random() - 0.5) * 0.25;
      const angle = gate.angle + jitter;
      return { x: Math.cos(angle) * 2200, y: Math.sin(angle) * 2200 };
    }
  }
  // Fallback: random ring position
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle) * 2200, y: Math.sin(angle) * 2200 };
}
