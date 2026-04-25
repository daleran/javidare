export function createState() {
  return {
    wallet: 100,
    incomePerSec: 0,
    waveIndex: 0,       // 1-6; starts at 0 = no wave yet
    wavePhase: 'buildup', // 'buildup' | 'combat' | 'done'
    waveTimer: 30,      // countdown in seconds
    waveCombatTimer: 0, // safety timeout
    waveSpawnCount: 0,  // how many enemies spawned this wave
    waveKillCount: 0,   // how many killed this wave
    waveSpawnBudget: 0, // remaining spawn budget
    gameStatus: 'playing', // 'playing' | 'paused' | 'gameover' | 'victory'

    sun: null,
    bodies: [],
    buildings: [],
    playerShip: null,
    fleet: [],
    fleetCap: 0,
    shipyardCount: 0,
    enemies: [],
    projectiles: [],
    pickups: [],
    fx: [],
    wrecks: [],        // { bodyId, timer } — bodies on rebuild cooldown

    nextId: 1,
  };
}

export function nextId(state) {
  return `e${state.nextId++}`;
}
