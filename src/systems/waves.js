import { createEnemy } from '../entities/enemy.js';
import { ENEMY_DEFS } from '../entities/enemy.js';
import { nextId } from '../game/state.js';

const TOTAL_WAVES = 6;
const BUILDUP_TIME = 30;   // seconds between waves
const COMBAT_TIMEOUT = 90; // safety timeout: force-advance if wave stalls (e.g. enemy at map edge)
const BASE_BUDGET = 8;     // spawn points for wave 1
const WORLD_HALF = 2200;
const SPAWN_INTERVAL = 1.8; // seconds between enemy spawns

// Composition of each wave: array of {type, cost} drawn against budget
const WAVE_POOL = [
  { type: 'skirmisher', weight: 3, cost: 1 },
  { type: 'bomber',     weight: 1, cost: 3 },
];

export function updateWaves(state, dt) {
  if (state.gameStatus !== 'playing') return;
  if (state.wavePhase === 'done') return;

  if (state.wavePhase === 'buildup') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      startWave(state);
    }
  } else if (state.wavePhase === 'combat') {
    state.waveCombatTimer += dt;
    state.waveSpawnCooldown = (state.waveSpawnCooldown || 0) - dt;

    // Spawn enemies while budget remains
    if (state.waveSpawnBudget > 0 && state.waveSpawnCooldown <= 0) {
      spawnNextEnemy(state);
      state.waveSpawnCooldown = SPAWN_INTERVAL;
    }

    // Check wave completion: budget exhausted AND 80% of spawned enemies dead
    const budgetDone = state.waveSpawnBudget <= 0;
    const killRate = state.waveSpawnCount > 0
      ? state.waveKillCount / state.waveSpawnCount
      : 1;
    const timedOut = state.waveCombatTimer >= COMBAT_TIMEOUT;

    if (budgetDone && (killRate >= 0.8 || timedOut)) {
      if (state.waveIndex >= TOTAL_WAVES) {
        state.wavePhase = 'done';
      } else {
        state.wavePhase = 'buildup';
        state.waveTimer = BUILDUP_TIME;
      }
    }
  }
}

function startWave(state) {
  state.waveIndex++;
  state.waveKillCount = 0;
  state.waveSpawnCount = 0;
  state.waveCombatTimer = 0;
  state.waveSpawnCooldown = 0.5; // short delay before first spawn

  if (state.waveIndex === TOTAL_WAVES) {
    // Boss wave
    state.waveSpawnBudget = ENEMY_DEFS.miniboss.spawnCost;
    state.waveBossWave = true;
  } else {
    state.waveBossWave = false;
    state.waveSpawnBudget = Math.round(BASE_BUDGET * (1 + 0.35 * (state.waveIndex - 1)));
  }

  state.wavePhase = 'combat';
}

function spawnNextEnemy(state) {
  if (state.waveBossWave) {
    // Spawn the miniboss
    state.waveSpawnBudget = 0;
    const pos = randomEdgePosition();
    const id = nextId(state);
    const boss = createEnemy(id, 'miniboss', pos.x, pos.y);
    state.enemies.push(boss);
    state.waveSpawnCount++;
    return;
  }

  // Pick random enemy type weighted by budget
  let type = 'skirmisher';
  const affordable = WAVE_POOL.filter(e => e.cost <= state.waveSpawnBudget);
  if (affordable.length === 0) {
    state.waveSpawnBudget = 0;
    return;
  }
  const totalWeight = affordable.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of affordable) {
    r -= entry.weight;
    if (r <= 0) { type = entry.type; break; }
  }

  const cost = ENEMY_DEFS[type].spawnCost;
  state.waveSpawnBudget -= cost;

  const pos = randomEdgePosition();
  const id = nextId(state);
  const enemy = createEnemy(id, type, pos.x, pos.y);
  state.enemies.push(enemy);
  state.waveSpawnCount++;
}

function randomEdgePosition() {
  const side = Math.floor(Math.random() * 4);
  const t = (Math.random() - 0.5) * 2 * WORLD_HALF;
  switch (side) {
    case 0: return { x:  WORLD_HALF, y: t };
    case 1: return { x: -WORLD_HALF, y: t };
    case 2: return { x: t, y:  WORLD_HALF };
    default: return { x: t, y: -WORLD_HALF };
  }
}
