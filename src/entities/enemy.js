// aggro: ordered list of target-kinds; enemy attacks first category it can find
export const ENEMY_DEFS = {
  swarmer: {
    hp: 15,
    speed: 160,
    fireRate: 2,
    burstCount: 2,
    burstGap: 0.12,
    fireDamage: 4,
    fireSpeed: 420,
    fireRange: 280,
    spawnCost: 1,
    dropMetal: 2,
    dropFuel: 0,
    aggro: ['metalExtractor', 'waterExtractor', 'transport', 'missileTurret', 'railgunTurret', 'station'],
  },
  breacher: {
    hp: 120,
    speed: 60,
    fireRate: 0.6,
    burstCount: 1,
    burstGap: 0,
    fireDamage: 22,
    fireSpeed: 240,
    fireRange: 160,
    spawnCost: 5,
    dropMetal: 6,
    dropFuel: 1,
    aggro: ['railgunTurret', 'missileTurret', 'metalExtractor', 'waterExtractor', 'station'],
  },
  hunter: {
    hp: 60,
    speed: 90,
    fireRate: 0.8,
    burstCount: 1,
    burstGap: 0,
    fireDamage: 14,
    fireSpeed: 540,
    fireRange: 520,
    spawnCost: 4,
    dropMetal: 3,
    dropFuel: 2,
    aggro: ['station'],
    standoffRange: 420,  // tries to stay at this distance from target
  },
};

export function createEnemy(id, type, x, y) {
  const def = ENEMY_DEFS[type];
  return {
    id,
    type,
    hp: def.hp,
    maxHp: def.hp,
    x, y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: 0.5 + Math.random() * 0.5,
    burstRemaining: 0,
    burstGapTimer: 0,
    strafeTick: Math.random() * 2.5,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
  };
}
