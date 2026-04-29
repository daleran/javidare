import { PLAYER_SPEED, PLAYER_ACCEL } from './playerShip.js';

export const FLEET_HP = 50;
export const FLEET_COST = 1;
export const FLEET_SPEED = PLAYER_SPEED * 1.4;
export const FLEET_ACCEL = PLAYER_ACCEL * 1.4;
export const FLEET_DAMPING = 0.85;
export const FLEET_SIZE = 10;
export const FLEET_FIRE_RATE = 3;
export const FLEET_PROJECTILE_SPEED = 520;
export const FLEET_PROJECTILE_DAMAGE = 6;
export const FLEET_FIRE_RANGE = 420;

// 4-wide wing formation; row spreads widen as ships trail further back
export function getSlotOffset(slotIndex) {
  const COLS = 4;
  const row = Math.floor(slotIndex / COLS);
  const col = slotIndex % COLS;
  const spread = 34 + row * 10;
  const yFrac = col - (COLS - 1) / 2; // -1.5, -0.5, 0.5, 1.5
  return {
    x: -(52 + row * 46),
    y: yFrac * spread,
  };
}

export function createFleetShip(id, slotIndex, homeShipyardId, x, y) {
  return {
    id,
    hp: FLEET_HP,
    maxHp: FLEET_HP,
    x, y,
    vx: 0,
    vy: 0,
    heading: 0,
    fireCooldown: Math.random() / FLEET_FIRE_RATE,
    slotIndex,
    homeShipyardId,
  };
}
