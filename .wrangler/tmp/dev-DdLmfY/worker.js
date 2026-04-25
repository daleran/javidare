var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/game/state.js
function createState() {
  return {
    wallet: 5,
    incomePerSec: 0,
    waveIndex: 0,
    // 1-6; starts at 0 = no wave yet
    wavePhase: "buildup",
    // 'buildup' | 'combat' | 'done'
    waveTimer: 30,
    // countdown in seconds
    waveCombatTimer: 0,
    // safety timeout
    waveSpawnCount: 0,
    // how many enemies spawned this wave
    waveKillCount: 0,
    // how many killed this wave
    waveSpawnBudget: 0,
    // remaining spawn budget
    waveOrigins: [],
    // [{ angle, x, y }] — set during buildup for indicator preview
    gameStatus: "playing",
    // 'playing' | 'paused' | 'gameover' | 'victory'
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
    wrecks: [],
    // { bodyId, timer } — bodies on rebuild cooldown
    nextId: 1,
    remotePlayers: []
    // [{ id, x, y, heading, hp, maxHp }] — other players in multiplayer
  };
}
__name(createState, "createState");
function nextId(state) {
  return `e${state.nextId++}`;
}
__name(nextId, "nextId");

// src/world/bodies.js
var BUILDING_FOR_BODY = {
  rocky: ["turretPlatform"],
  gas: ["shipyard", "fortress"],
  ringed_giant: ["shipyard", "fortress"],
  moon: ["lightTurret"],
  ice_moon: ["cryoBattery"],
  asteroid: ["extractor"]
};
var BUILDING_COST = {
  extractor: 3,
  lightTurret: 5,
  turretPlatform: 7,
  shipyard: 10,
  cryoBattery: 6,
  fortress: 12
};
function makeCluster(idPrefix, labelPrefix, clusterIdx, centerPhase, centerRadius, baseSpeed) {
  const colors = ["#888070", "#807868", "#94806e"];
  const offsets = [
    { dPhase: -0.05, dRadius: -22, dSize: 0, dSpeed: 4e-4 },
    { dPhase: 0, dRadius: 6, dSize: 1, dSpeed: 0 },
    { dPhase: 0.06, dRadius: 18, dSize: -1, dSpeed: -3e-4 }
  ];
  return offsets.map((o, i) => ({
    id: `${idPrefix}${clusterIdx}-${i + 1}`,
    type: "asteroid",
    parentId: "sun",
    orbitRadius: centerRadius + o.dRadius,
    orbitSpeed: baseSpeed + o.dSpeed,
    phase: centerPhase + o.dPhase,
    radius: 7 + o.dSize,
    color: colors[(clusterIdx + i) % colors.length],
    label: `${labelPrefix}-${clusterIdx}.${i + 1}`
  }));
}
__name(makeCluster, "makeCluster");
var INNER_CLUSTERS = [
  ...makeCluster("ba", "Belt-A", 1, 0.55, 870, 0.0185),
  ...makeCluster("ba", "Belt-A", 2, Math.PI * 0.85, 880, 0.0184),
  ...makeCluster("ba", "Belt-A", 3, Math.PI * 1.55, 860, 0.0186)
];
var OUTER_CLUSTERS = [
  ...makeCluster("bb", "Belt-B", 1, 0.4, 1950, -94e-4),
  ...makeCluster("bb", "Belt-B", 2, Math.PI * 0.9, 1920, -96e-4),
  ...makeCluster("bb", "Belt-B", 3, Math.PI * 1.55, 1980, -93e-4)
];
var BODY_DEFS = [
  // Sun — fixed at origin
  { id: "sun", type: "sun", parentId: null, orbitRadius: 0, orbitSpeed: 0, phase: 0, radius: 64, color: "#ffe580", label: "Star" },
  // Inner-system shoal: a small rocky body and a couple of asteroids
  { id: "solis", type: "rocky", parentId: "sun", orbitRadius: 460, orbitSpeed: 0.027, phase: Math.PI * 1.1, radius: 11, color: "#9a6048", label: "Solis" },
  { id: "inner1", type: "asteroid", parentId: "sun", orbitRadius: 360, orbitSpeed: 0.034, phase: Math.PI * 0.1, radius: 6, color: "#a08070", label: "Inner-1" },
  { id: "inner2", type: "asteroid", parentId: "sun", orbitRadius: 545, orbitSpeed: -0.024, phase: Math.PI * 1.85, radius: 6, color: "#787058", label: "Inner-2" },
  // Home planet + moons
  { id: "keth", type: "rocky", parentId: "sun", orbitRadius: 620, orbitSpeed: 0.022, phase: 0, radius: 22, color: "#b08060", label: "Keth", isHome: true },
  { id: "kethI", type: "moon", parentId: "keth", orbitRadius: 80, orbitSpeed: 0.12, phase: Math.PI * 0.3, radius: 9, color: "#888888", label: "Keth I" },
  { id: "kethII", type: "ice_moon", parentId: "keth", orbitRadius: 130, orbitSpeed: -0.085, phase: Math.PI * 1.2, radius: 7, color: "#b8d4e0", label: "Keth II" },
  // Inner asteroid belt — 3 clusters
  ...INNER_CLUSTERS,
  // Outer rocky planet
  { id: "dera", type: "rocky", parentId: "sun", orbitRadius: 1050, orbitSpeed: 0.014, phase: Math.PI * 0.65, radius: 18, color: "#c06050", label: "Dera" },
  // Alvos — ringed giant + 4 moons
  { id: "alvos", type: "ringed_giant", parentId: "sun", orbitRadius: 1600, orbitSpeed: 8e-3, phase: Math.PI * 1.1, radius: 46, color: "#607898", label: "Alvos" },
  { id: "alvosI", type: "moon", parentId: "alvos", orbitRadius: 110, orbitSpeed: 0.09, phase: Math.PI * 1.7, radius: 11, color: "#607090", label: "Alvos I" },
  { id: "alvosII", type: "moon", parentId: "alvos", orbitRadius: 145, orbitSpeed: -0.075, phase: Math.PI * 0.4, radius: 8, color: "#5d6886", label: "Alvos II" },
  { id: "alvosIII", type: "ice_moon", parentId: "alvos", orbitRadius: 175, orbitSpeed: 0.062, phase: Math.PI * 1.05, radius: 9, color: "#a8c8d8", label: "Alvos III" },
  { id: "alvosIV", type: "moon", parentId: "alvos", orbitRadius: 205, orbitSpeed: 0.052, phase: Math.PI * 0.85, radius: 7, color: "#7a8aa2", label: "Alvos IV" },
  // Outer asteroid belt — 3 clusters
  ...OUTER_CLUSTERS,
  // Miru — gas giant + 5 moons
  { id: "miru", type: "gas", parentId: "sun", orbitRadius: 2300, orbitSpeed: 5e-3, phase: Math.PI * 1.85, radius: 58, color: "#507848", label: "Miru" },
  { id: "miruI", type: "moon", parentId: "miru", orbitRadius: 100, orbitSpeed: 0.1, phase: Math.PI * 0.2, radius: 8, color: "#487860", label: "Miru I" },
  { id: "miruII", type: "ice_moon", parentId: "miru", orbitRadius: 140, orbitSpeed: -0.08, phase: Math.PI * 0.95, radius: 10, color: "#b8d4d0", label: "Miru II" },
  { id: "miruIII", type: "moon", parentId: "miru", orbitRadius: 180, orbitSpeed: 0.065, phase: Math.PI * 1.45, radius: 9, color: "#6a8a72", label: "Miru III" },
  { id: "miruIV", type: "moon", parentId: "miru", orbitRadius: 215, orbitSpeed: 0.055, phase: Math.PI * 1.75, radius: 7, color: "#7c9c84", label: "Miru IV" },
  { id: "miruV", type: "moon", parentId: "miru", orbitRadius: 248, orbitSpeed: 0.046, phase: Math.PI * 0.55, radius: 8, color: "#5a8068", label: "Miru V" }
];

