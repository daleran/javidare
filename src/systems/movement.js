import {
  STATION_ORBIT_K, STATION_ORBIT_TRANSITION_RATE,
} from '../entities/station.js';
import {
  TRANSPORT_SPEED, TRANSPORT_ACCEL, TRANSPORT_DAMPING,
} from '../entities/transportShip.js';

export function updateStation(state, dt) {
  if (state.gameStatus !== 'playing') return;
  const st = state.station;
  if (!st) return;

  // Tick flash timer
  if (st.orbitFlashTimer > 0) st.orbitFlashTimer = Math.max(0, st.orbitFlashTimer - dt);

  // Lerp orbit radius toward target (station always orbits the sun at origin)
  if (st.targetOrbit) {
    const diff = st.targetOrbit.radius - st.orbitRadius;
    const step = STATION_ORBIT_TRANSITION_RATE * dt;
    if (Math.abs(diff) <= step) {
      st.orbitRadius = st.targetOrbit.radius;
      st.targetOrbit = null;
    } else {
      st.orbitRadius += Math.sign(diff) * step;
    }
  }

  // Keplerian speed: matches natural orbital velocity at current radius
  const speed = STATION_ORBIT_K / Math.sqrt(st.orbitRadius);
  st.orbitAngle += speed * dt;

  // Sun is always at origin
  st.x = Math.cos(st.orbitAngle) * st.orbitRadius;
  st.y = Math.sin(st.orbitAngle) * st.orbitRadius;
}

export function updateTransportMovement(state, dt) {
  for (const ship of state.transportShips) {
    steer(ship, ship.targetX, ship.targetY, dt);
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > 20) ship.heading = Math.atan2(ship.vy, ship.vx);
  }
}

function steer(ship, targetX, targetY, dt) {
  const dx = targetX - ship.x;
  const dy = targetY - ship.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 8) {
    const force = Math.min(dist * 12, TRANSPORT_ACCEL);
    ship.vx += (dx / dist) * force * dt;
    ship.vy += (dy / dist) * force * dt;
  }

  ship.vx *= Math.pow(TRANSPORT_DAMPING, dt * 60);
  ship.vy *= Math.pow(TRANSPORT_DAMPING, dt * 60);

  const spd = Math.hypot(ship.vx, ship.vy);
  if (spd > TRANSPORT_SPEED) {
    ship.vx = (ship.vx / spd) * TRANSPORT_SPEED;
    ship.vy = (ship.vy / spd) * TRANSPORT_SPEED;
  }
}
