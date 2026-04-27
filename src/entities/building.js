// ── HP ───────────────────────────────────────────────────────────────────────
export const BUILDING_HP = {
  metalExtractor: 60,
  waterExtractor: 60,
  railgunTurret: 140,
  missileTurret: 120,
};

// ── Railgun turret fire stats ─────────────────────────────────────────────────
export const BUILDING_FIRE_RATE = {
  railgunTurret: 1.5,
  missileTurret: 0.5,
};

export const BUILDING_FIRE_RANGE = {
  railgunTurret: 500,
  missileTurret: 600,
};

export const BUILDING_PROJECTILE_DAMAGE = {
  railgunTurret: 18,
  missileTurret: 40,
};

export const BUILDING_PROJECTILE_SPEED = {
  railgunTurret: 480,
  missileTurret: 180,
};

// ── Turret ammo ───────────────────────────────────────────────────────────────
export const RAILGUN_AMMO_BUFFER = 20;
export const RAILGUN_REFILL_THRESHOLD = 8;

export const MISSILE_AMMO_BUFFER = 8;
export const MISSILE_REFILL_THRESHOLD = 3;
// Missile turret costs both metal AND fuel per refill batch
export const MISSILE_REFILL_METAL = 6;
export const MISSILE_REFILL_FUEL = 4;

// ── Extractor production ──────────────────────────────────────────────────────
export const EXTRACTOR_PRODUCE_RATE = 1.5; // units/sec
export const EXTRACTOR_BUFFER_CAP = 20;
export const EXTRACTOR_HAUL_THRESHOLD = 10;

export function createBuilding(id, type, bodyId, slotIndex, x, y) {
  const hp = BUILDING_HP[type] ?? 60;
  const base = {
    id,
    type,
    bodyId,
    slotIndex,
    hp,
    maxHp: hp,
    x, y,
    fireCooldown: 0,
    heading: -Math.PI / 2,
  };

  if (type === 'metalExtractor' || type === 'waterExtractor') {
    base.buffer = 0;
    base.bufferCap = EXTRACTOR_BUFFER_CAP;
    base.claimed = false;
    base.claimedBy = null;
  }

  if (type === 'railgunTurret') {
    base.ammo = RAILGUN_AMMO_BUFFER;
    base.ammoCap = RAILGUN_AMMO_BUFFER;
    base.refillClaimed = false;
    base.refillClaimedBy = null;
  }

  if (type === 'missileTurret') {
    base.ammo = MISSILE_AMMO_BUFFER;
    base.ammoCap = MISSILE_AMMO_BUFFER;
    base.refillClaimed = false;
    base.refillClaimedBy = null;
  }

  return base;
}
