export const STATION_HP = 500;
export const STATION_SHIELD_HP = 150;
export const STATION_SHIELD_REGEN = 5;        // hp/sec
export const STATION_SHIELD_REGEN_DELAY = 3;  // sec of no-hit before regen starts
export const STATION_SIZE = 20;
export const STATION_ORBIT_K = 0.5478;        // Keplerian constant: speed = K / sqrt(r)
export const STATION_ORBIT_TRANSITION_RATE = 18;  // units/sec radius change

export function createStation(orbitRadius, orbitAngle = Math.PI) {
  return {
    id: 'station',
    hp: STATION_HP,
    maxHp: STATION_HP,
    shieldHp: STATION_SHIELD_HP,
    maxShieldHp: STATION_SHIELD_HP,
    shieldHitTimer: 0,
    x: 0,
    y: 0,
    orbitRadius,
    orbitAngle,
    targetOrbit: null,       // { radius } when migrating
    orbitFlashTimer: 0,      // counts down after a move command; drives target ring flash
  };
}