// src/world/solarSystem.js
function initBodies() {
  const bodies = BODY_DEFS.map((def) => ({
    ...def,
    angle: def.phase,
    x: 0,
    y: 0,
    buildings: [],
    // [{ type, id }] — one entry per occupied slot
    cooldowns: {}
    // { [buildingType]: timestamp } when slot is rebuildable
  }));
  updateOrbits(bodies, 0);
  return bodies;
}
__name(initBodies, "initBodies");
function updateOrbits(bodies, dt) {
  const byId = {};
  for (const b of bodies) byId[b.id] = b;
  for (const b of bodies) {
    b.angle += b.orbitSpeed * dt;
    if (b.type === "sun") {
      b.x = 0;
      b.y = 0;
    } else {
      const parent = byId[b.parentId];
      b.x = parent.x + Math.cos(b.angle) * b.orbitRadius;
      b.y = parent.y + Math.sin(b.angle) * b.orbitRadius;
    }
  }
}
__name(updateOrbits, "updateOrbits");

// src/entities/playerShip.js
var PLAYER_HP = 100;
var HOME_HEAL_RADIUS = 100;
var HOME_HEAL_RATE = 8;
var PLAYER_SPEED = 1e3;
var PLAYER_ACCEL = 620;
var PLAYER_DAMPING = 0.88;
var PLAYER_FIRE_RATE = 5;
var PLAYER_PROJECTILE_SPEED = 600;
var PLAYER_PROJECTILE_DAMAGE = 8;
var PLAYER_FIRE_RANGE = 500;
function createPlayerShip(x, y) {
  return {
    id: "player",
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: 0,
    autoFireTarget: null,
    orbitBodyId: null,
    followDx: 0,
    followDy: 0,
    thrustTime: 0
  };
}
__name(createPlayerShip, "createPlayerShip");

// src/entities/building.js
var BUILDING_HP = {
  extractor: 60,
  lightTurret: 80,
  turretPlatform: 150,
  shipyard: 200,
  cryoBattery: 100,
  fortress: 280
};
var BUILDING_FIRE_RATE = {
  lightTurret: 4,
  // shots/sec
  turretPlatform: 1.5,
  fortress: 0.5
  // slow heavy gun
};
var BUILDING_FIRE_RANGE = {
  lightTurret: 300,
  turretPlatform: 500,
  fortress: 600
};
var BUILDING_PROJECTILE_DAMAGE = {
  lightTurret: 5,
  turretPlatform: 15,
  fortress: 25
};
var BUILDING_PROJECTILE_SPEED = {
  lightTurret: 550,
  turretPlatform: 450,
  fortress: 500
};
var EXTRACTOR_BASE_INCOME = 0.01;
var SHIPYARD_SLOTS = 4;
var CRYO_RANGE = 260;
var CRYO_SLOW_FACTOR = 0.35;
var CRYO_MAX_SLOW = 0.7;
function createBuilding(id, type, bodyId, bodyX, bodyY) {
  const hp = BUILDING_HP[type];
  const base = {
    id,
    type,
    bodyId,
    hp,
    maxHp: hp,
    x: bodyX,
    y: bodyY,
    fireCooldown: 0,
    heading: -Math.PI / 2
  };
  if (type === "shipyard") {
    base.slots = Array.from({ length: SHIPYARD_SLOTS }, () => ({
      occupied: false,
      respawnTimer: 0
    }));
  }
  return base;
}
__name(createBuilding, "createBuilding");

// src/entities/fleetShip.js
var FLEET_HP = 50;
var FLEET_SPEED = PLAYER_SPEED * 1.4;
var FLEET_ACCEL = PLAYER_ACCEL * 1.4;
var FLEET_DAMPING = 0.85;
var FLEET_FIRE_RATE = 3;
var FLEET_PROJECTILE_SPEED = 520;
var FLEET_PROJECTILE_DAMAGE = 6;
var FLEET_FIRE_RANGE = 420;
function getSlotOffset(slotIndex) {
  const row = Math.floor(slotIndex / 2);
  const side = slotIndex % 2 === 0 ? -1 : 1;
  return {
    x: -(55 + row * 30),
    y: side * (24 + row * 22)
  };
}
__name(getSlotOffset, "getSlotOffset");
function createFleetShip(id, slotIndex, homeShipyardId, x, y) {
  return {
    id,
    hp: FLEET_HP,
    maxHp: FLEET_HP,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: Math.random() / FLEET_FIRE_RATE,
    slotIndex,
    homeShipyardId
  };
}
__name(createFleetShip, "createFleetShip");

