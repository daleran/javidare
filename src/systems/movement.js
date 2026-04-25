import { PLAYER_ACCEL, PLAYER_DAMPING, PLAYER_SPEED } from '../entities/playerShip.js';
import { FLEET_ACCEL, FLEET_DAMPING, FLEET_SPEED, getSlotOffset } from '../entities/fleetShip.js';

const WORLD_HALF = 2200;
const TURN_SPEED = 3.2;         // radians/s
const ORBIT_ENTER_RADIUS = 2.8; // multiples of body.radius to enter orbit

export function updateMovement(state, input, dt) {
  if (state.gameStatus !== 'playing') return;

  const ship = state.playerShip;
  const { keys } = input;

  // Tank controls: A/D rotate, W thrusts forward, S brakes
  if (keys['KeyA']) ship.heading -= TURN_SPEED * dt;
  if (keys['KeyD']) ship.heading += TURN_SPEED * dt;

  const cos = Math.cos(ship.heading);
  const sin = Math.sin(ship.heading);
  const thrusting = keys['KeyW'] || keys['KeyS'];

  // Ease-in: thrustTime ramps 0→1 over 1 s while thrusting, resets instantly on release
  ship.thrustTime = thrusting ? Math.min(1, ship.thrustTime + dt) : 0;
  const eased = ship.thrustTime * ship.thrustTime; // quadratic ease-in

  let thrustX = 0, thrustY = 0;
  if (keys['KeyW']) { thrustX = cos; thrustY = sin; }
  if (keys['KeyS']) { thrustX = -cos; thrustY = -sin; }

  ship.vx = (ship.vx + thrustX * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);
  ship.vy = (ship.vy + thrustY * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);

  // Cap speed
  const spd = Math.hypot(ship.vx, ship.vy);
  if (spd > PLAYER_SPEED) {
    ship.vx = (ship.vx / spd) * PLAYER_SPEED;
    ship.vy = (ship.vy / spd) * PLAYER_SPEED;
  }

  // Auto-orbit: if not thrusting and near a body, co-rotate with it
  updateOrbit(state, ship, keys, dt);

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Soft world boundary
  ship.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.x));
  ship.y = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.y));

  updateFleetMovement(state, dt);
}

function updateOrbit(state, ship, keys, dt) {
  // Exit (or don't enter) orbit while thrusting
  if (keys['KeyW'] || keys['KeyS']) {
    ship.orbitBodyId = null;
    return;
  }

  // Find closest body within range
  let orbitBody = null;
  let orbitDist = Infinity;
  for (const body of state.bodies) {
    const dx = ship.x - body.x;
    const dy = ship.y - body.y;
    const dist = Math.hypot(dx, dy);
    if (dist < body.radius * ORBIT_ENTER_RADIUS && dist < orbitDist) {
      orbitBody = body;
      orbitDist = dist;
    }
  }

  if (!orbitBody) {
    ship.orbitBodyId = null;
    return;
  }

  ship.orbitBodyId = orbitBody.id;

  // Advance ship's angle around the body by the body's own orbit speed
  const dx = ship.x - orbitBody.x;
  const dy = ship.y - orbitBody.y;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) + orbitBody.orbitSpeed * dt;

  // Directly place the ship and zero velocity so the subsequent += vx*dt is a no-op
  ship.x = orbitBody.x + Math.cos(angle) * r;
  ship.y = orbitBody.y + Math.sin(angle) * r;
  ship.vx = 0;
  ship.vy = 0;
}

function updateFleetMovement(state, dt) {
  const ship = state.playerShip;
  const cos = Math.cos(ship.heading);
  const sin = Math.sin(ship.heading);

  for (const frigate of state.fleet) {
    const slot = getSlotOffset(frigate.slotIndex);
    // Rotate slot offset by player heading
    const targetX = ship.x + cos * slot.x - sin * slot.y;
    const targetY = ship.y + sin * slot.x + cos * slot.y;

    const dx = targetX - frigate.x;
    const dy = targetY - frigate.y;
    const dist = Math.hypot(dx, dy);

    // PD-controller: only steer when outside deadzone
    const deadzone = 8;
    if (dist > deadzone) {
      const force = Math.min(dist * 6, FLEET_ACCEL);
      frigate.vx += (dx / dist) * force * dt;
      frigate.vy += (dy / dist) * force * dt;
    }

    frigate.vx *= Math.pow(FLEET_DAMPING, dt * 60);
    frigate.vy *= Math.pow(FLEET_DAMPING, dt * 60);

    const spd = Math.hypot(frigate.vx, frigate.vy);
    if (spd > FLEET_SPEED) {
      frigate.vx = (frigate.vx / spd) * FLEET_SPEED;
      frigate.vy = (frigate.vy / spd) * FLEET_SPEED;
    }

    frigate.x += frigate.vx * dt;
    frigate.y += frigate.vy * dt;

    // Face direction of movement
    if (spd > 20) {
      frigate.heading = Math.atan2(frigate.vy, frigate.vx);
    }
  }
}
