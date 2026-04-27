export const TRANSPORT_HP = 30;
export const TRANSPORT_SIZE = 7;
export const TRANSPORT_SPEED = 200;
export const TRANSPORT_ACCEL = 900;
export const TRANSPORT_DAMPING = 0.87;
export const TRANSPORT_CARGO_CAP = 20;
export const TRANSPORT_INTERACT_RADIUS = 28;
export const TRANSPORT_BUILD_COST_METAL = 15;
export const TRANSPORT_BUILD_COST_FUEL = 8;
export const TRANSPORT_BUILD_TIME = 8; // seconds

export function createTransportShip(id, x, y) {
  return {
    id,
    hp: TRANSPORT_HP,
    maxHp: TRANSPORT_HP,
    x, y,
    vx: 0, vy: 0,
    heading: 0,
    state: 'idle',
    cargoKind: null,
    cargoAmount: 0,
    jobKind: null,
    jobTargetId: null,
    targetX: x,
    targetY: y,
  };
}
