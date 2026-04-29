export const ENEMY_DEFS = {
  skirmisher: {
    hp: 35,
    speed: 180,
    size: 10,
    fireRate: 2.5,
    fireDamage: 6,
    fireSpeed: 500,
    fireRange: 380,
    spawnCost: 1,
    dropMin: 1,
    dropMax: 1,
  },
  bomber: {
    hp: 90,
    speed: 90,
    size: 13,
    fireRate: 0,    // bombers don't shoot
    fireDamage: 0,
    fireSpeed: 0,
    fireRange: 0,
    ramDamage: 40,
    contactRadius: 18,
    spawnCost: 3,
    dropMin: 2,
    dropMax: 3,
  },
  miniboss: {
    hp: 600,
    speed: 60,
    size: 22,
    fireRate: 1.2,
    fireDamage: 12,
    fireSpeed: 400,
    fireRange: 600,
    addSpawnInterval: 8,
    spawnCost: 20,
    dropMin: 15,
    dropMax: 20,
  },
};

export function createEnemy(id, type, x, y) {
  const def = ENEMY_DEFS[type];
  const base = {
    id,
    type,
    hp: def.hp,
    maxHp: def.hp,
    x, y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: Math.random() / (def.fireRate || 1),
    strafeTick: 0,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    spawnAnim: 0.3,
    barkTimer: 4 + Math.random() * 8,
  };

  if (type === 'miniboss') {
    base.addSpawnTimer = def.addSpawnInterval;
    base.spawnedAddIds = [];
  }

  return base;
}
