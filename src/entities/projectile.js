export const PROJECTILE_TTL = 2.4;
export const MISSILE_TURN_RATE = 2.8; // rad/sec

export function createProjectile(x, y, angle, speed, damage, faction, kind = 'cannon') {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    faction,
    kind,
    ttl: PROJECTILE_TTL,
  };
}

export function createMissile(x, y, angle, speed, damage, targetId) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    faction: 'friendly',
    kind: 'missile',
    targetId,
    speed,
    ttl: PROJECTILE_TTL * 1.6,
  };
}