// src/entities/enemy.js
var ENEMY_DEFS = {
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
    dropMax: 1
  },
  bomber: {
    hp: 90,
    speed: 90,
    size: 13,
    fireRate: 0,
    // bombers don't shoot
    fireDamage: 0,
    fireSpeed: 0,
    fireRange: 0,
    ramDamage: 40,
    contactRadius: 18,
    spawnCost: 3,
    dropMin: 2,
    dropMax: 3
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
    dropMax: 20
  }
};
function createEnemy(id, type, x, y) {
  const def = ENEMY_DEFS[type];
  const base = {
    id,
    type,
    hp: def.hp,
    maxHp: def.hp,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: Math.random() / (def.fireRate || 1),
    strafeTick: 0,
    strafeDir: Math.random() < 0.5 ? 1 : -1
  };
  if (type === "miniboss") {
    base.addSpawnTimer = def.addSpawnInterval;
    base.spawnedAddIds = [];
  }
  return base;
}
__name(createEnemy, "createEnemy");

// src/entities/projectile.js
var PROJECTILE_TTL = 1.6;
function createProjectile(x, y, angle, speed, damage, faction) {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    faction,
    // 'friendly' | 'enemy'
    ttl: PROJECTILE_TTL
  };
}
__name(createProjectile, "createProjectile");

