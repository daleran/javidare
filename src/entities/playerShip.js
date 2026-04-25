export const PLAYER_HP = 100;
export const PLAYER_SPEED = 280;       // max speed (world units/s)
export const PLAYER_ACCEL = 420;       // acceleration (wu/s²)
export const PLAYER_DAMPING = 0.88;    // per-tick velocity multiplier
export const PLAYER_SIZE = 14;         // triangle half-size
export const PLAYER_FIRE_RATE = 5;     // shots/sec
export const PLAYER_PROJECTILE_SPEED = 600;
export const PLAYER_PROJECTILE_DAMAGE = 8;
export const PLAYER_FIRE_RANGE = 500;

export function createPlayerShip(x, y) {
  return {
    id: 'player',
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    x, y,
    vx: 0,
    vy: 0,
    heading: 0,        // radians, pointing direction
    fireCooldown: 0,
    autoFireTarget: null,
  };
}
