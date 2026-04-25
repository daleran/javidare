import { BODY_DEFS } from './bodies.js';

export function initBodies() {
  const bodies = BODY_DEFS.map(def => ({
    ...def,
    angle: def.phase,
    x: 0,
    y: 0,
    building: null,         // building entity id or null
    buildableAt: 0,         // timestamp when buildable again (after wreck cooldown)
  }));

  // Compute initial positions
  updateOrbits(bodies, 0);
  return bodies;
}

export function updateOrbits(bodies, dt) {
  const byId = {};
  for (const b of bodies) byId[b.id] = b;

  // Integrate angles and compute positions in array order (parent-first guaranteed by BODY_DEFS)
  for (const b of bodies) {
    b.angle += b.orbitSpeed * dt;

    if (b.type === 'sun') {
      b.x = 0;
      b.y = 0;
    } else {
      const parent = byId[b.parentId];
      b.x = parent.x + Math.cos(b.angle) * b.orbitRadius;
      b.y = parent.y + Math.sin(b.angle) * b.orbitRadius;
    }
  }
}
