import { PLAYER_SPEED, PLAYER_ACCEL } from './playerShip.js';

export const FLEET_HP = 50;
export const FLEET_SPEED = PLAYER_SPEED * 1.4;
export const FLEET_ACCEL = PLAYER_ACCEL * 1.4;
export const FLEET_DAMPING = 0.85;
export const FLEET_SIZE = 10;
export const FLEET_FIRE_RATE = 3;
export const FLEET_PROJECTILE_SPEED = 520;
export const FLEET_PROJECTILE_DAMAGE = 6;
export const FLEET_FIRE_RANGE = 420;

// Slot offsets in player-local frame: spread behind the player in a V
export function getSlotOffset(slotIndex) {
  const row = Math.floor(slotIndex / 2);
  const side = slotIndex % 2 === 0 ? -1 : 1;
  return {
    x: -(55 + row * 30),
    y: side * (24 + row * 22),
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
