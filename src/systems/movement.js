import { PLAYER_ACCEL, PLAYER_DAMPING, PLAYER_SPEED } from '../entities/playerShip.js';
import { FLEET_ACCEL, FLEET_DAMPING, FLEET_SPEED, getSlotOffset } from '../entities/fleetShip.js';

const WORLD_HALF = 2200;
const OVERLAP_BUFFER = 4; // extra pixels to stop before body surface

export function updateMovement(state, input, dt) {
  if (state.gameStatus !== 'playing') return;

  const ship = state.playerShip;
  const { keys, mouse } = input;

  // Ship heading tracks cursor
  ship.heading = Math.atan2(mouse.worldY - ship.y, mouse.worldX - ship.x);

  // Build thrust vector in world space from ship-local WASD
  const cos = Math.cos(ship.heading);
  const sin = Math.sin(ship.heading);
  let thrustX = 0, thrustY = 0;

  if (keys['KeyW']) { thrustX += cos; thrustY += sin; }
  if (keys['KeyS']) { thrustX -= cos; thrustY -= sin; }
  if (keys['KeyA']) { thrustX += sin; thrustY -= cos; }  // strafe left
  if (keys['KeyD']) { thrustX -= sin; thrustY += cos; }  // strafe right

  // Normalize diagonal thrust
  const tLen = Math.hypot(thrustX, thrustY);
  if (tLen > 0) {
    thrustX /= tLen;
    thrustY /= tLen;
  }

  ship.vx = (ship.vx + thrustX * PLAYER_ACCEL * dt) * Math.pow(PLAYER_DAMPING, dt * 60);
  ship.vy = (ship.vy + thrustY * PLAYER_ACCEL * dt) * Math.pow(PLAYER_DAMPING, dt * 60);

  // Cap speed
  const spd = Math.hypot(ship.vx, ship.vy);
  if (spd > PLAYER_SPEED) {
    ship.vx = (ship.vx / spd) * PLAYER_SPEED;
    ship.vy = (ship.vy / spd) * PLAYER_SPEED;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Collision with bodies and sun
  for (const body of state.bodies) {
    const dx = ship.x - body.x;
    const dy = ship.y - body.y;
    const dist = Math.hypot(dx, dy);
    const minDist = body.radius + 12 + OVERLAP_BUFFER;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      ship.x = body.x + nx * minDist;
      ship.y = body.y + ny * minDist;
      // Cancel velocity component toward the body
      const dot = ship.vx * nx + ship.vy * ny;
      if (dot < 0) {
        ship.vx -= dot * nx;
        ship.vy -= dot * ny;
      }
    }
  }

  // Soft world boundary
  ship.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.x));
  ship.y = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.y));

  updateFleetMovement(state, dt);
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