// src/systems/combat.js
function getAllPlayerShips(state) {
  if (state.players) return Object.values(state.players);
  return state.playerShip ? [state.playerShip] : [];
}
__name(getAllPlayerShips, "getAllPlayerShips");
var STRAFE_PERIOD = 2.5;
var STRAFE_RANGE = 220;
var BOMB_CONTACT = 22;
function updateCombat(state, dt) {
  if (state.gameStatus !== "playing") return;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }
    if (p.faction === "friendly") {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < 14) {
          e.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (e.hp <= 0) killEnemy(state, j);
          break;
        }
      }
    } else {
      let hitPlayer = false;
      for (const ship of getAllPlayerShips(state)) {
        if (Math.hypot(p.x - ship.x, p.y - ship.y) < 14) {
          ship.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (ship.hp <= 0 && getAllPlayerShips(state).every((s) => s.hp <= 0)) {
            state.gameStatus = "gameover";
          }
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) continue;
      for (let j = state.fleet.length - 1; j >= 0; j--) {
        const f = state.fleet[j];
        if (Math.hypot(p.x - f.x, p.y - f.y) < 11) {
          f.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (f.hp <= 0) killFrigate(state, j);
          break;
        }
      }
      for (let j = state.buildings.length - 1; j >= 0; j--) {
        const b = state.buildings[j];
        if (Math.hypot(p.x - b.x, p.y - b.y) < 22) {
          b.hp -= p.damage;
          state.projectiles.splice(i, 1);
          if (b.hp <= 0) killBuilding(state, j);
          break;
        }
      }
    }
  }
  updateEnemyAI(state, dt);
  playerAutofire(state, dt);
  fleetAutofire(state, dt);
  buildingAutofire(state, dt);
  const home = state.bodies.find((b) => b.isHome);
  if (home) {
    for (const ship of getAllPlayerShips(state)) {
      if (ship.hp >= ship.maxHp) continue;
      const dist = Math.hypot(ship.x - home.x, ship.y - home.y);
      if (dist < HOME_HEAL_RADIUS) {
        ship.hp = Math.min(ship.maxHp, ship.hp + HOME_HEAL_RATE * dt);
      }
    }
  }
}
__name(updateCombat, "updateCombat");
function cryoSlowFactor(state, x, y) {
  let total = 0;
  const r2 = CRYO_RANGE * CRYO_RANGE;
  for (const b of state.buildings) {
    if (b.type !== "cryoBattery") continue;
    const d2 = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
    if (d2 < r2) total += CRYO_SLOW_FACTOR;
  }
  return Math.min(CRYO_MAX_SLOW, total);
}
__name(cryoSlowFactor, "cryoSlowFactor");
function updateEnemyAI(state, dt) {
  const now = state.waveTimer;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const def = ENEMY_DEFS[e.type];
    const slow = cryoSlowFactor(state, e.x, e.y);
    const speed = def.speed * (1 - slow);
    let target = null;
    if (e.type === "bomber") {
      target = nearestBuilding(state, e) || nearestShip(state, e);
    } else {
      target = nearestShip(state, e) || nearestBuilding(state, e);
    }
    if (!target) continue;
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (e.type === "skirmisher") {
      e.strafeTick += dt;
      if (e.strafeTick > STRAFE_PERIOD) {
        e.strafeTick = 0;
        e.strafeDir *= -1;
      }
      if (dist > STRAFE_RANGE + 60) {
        e.vx = dx / dist * speed;
        e.vy = dy / dist * speed;
      } else if (dist > 80) {
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const chaseBlend = Math.max(0, (dist - 100) / STRAFE_RANGE);
        e.vx = (dx / dist * chaseBlend + perpX * (1 - chaseBlend) * e.strafeDir) * speed;
        e.vy = (dy / dist * chaseBlend + perpY * (1 - chaseBlend) * e.strafeDir) * speed;
      }
    } else if (e.type === "bomber") {
      if (dist > 0) {
        e.vx = dx / dist * speed;
        e.vy = dy / dist * speed;
      }
      if (dist < BOMB_CONTACT) {
        if (getAllPlayerShips(state).includes(target)) {
          target.hp -= def.ramDamage;
          if (target.hp <= 0 && getAllPlayerShips(state).every((s) => s.hp <= 0)) {
            state.gameStatus = "gameover";
          }
        } else {
          const fIdx = state.fleet.indexOf(target);
          if (fIdx >= 0) {
            target.hp -= def.ramDamage;
            if (target.hp <= 0) killFrigate(state, fIdx);
          } else {
            const bIdx = state.buildings.indexOf(target);
            if (bIdx >= 0) {
              target.hp -= def.ramDamage;
              if (target.hp <= 0) killBuilding(state, bIdx);
            }
          }
        }
        killEnemy(state, i);
        continue;
      }
    } else if (e.type === "miniboss") {
      if (dist > 80 && dist > 0) {
        e.vx = dx / dist * speed;
        e.vy = dy / dist * speed;
      } else {
        e.vx *= 0.9;
        e.vy *= 0.9;
      }
      if (e.type === "miniboss") {
        e.addSpawnTimer -= dt;
        if (e.addSpawnTimer <= 0) {
          e.addSpawnTimer = def.addSpawnInterval;
          spawnAdd(state, e);
        }
      }
    }
    if (dist > 0) {
      e.heading = Math.atan2(e.vy, e.vx);
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (def.fireRate > 0) {
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist < def.fireRange) {
        e.fireCooldown = 1 / def.fireRate;
        const angle = Math.atan2(dy, dx);
        state.projectiles.push(createProjectile(e.x, e.y, angle, def.fireSpeed, def.fireDamage, "enemy"));
      }
    }
  }
}
__name(updateEnemyAI, "updateEnemyAI");
function spawnAdd(state, miniboss) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 80;
  const x = miniboss.x + Math.cos(angle) * dist;
  const y = miniboss.y + Math.sin(angle) * dist;
  const id = nextId(state);
  const add = {
    id,
    type: "skirmisher",
    hp: ENEMY_DEFS.skirmisher.hp,
    maxHp: ENEMY_DEFS.skirmisher.hp,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: Math.random(),
    strafeTick: 0,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    isAdd: true
  };
  state.enemies.push(add);
  miniboss.spawnedAddIds.push(id);
  state.waveSpawnCount++;
}
__name(spawnAdd, "spawnAdd");
function killEnemy(state, index) {
  const e = state.enemies[index];
  if (!e) return;
  state.waveKillCount++;
  spawnDropPickup(state, e);
  spawnDeathFx(state, e.x, e.y, "#ff8c00");
  state.enemies.splice(index, 1);
  if (e.type === "miniboss") {
    state.enemies = state.enemies.filter((en) => !e.spawnedAddIds.includes(en.id));
    state.gameStatus = "victory";
  }
}
__name(killEnemy, "killEnemy");
function killFrigate(state, index) {
  const f = state.fleet[index];
  spawnDeathFx(state, f.x, f.y, "#00d4ff");
  const shipyard = state.buildings.find((b) => b.id === f.homeShipyardId);
  if (shipyard && shipyard.slots) {
    const slot = shipyard.slots[f.slotIndex % shipyard.slots.length];
    if (slot) {
      slot.occupied = false;
      slot.respawnTimer = 15;
    }
  }
  state.fleet.splice(index, 1);
}
__name(killFrigate, "killFrigate");
function killBuilding(state, index) {
  const b = state.buildings[index];
  spawnDeathFx(state, b.x, b.y, "#4a7fa5");
  if (b.type === "shipyard") {
    state.shipyardCount = Math.max(0, state.shipyardCount - 1);
    state.fleetCap = state.shipyardCount * 4;
    while (state.fleet.length > state.fleetCap) {
      const removed = state.fleet.pop();
      spawnDeathFx(state, removed.x, removed.y, "#00d4ff");
    }
  }
  const body = state.bodies.find((bd) => bd.id === b.bodyId);
  if (body) {
    body.buildings = body.buildings.filter((bb) => bb.id !== b.id);
    body.cooldowns = body.cooldowns || {};
    body.cooldowns[b.type] = Date.now() / 1e3 + 10;
    state.wrecks.push({ bodyId: b.bodyId, timer: 10 });
  }
  state.buildings.splice(index, 1);
}
__name(killBuilding, "killBuilding");
function nearestBuilding(state, enemy) {
  let best = null, bestDist = Infinity;
  for (const b of state.buildings) {
    const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}
__name(nearestBuilding, "nearestBuilding");
function nearestShip(state, enemy) {
  let best = null, bestDist = Infinity;
  const candidates = [...getAllPlayerShips(state), ...state.fleet];
  for (const s of candidates) {
    const d = Math.hypot(s.x - enemy.x, s.y - enemy.y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}
__name(nearestShip, "nearestShip");
function nearestEnemy(state, x, y, range) {
  let best = null, bestDist = range * range;
  for (const e of state.enemies) {
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bestDist) {
      bestDist = d2;
      best = e;
    }
  }
  return best;
}
__name(nearestEnemy, "nearestEnemy");
function playerAutofire(state, dt) {
  for (const ship of getAllPlayerShips(state)) {
    ship.fireCooldown -= dt;
    if (ship.fireCooldown > 0) continue;
    const target = nearestEnemy(state, ship.x, ship.y, PLAYER_FIRE_RANGE);
    if (!target) continue;
    ship.fireCooldown = 1 / PLAYER_FIRE_RATE;
    const angle = Math.atan2(target.y - ship.y, target.x - ship.x);
    state.projectiles.push(createProjectile(ship.x, ship.y, angle, PLAYER_PROJECTILE_SPEED, PLAYER_PROJECTILE_DAMAGE, "friendly"));
  }
}
__name(playerAutofire, "playerAutofire");
function fleetAutofire(state, dt) {
  for (const frigate of state.fleet) {
    frigate.fireCooldown -= dt;
    if (frigate.fireCooldown > 0) continue;
    const target = nearestEnemy(state, frigate.x, frigate.y, FLEET_FIRE_RANGE);
    if (!target) continue;
    frigate.fireCooldown = 1 / FLEET_FIRE_RATE;
    const angle = Math.atan2(target.y - frigate.y, target.x - frigate.x);
    state.projectiles.push(createProjectile(frigate.x, frigate.y, angle, FLEET_PROJECTILE_SPEED, FLEET_PROJECTILE_DAMAGE, "friendly"));
  }
}
__name(fleetAutofire, "fleetAutofire");
function buildingAutofire(state, dt) {
  for (const bldg of state.buildings) {
    const fireRate = BUILDING_FIRE_RATE[bldg.type];
    if (!fireRate) continue;
    const range = BUILDING_FIRE_RANGE[bldg.type];
    const target = nearestEnemy(state, bldg.x, bldg.y, range);
    if (target) bldg.heading = Math.atan2(target.y - bldg.y, target.x - bldg.x);
    bldg.fireCooldown -= dt;
    if (bldg.fireCooldown > 0) continue;
    if (!target) continue;
    bldg.fireCooldown = 1 / fireRate;
    const speed = BUILDING_PROJECTILE_SPEED[bldg.type];
    const dmg = BUILDING_PROJECTILE_DAMAGE[bldg.type];
    state.projectiles.push(createProjectile(bldg.x, bldg.y, bldg.heading, speed, dmg, "friendly"));
  }
}
__name(buildingAutofire, "buildingAutofire");
function spawnDropPickup(state, enemy) {
  const def = ENEMY_DEFS[enemy.type];
  const value = Math.round(def.dropMin + Math.random() * (def.dropMax - def.dropMin));
  state.pickups.push({
    x: enemy.x + (Math.random() - 0.5) * 20,
    y: enemy.y + (Math.random() - 0.5) * 20,
    value,
    ttl: 12
  });
}
__name(spawnDropPickup, "spawnDropPickup");
function spawnDeathFx(state, x, y, color) {
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + Math.random() * 0.5;
    const speed = 60 + Math.random() * 100;
    state.fx.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl: 0.4 + Math.random() * 0.4,
      maxTtl: 0.8,
      color,
      len: 8 + Math.random() * 10
    });
  }
}
__name(spawnDeathFx, "spawnDeathFx");

