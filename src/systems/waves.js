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
    // Seed origins on the very first tick of any buildup so indicators show during countdown
    if (state.waveOrigins.length === 0) {
      pickWaveOrigins(state, state.waveIndex + 1);
    }
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
      for (const pk of state.pickups) pk.vacuum = true;
      if (state.waveIndex >= TOTAL_WAVES) {
        state.wavePhase = 'done';
        state.waveOrigins = [];
      } else {
        state.wavePhase = 'buildup';
        state.waveTimer = BUILDUP_TIME;
        pickWaveOrigins(state, state.waveIndex + 1);
      }
    }
  }
}

// Pick origin directions for the given 1-based wave number and write to state.waveOrigins.
// Called at the start of buildup so indicators can preview during the countdown.
function pickWaveOrigins(state, nextWaveIndex) {
  const numOrigins = nextWaveIndex <= 3 ? 1 : 2;
  const origins = [];

  const angle1 = Math.random() * Math.PI * 2;
  origins.push(makeOrigin(angle1));

  if (numOrigins === 2) {
    // Force second angle ≥90° away so pockets are visually distinct
    const minSep = Math.PI / 2;
    let angle2 = angle1 + minSep + Math.random() * (Math.PI * 2 - minSep * 2);
    angle2 = angle2 % (Math.PI * 2);
    origins.push(makeOrigin(angle2));
  }

  state.waveOrigins = origins;
}

function makeOrigin(angle) {
  return { angle, x: Math.cos(angle) * WORLD_HALF, y: Math.sin(angle) * WORLD_HALF };
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

  // Origins were pre-computed in buildup; if somehow missing (first wave), pick now
  if (state.waveOrigins.length === 0) {
    pickWaveOrigins(state, state.waveIndex);
  }

  state.wavePhase = 'combat';
}

function spawnNextEnemy(state) {
  if (state.waveBossWave) {
    state.waveSpawnBudget = 0;
    const pos = spawnPositionFromOrigin(state);
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

  const pos = spawnPositionFromOrigin(state);
  const id = nextId(state);
  const enemy = createEnemy(id, type, pos.x, pos.y);
  state.enemies.push(enemy);
  state.waveSpawnCount++;
}

function spawnPositionFromOrigin(state) {
  const origin = state.waveOrigins[Math.floor(Math.random() * state.waveOrigins.length)];
  // Jitter ±~10° around the origin angle so enemies don't stack at a single point
  const jitter = (Math.random() - 0.5) * 0.35;
  const angle = origin.angle + jitter;
  return { x: Math.cos(angle) * WORLD_HALF, y: Math.sin(angle) * WORLD_HALF };
}
