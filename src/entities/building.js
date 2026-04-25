export const BUILDING_HP = {
  extractor: 60,
  lightTurret: 80,
  turretPlatform: 150,
  shipyard: 200,
};

export const BUILDING_FIRE_RATE = {
  lightTurret: 4,       // shots/sec
  turretPlatform: 1.5,
};

export const BUILDING_FIRE_RANGE = {
  lightTurret: 300,
  turretPlatform: 500,
};

export const BUILDING_PROJECTILE_DAMAGE = {
  lightTurret: 5,
  turretPlatform: 15,
};

export const BUILDING_PROJECTILE_SPEED = {
  lightTurret: 550,
  turretPlatform: 450,
};

// Income per second for extractors; scaled by body radius
export const EXTRACTOR_BASE_INCOME = 0.01; // credits/sec per radius unit

export const SHIPYARD_SLOTS = 4;
export const SHIPYARD_RESPAWN_TIME = 15; // seconds per frigate

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