// src/systems/economy.js
var PICKUP_COLLECT_RADIUS = 50;
var PICKUP_PULL_RADIUS = 160;
var PICKUP_PULL_SPEED = 280;
function updateEconomy(state, dt) {
  if (state.gameStatus !== "playing") return;
  let totalIncome = 0;
  for (const bldg of state.buildings) {
    if (bldg.type !== "extractor") continue;
    const body = state.bodies.find((b) => b.id === bldg.bodyId);
    const income = EXTRACTOR_BASE_INCOME * (body ? body.radius : 8) * dt;
    totalIncome += income;
  }
  state.wallet += totalIncome;
  state.incomePerSec = totalIncome / dt;
  for (let i = state.wrecks.length - 1; i >= 0; i--) {
    state.wrecks[i].timer -= dt;
    if (state.wrecks[i].timer <= 0) state.wrecks.splice(i, 1);
  }
  for (const bldg of state.buildings) {
    const body = state.bodies.find((b) => b.id === bldg.bodyId);
    if (body) {
      bldg.x = body.x;
      bldg.y = body.y;
    }
  }
  const playerShips = state.players ? Object.values(state.players) : state.playerShip ? [state.playerShip] : [];
  const collectors = [...playerShips, ...state.fleet];
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.ttl -= dt;
    if (pk.ttl <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    let nearestPlayer = null, nearestDist = PICKUP_PULL_RADIUS;
    for (const ps of playerShips) {
      const d = Math.hypot(ps.x - pk.x, ps.y - pk.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPlayer = ps;
      }
    }
    if (nearestPlayer && nearestDist > 0) {
      const t = 1 - nearestDist / PICKUP_PULL_RADIUS;
      const easedSpeed = PICKUP_PULL_SPEED * (t * t);
      const step = Math.min(easedSpeed * dt, nearestDist);
      pk.x += (nearestPlayer.x - pk.x) / nearestDist * step;
      pk.y += (nearestPlayer.y - pk.y) / nearestDist * step;
    }
    let collected = false;
    for (const c of collectors) {
      if (Math.hypot(c.x - pk.x, c.y - pk.y) < PICKUP_COLLECT_RADIUS) {
        state.wallet += pk.value;
        collected = true;
        break;
      }
    }
    if (collected) state.pickups.splice(i, 1);
  }
  for (const bldg of state.buildings) {
    if (bldg.type !== "shipyard") continue;
    for (let si = 0; si < bldg.slots.length; si++) {
      const slot = bldg.slots[si];
      if (slot.occupied) continue;
      slot.respawnTimer -= dt;
      if (slot.respawnTimer <= 0) {
        const spawned = spawnFrigate(state, bldg, si);
        if (spawned) {
          slot.occupied = true;
        } else {
          slot.respawnTimer = 2;
        }
      }
    }
  }
  for (let i = state.fx.length - 1; i >= 0; i--) {
    const fx = state.fx[i];
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
    fx.vx *= 0.92;
    fx.vy *= 0.92;
    fx.ttl -= dt;
    if (fx.ttl <= 0) state.fx.splice(i, 1);
  }
}
__name(updateEconomy, "updateEconomy");
function spawnFrigate(state, shipyard, slotIndex) {
  if (state.fleet.length >= state.fleetCap) return false;
  const id = nextId(state);
  const frigate = createFleetShip(id, slotIndex, shipyard.id, shipyard.x + (Math.random() - 0.5) * 30, shipyard.y + (Math.random() - 0.5) * 30);
  state.fleet.push(frigate);
  return true;
}
__name(spawnFrigate, "spawnFrigate");

