export const PROJECTILE_TTL = 1.6;

export function createProjectile(x, y, angle, speed, damage, faction) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    faction,  // 'friendly' | 'enemy'
    ttl: PROJECTILE_TTL,
  };
}
