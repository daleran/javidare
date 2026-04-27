import { ALLOWED_FOR_BODY } from '../world/bodies.js';

export function updateSelection(state, input) {
  if (state.gameStatus !== 'playing') return;

  if (!input.wasRightClicked() && !input.wasClicked()) return;

  const mx = input.mouse.worldX;
  const my = input.mouse.worldY;

  if (input.wasRightClicked()) {
    handleRightClick(state, mx, my);
    return;
  }

  if (input.wasClicked()) {
    handleLeftClick(state, mx, my);
  }
}

function handleLeftClick(state, mx, my) {
  // Priority 1: station
  if (state.station) {
    const d = Math.hypot(mx - state.station.x, my - state.station.y);
    if (d < 26) {
      state.selection = { kind: 'station', id: 'station', slotIndex: null };
      return;
    }
  }

  // Priority 2: slot click on a body (within 14px of slot center) — only if in territory
  for (const body of state.bodies) {
    if (!body.slots || body.slots.length === 0) continue;
    const allowed = ALLOWED_FOR_BODY[body.type] || [];
    if (allowed.length === 0) continue;

    const slotRadius = body.radius + 8;
    for (let i = 0; i < body.slots.length; i++) {
      const slot = body.slots[i];
      const sx = body.x + Math.cos(slot.angle) * slotRadius;
      const sy = body.y + Math.sin(slot.angle) * slotRadius;
      if (Math.hypot(mx - sx, my - sy) < 20) {
        // Check territory
        if (state.station) {
          const distToStation = Math.hypot(sx - state.station.x, sy - state.station.y);
          if (distToStation > state.territoryRadius) {
            // Out of territory — select body but no slot
            state.selection = { kind: 'body', id: body.id, slotIndex: null };
            return;
          }
        }
        state.selection = { kind: 'body', id: body.id, slotIndex: i };
        return;
      }
    }
    // Click on body itself to select (clears slot)
    if (Math.hypot(mx - body.x, my - body.y) < body.radius) {
      state.selection = { kind: 'body', id: body.id, slotIndex: null };
      return;
    }
  }

  // Empty space: clear selection
  state.selection = { kind: null, id: null, slotIndex: null };
}

function handleRightClick(state, mx, my) {
  if (!state.station) return;

  // Right-click anywhere moves the station's orbit — no selection required
  const sun = state.bodies.find(b => b.id === 'sun');
  const minR = sun ? sun.radius * 2.5 : 180;
  const maxR = 2800;
  const clickRadius = Math.hypot(mx, my);
  const targetRadius = Math.max(minR, Math.min(maxR, clickRadius));

  state.station.targetOrbit = { radius: targetRadius };
  state.station.orbitFlashTimer = 1.5;
}