// src/systems/waves.js
var TOTAL_WAVES = 6;
var BUILDUP_TIME = 30;
var COMBAT_TIMEOUT = 90;
var BASE_BUDGET = 8;
var WORLD_HALF = 2200;
var SPAWN_INTERVAL = 1.8;
var WAVE_POOL = [
  { type: "skirmisher", weight: 3, cost: 1 },
  { type: "bomber", weight: 1, cost: 3 }
];
function updateWaves(state, dt) {
  if (state.gameStatus !== "playing") return;
  if (state.wavePhase === "done") return;
  if (state.wavePhase === "buildup") {
    if (state.waveOrigins.length === 0) {
      pickWaveOrigins(state, state.waveIndex + 1);
    }
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      startWave(state);
    }
  } else if (state.wavePhase === "combat") {
    state.waveCombatTimer += dt;
    state.waveSpawnCooldown = (state.waveSpawnCooldown || 0) - dt;
    if (state.waveSpawnBudget > 0 && state.waveSpawnCooldown <= 0) {
      spawnNextEnemy(state);
      state.waveSpawnCooldown = SPAWN_INTERVAL;
    }
    const budgetDone = state.waveSpawnBudget <= 0;
    const killRate = state.waveSpawnCount > 0 ? state.waveKillCount / state.waveSpawnCount : 1;
    const timedOut = state.waveCombatTimer >= COMBAT_TIMEOUT;
    if (budgetDone && (killRate >= 0.8 || timedOut)) {
      if (state.waveIndex >= TOTAL_WAVES) {
        state.wavePhase = "done";
        state.waveOrigins = [];
      } else {
        state.wavePhase = "buildup";
        state.waveTimer = BUILDUP_TIME;
        pickWaveOrigins(state, state.waveIndex + 1);
      }
    }
  }
}
__name(updateWaves, "updateWaves");
function pickWaveOrigins(state, nextWaveIndex) {
  const numOrigins = nextWaveIndex <= 3 ? 1 : 2;
  const origins = [];
  const angle1 = Math.random() * Math.PI * 2;
  origins.push(makeOrigin(angle1));
  if (numOrigins === 2) {
    const minSep = Math.PI / 2;
    let angle2 = angle1 + minSep + Math.random() * (Math.PI * 2 - minSep * 2);
    angle2 = angle2 % (Math.PI * 2);
    origins.push(makeOrigin(angle2));
  }
  state.waveOrigins = origins;
}
__name(pickWaveOrigins, "pickWaveOrigins");
function makeOrigin(angle) {
  return { angle, x: Math.cos(angle) * WORLD_HALF, y: Math.sin(angle) * WORLD_HALF };
}
__name(makeOrigin, "makeOrigin");
function startWave(state) {
  state.waveIndex++;
  state.waveKillCount = 0;
  state.waveSpawnCount = 0;
  state.waveCombatTimer = 0;
  state.waveSpawnCooldown = 0.5;
  if (state.waveIndex === TOTAL_WAVES) {
    state.waveSpawnBudget = ENEMY_DEFS.miniboss.spawnCost;
    state.waveBossWave = true;
  } else {
    state.waveBossWave = false;
    state.waveSpawnBudget = Math.round(BASE_BUDGET * (1 + 0.35 * (state.waveIndex - 1)));
  }
  if (state.waveOrigins.length === 0) {
    pickWaveOrigins(state, state.waveIndex);
  }
  state.wavePhase = "combat";
}
__name(startWave, "startWave");
function spawnNextEnemy(state) {
  if (state.waveBossWave) {
    state.waveSpawnBudget = 0;
    const pos2 = spawnPositionFromOrigin(state);
    const id2 = nextId(state);
    const boss = createEnemy(id2, "miniboss", pos2.x, pos2.y);
    state.enemies.push(boss);
    state.waveSpawnCount++;
    return;
  }
  let type = "skirmisher";
  const affordable = WAVE_POOL.filter((e) => e.cost <= state.waveSpawnBudget);
  if (affordable.length === 0) {
    state.waveSpawnBudget = 0;
    return;
  }
  const totalWeight = affordable.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of affordable) {
    r -= entry.weight;
    if (r <= 0) {
      type = entry.type;
      break;
    }
  }
  const cost = ENEMY_DEFS[type].spawnCost;
  state.waveSpawnBudget -= cost;
  const pos = spawnPositionFromOrigin(state);
  const id = nextId(state);
  const enemy = createEnemy(id, type, pos.x, pos.y);
  state.enemies.push(enemy);
  state.waveSpawnCount++;
}
__name(spawnNextEnemy, "spawnNextEnemy");
function spawnPositionFromOrigin(state) {
  const origin = state.waveOrigins[Math.floor(Math.random() * state.waveOrigins.length)];
  const jitter = (Math.random() - 0.5) * 0.35;
  const angle = origin.angle + jitter;
  return { x: Math.cos(angle) * WORLD_HALF, y: Math.sin(angle) * WORLD_HALF };
}
__name(spawnPositionFromOrigin, "spawnPositionFromOrigin");

