export const BUILDING_HP = {
  extractor: 60,
  lightTurret: 80,
  turretPlatform: 150,
  shipyard: 200,
  cryoBattery: 100,
  fortress: 280,
};

export const BUILDING_FIRE_RATE = {
  lightTurret: 4,       // shots/sec
  turretPlatform: 1.5,
  fortress: 0.5,        // slow heavy gun
};

export const BUILDING_FIRE_RANGE = {
  lightTurret: 300,
  turretPlatform: 500,
  fortress: 600,
};

export const BUILDING_PROJECTILE_DAMAGE = {
  lightTurret: 5,
  turretPlatform: 15,
  fortress: 25,
};

export const BUILDING_PROJECTILE_SPEED = {
  lightTurret: 550,
  turretPlatform: 450,
  fortress: 500,
};

// Income per second for extractors; scaled by body radius
export const EXTRACTOR_BASE_INCOME = 0.01; // credits/sec per radius unit

export const SHIPYARD_SLOTS = 4;
export const SHIPYARD_RESPAWN_TIME = 15; // seconds per frigate

// Cryo battery — passive slow aura. Each battery in range subtracts
// CRYO_SLOW_FACTOR from an enemy's effective speed multiplier; total
// reduction is clamped at CRYO_MAX_SLOW so they never fully stop.
export const CRYO_RANGE = 260;
export const CRYO_SLOW_FACTOR = 0.35;
export const CRYO_MAX_SLOW = 0.70;

export function createBuilding(id, type, bodyId, bodyX, bodyY) {
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
  };

  if (type === 'shipyard') {
    base.slots = Array.from({ length: SHIPYARD_SLOTS }, () => ({
      occupied: false,
      respawnTimer: 0,
    }));
  }

  return base;
}
