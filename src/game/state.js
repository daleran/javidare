export function createState() {
  return {
    // Resources and caps
    resources: { metal: 0, water: 0, fuel: 0 },
    metalCap: 200,
    waterCap: 100,
    fuelCap: 150,

    // Wave state
    waveIndex: 0,
    wavePhase: 'buildup',
    waveTimer: 60,          // 60s initial prep time
    waveCombatTimer: 0,
    waveSpawnCount: 0,
    waveKillCount: 0,
    waveSpawnBudget: 0,
    waveSpawnCooldown: 0,
    waveActiveGate: null,   // which gate is spawning this wave
    gameStatus: 'playing',  // 'playing' | 'paused' | 'gameover'

    // Entities
    bodies: [],
    warpGates: [],          // [{ id, x, y, angle, pulseTimer, active }]
    buildings: [],
    station: null,
    transportShips: [],
    transportCap: 3,
    pendingTransportBuild: null, // { timer } or null
    enemies: [],
    projectiles: [],
    pickups: [],   // { x, y, kind: 'metal'|'fuel', amount }
    fx: [],
    wrecks: [],    // { bodyId, slotIndex, timer }

    // Selection
    selection: { kind: null, id: null, slotIndex: null },

    // Territory radius (slots beyond this from station are unclickable)
    territoryRadius: 100,

    // Station upgrades
    upgrades: {
      storage: 0,
      logistics: 0,
      refining: 0,
      shielding: 0,
      weapons: 0,
    },

    nextId: 1,
  };
}

export function nextId(state) {
  return `e${state.nextId++}`;
}