// server/room.js
var TICK_RATE = 20;
var TICK_MS = 1e3 / TICK_RATE;
var TICK_DT = 1 / TICK_RATE;
var MAX_PLAYERS = 2;
var TURN_SPEED = 3.2;
var FOLLOW_ENTER_RADIUS = 2.8;
var WORLD_HALF2 = 4400;
var GameRoom = class {
  static {
    __name(this, "GameRoom");
  }
  constructor(state, env) {
    this.ctx = state;
    this.storage = state.storage;
    this.sessions = /* @__PURE__ */ new Map();
    this.inputBuffers = /* @__PURE__ */ new Map();
    this.gameState = null;
    this.tick = 0;
    this.running = false;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init") {
      return new Response("ok");
    }
    if (url.pathname === "/info") {
      return new Response(JSON.stringify({ players: this.ctx.getWebSockets().length }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    return new Response("Not found", { status: 404 });
  }
  handleWebSocket(request) {
    if (this.ctx.getWebSockets().length >= MAX_PLAYERS) {
      const pair2 = new WebSocketPair();
      pair2[1].accept();
      pair2[1].send(JSON.stringify({ type: "error", reason: "room_full" }));
      pair2[1].close(1008, "room_full");
      return new Response(null, { status: 101, webSocket: pair2[0] });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    const playerId = this.playerIdFor(ws);
    if (msg.type === "join") {
      await this.handleJoin(ws, msg);
      return;
    }
    if (!playerId) return;
    if (msg.type === "input") {
      this.inputBuffers.set(playerId, {
        keys: msg.keys || {},
        pressed: msg.pressed || {}
      });
      return;
    }
    if (msg.type === "build_request") {
      this.handleBuildRequest(playerId, msg);
      return;
    }
  }
  async webSocketClose(ws) {
    const playerId = this.playerIdFor(ws);
    if (!playerId) return;
    this.sessions.delete(playerId);
    this.inputBuffers.delete(playerId);
    if (this.gameState && this.gameState.players) {
      delete this.gameState.players[playerId];
    }
    this.broadcast({ type: "player_left", playerId });
    if (this.ctx.getWebSockets().length === 0) {
      this.running = false;
    }
  }
  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
  playerIdFor(ws) {
    for (const [id, sock] of this.sessions) {
      if (sock === ws) return id;
    }
    return null;
  }
  async handleJoin(ws, msg) {
    const playerId = msg.playerId || `p${this.ctx.getWebSockets().length}`;
    if (!this.gameState) {
      this.initGameState();
    }
    this.sessions.set(playerId, ws);
    this.inputBuffers.set(playerId, { keys: {}, pressed: {} });
    const home = this.gameState.bodies.find((b) => b.isHome);
    const angle = Math.random() * Math.PI * 2;
    const spawnX = home.x + Math.cos(angle) * (home.radius + 30);
    const spawnY = home.y + Math.sin(angle) * (home.radius + 30);
    const ship = createPlayerShip(spawnX, spawnY);
    ship.id = playerId;
    this.gameState.players[playerId] = ship;
    if (!this.gameState.leaderPlayerId) {
      this.gameState.leaderPlayerId = playerId;
    }
    ws.send(JSON.stringify({ type: "joined", playerId, roomId: "room" }));
    this.broadcast({ type: "player_joined", playerId }, ws);
    ws.send(JSON.stringify({ type: "tick", tick: this.tick, ...this.buildDelta() }));
    if (!this.running) {
      this.running = true;
      await this.storage.setAlarm(Date.now() + TICK_MS);
    }
  }
  initGameState() {
    this.gameState = createState();
    this.gameState.playerShip = null;
    this.gameState.players = {};
    this.gameState.leaderPlayerId = null;
    this.gameState.bodies = initBodies();
    const home = this.gameState.bodies.find((b) => b.isHome);
    const extId = nextId(this.gameState);
    const extractor = createBuilding(extId, "extractor", home.id, home.x, home.y);
    this.gameState.buildings.push(extractor);
    home.buildings.push({ type: "extractor", id: extId });
    this.gameState.buildPhase = "idle";
    this.gameState.buildProgress = 0;
    this.gameState.buildBodyId = null;
    this.gameState.buildCost = 0;
    this.gameState.buildType = null;
    this.gameState.buildAffordable = false;
  }
  async alarm() {
    if (!this.running || this.ctx.getWebSockets().length === 0) {
      this.running = false;
      return;
    }
    this.runTick();
    await this.storage.setAlarm(Date.now() + TICK_MS);
  }
  runTick() {
    const gs = this.gameState;
    if (!gs || gs.gameStatus !== "playing") return;
    this.tick++;
    updateOrbits(gs.bodies, TICK_DT);
    this.tickAllPlayerMovement(TICK_DT);
    const leaderShip = gs.players[gs.leaderPlayerId] || Object.values(gs.players)[0] || null;
    gs.playerShip = leaderShip;
    updateCombat(gs, TICK_DT);
    updateEconomy(gs, TICK_DT);
    updateWaves(gs, TICK_DT);
    for (const bldg of gs.buildings) {
      const body = gs.bodies.find((b) => b.id === bldg.bodyId);
      if (body) {
        bldg.x = body.x;
        bldg.y = body.y;
      }
    }
    const delta = { type: "tick", tick: this.tick, ...this.buildDelta() };
    this.broadcast(delta);
  }
  tickAllPlayerMovement(dt) {
    const gs = this.gameState;
    for (const [playerId, ship] of Object.entries(gs.players)) {
      const input = this.inputBuffers.get(playerId) || { keys: {}, pressed: {} };
      tickShipMovement(ship, input.keys, gs.bodies, dt);
    }
    const leader = gs.players[gs.leaderPlayerId] || Object.values(gs.players)[0];
    if (leader) {
      tickFleetMovement(gs.fleet, leader, dt);
    }
  }
  handleBuildRequest(playerId, msg) {
    const gs = this.gameState;
    const { bodyId, buildingType } = msg;
    const body = gs.bodies.find((b) => b.id === bodyId);
    if (!body) return this.sendTo(playerId, { type: "build_result", ok: false, reason: "body_not_found" });
    const allowed = (BUILDING_FOR_BODY[body.type] || []).includes(buildingType);
    if (!allowed) return this.sendTo(playerId, { type: "build_result", ok: false, reason: "not_allowed" });
    if (body.buildings.find((b) => b.type === buildingType)) {
      return this.sendTo(playerId, { type: "build_result", ok: false, reason: "already_built" });
    }
    const now = Date.now() / 1e3;
    const cd = body.cooldowns && body.cooldowns[buildingType] || 0;
    if (now < cd) return this.sendTo(playerId, { type: "build_result", ok: false, reason: "on_cooldown" });
    const cost = BUILDING_COST[buildingType];
    if (gs.wallet < cost) {
      return this.sendTo(playerId, { type: "build_result", ok: false, reason: "insufficient_funds" });
    }
    gs.wallet -= cost;
    const id = nextId(gs);
    const building = createBuilding(id, buildingType, body.id, body.x, body.y);
    gs.buildings.push(building);
    body.buildings.push({ type: buildingType, id });
    if (buildingType === "shipyard") {
      gs.shipyardCount++;
      gs.fleetCap = gs.shipyardCount * 4;
      for (const slot of building.slots) {
        slot.respawnTimer = 2;
      }
    }
    this.broadcast({ type: "build_result", ok: true, bodyId, buildingType });
  }
  buildDelta() {
    const gs = this.gameState;
    return {
      players: Object.fromEntries(
        Object.entries(gs.players).map(([id, s]) => [id, { x: s.x, y: s.y, heading: s.heading, hp: s.hp, maxHp: s.maxHp }])
      ),
      fleet: gs.fleet.map((f) => ({ id: f.id, x: f.x, y: f.y, heading: f.heading, hp: f.hp })),
      enemies: gs.enemies.map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, heading: e.heading, hp: e.hp, maxHp: e.maxHp })),
      projectiles: gs.projectiles.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, faction: p.faction, ttl: p.ttl })),
      pickups: gs.pickups.map((p) => ({ x: p.x, y: p.y, value: p.value, ttl: p.ttl })),
      fx: gs.fx.map((f) => ({ x: f.x, y: f.y, vx: f.vx, vy: f.vy, ttl: f.ttl, maxTtl: f.maxTtl, color: f.color, len: f.len })),
      buildings: gs.buildings.map((b) => ({ id: b.id, type: b.type, bodyId: b.bodyId, x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, heading: b.heading || 0 })),
      bodies: gs.bodies.map((b) => ({ id: b.id, x: b.x, y: b.y, angle: b.angle })),
      wrecks: gs.wrecks.map((w) => ({ bodyId: w.bodyId, timer: w.timer })),
      wallet: gs.wallet,
      incomePerSec: gs.incomePerSec,
      waveIndex: gs.waveIndex,
      wavePhase: gs.wavePhase,
      waveTimer: gs.waveTimer,
      waveOrigins: gs.waveOrigins,
      gameStatus: gs.gameStatus
    };
  }
  sendTo(playerId, msg) {
    const ws = this.sessions.get(playerId);
    if (ws) ws.send(JSON.stringify(msg));
  }
  broadcast(msg, excludeWs = null) {
    const text = typeof msg === "string" ? msg : JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== excludeWs) ws.send(text);
    }
  }
};
function tickShipMovement(ship, keys, bodies, dt) {
  if (keys.KeyA) ship.heading -= TURN_SPEED * dt;
  if (keys.KeyD) ship.heading += TURN_SPEED * dt;
  const thrusting = keys.KeyW || keys.KeyS;
  ship.thrustTime = thrusting ? Math.min(1, ship.thrustTime + dt * 3.5) : 0;
  const eased = ship.thrustTime * ship.thrustTime;
  const cos = Math.cos(ship.heading);
  const sin = Math.sin(ship.heading);
  let thrustX = 0, thrustY = 0;
  if (keys.KeyW) {
    thrustX = cos;
    thrustY = sin;
  }
  if (keys.KeyS) {
    thrustX = -cos;
    thrustY = -sin;
  }
  ship.vx = (ship.vx + thrustX * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);
  ship.vy = (ship.vy + thrustY * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);
  const spd = Math.hypot(ship.vx, ship.vy);
  if (spd > PLAYER_SPEED) {
    ship.vx = ship.vx / spd * PLAYER_SPEED;
    ship.vy = ship.vy / spd * PLAYER_SPEED;
  }
  if (!keys.KeyW && !keys.KeyS) {
    for (const body of bodies) {
      if (body.type === "sun") continue;
      const dx = ship.x - body.x;
      const dy = ship.y - body.y;
      const dist = Math.hypot(dx, dy);
      if (dist < body.radius * FOLLOW_ENTER_RADIUS) {
        if (ship.orbitBodyId !== body.id) {
          ship.orbitBodyId = body.id;
          ship.followDx = ship.x - body.x;
          ship.followDy = ship.y - body.y;
        }
        ship.x = body.x + ship.followDx;
        ship.y = body.y + ship.followDy;
        ship.vx = 0;
        ship.vy = 0;
        return;
      }
    }
    ship.orbitBodyId = null;
  } else {
    ship.orbitBodyId = null;
  }
  ship.x = Math.max(-WORLD_HALF2, Math.min(WORLD_HALF2, ship.x + ship.vx * dt));
  ship.y = Math.max(-WORLD_HALF2, Math.min(WORLD_HALF2, ship.y + ship.vy * dt));
}
__name(tickShipMovement, "tickShipMovement");
function tickFleetMovement(fleet, leader, dt) {
  const cos = Math.cos(leader.heading);
  const sin = Math.sin(leader.heading);
  for (const frigate of fleet) {
    const slot = getSlotOffset(frigate.slotIndex);
    const targetX = leader.x + cos * slot.x - sin * slot.y;
    const targetY = leader.y + sin * slot.x + cos * slot.y;
    const dx = targetX - frigate.x;
    const dy = targetY - frigate.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      const force = Math.min(dist * 12, FLEET_ACCEL);
      frigate.vx += dx / dist * force * dt;
      frigate.vy += dy / dist * force * dt;
    }
    frigate.vx *= Math.pow(FLEET_DAMPING, dt * 60);
    frigate.vy *= Math.pow(FLEET_DAMPING, dt * 60);
    const spd = Math.hypot(frigate.vx, frigate.vy);
    if (spd > FLEET_SPEED) {
      frigate.vx = frigate.vx / spd * FLEET_SPEED;
      frigate.vy = frigate.vy / spd * FLEET_SPEED;
    }
    frigate.x += frigate.vx * dt;
    frigate.y += frigate.vy * dt;
    if (spd > 20) frigate.heading = Math.atan2(frigate.vy, frigate.vx);
  }
}
__name(tickFleetMovement, "tickFleetMovement");

// server/worker.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method === "POST" && path === "/rooms") {
      const roomId = crypto.randomUUID().slice(0, 8);
      const stub = getRoomStub(env, roomId);
      await stub.fetch(new Request("http://do/init"));
      return json({ roomId }, corsHeaders);
    }
    const wsMatch = path.match(/^\/rooms\/([^/]+)\/ws$/);
    if (wsMatch) {
      const roomId = wsMatch[1];
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const stub = getRoomStub(env, roomId);
      return stub.fetch(request);
    }
    const infoMatch = path.match(/^\/rooms\/([^/]+)$/);
    if (infoMatch && request.method === "GET") {
      const roomId = infoMatch[1];
      const stub = getRoomStub(env, roomId);
      return stub.fetch(new Request("http://do/info"));
    }
    return new Response("Not found", { status: 404 });
  }
};
function getRoomStub(env, roomId) {
  const id = env.GAME_ROOM.idFromName(roomId);
  return env.GAME_ROOM.get(id);
}
__name(getRoomStub, "getRoomStub");
function json(data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(json, "json");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LIVzKl/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LIVzKl/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
