import { BODY_DEFS, slotCountForBody } from './bodies.js';
import { createWarpGates } from '../entities/warpGate.js';

export function initBodies() {
  const bodies = BODY_DEFS.map(def => ({
    ...def,
    angle: def.phase,
    x: 0,
    y: 0,
    buildings: [],   // [{ type, id, slotIndex }] — occupied slots
    slots: [],       // [{ angle, occupied, cooldownUntil, buildingId }]
    cooldowns: {},   // kept for backwards compat; slot.cooldownUntil is authoritative
  }));

  // Compute initial positions before generating slots (slots don't need positions yet)
  updateOrbits(bodies, 0);

  // Generate build slots for each body
  for (const b of bodies) {
    const n = slotCountForBody(b);
    b.slots = Array.from({ length: n }, (_, i) => ({
      angle: (i / n) * Math.PI * 2,
      occupied: false,
      cooldownUntil: 0,
      buildingId: null,
    }));
  }

  return bodies;
}

export function initWarpGates() {
  return createWarpGates();
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
