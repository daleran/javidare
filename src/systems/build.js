import { ALLOWED_FOR_BODY, BUILDING_COST, SLOT_RADIUS } from '../world/bodies.js';
import { createBuilding } from '../entities/building.js';
import { nextId } from '../game/state.js';

export function attemptBuild(state, bodyId, slotIndex, type, now) {
  const body = state.bodies.find(b => b.id === bodyId);
  if (!body) return false;

  const slot = body.slots[slotIndex];
  if (!slot || slot.occupied) return false;
  if (slot.cooldownUntil > now) return false;

  const allowed = ALLOWED_FOR_BODY[body.type] || [];
  if (!allowed.includes(type)) return false;

  const cost = BUILDING_COST[type];
  if (!cost) return false;
  if (state.resources.metal < cost.metal) return false;
  if (state.resources.fuel  < cost.fuel)  return false;

  // Territory check
  const slotRadius = body.radius + SLOT_RADIUS;
  const bx = body.x + Math.cos(slot.angle) * slotRadius;
  const by = body.y + Math.sin(slot.angle) * slotRadius;
  if (state.station) {
    const distToStation = Math.hypot(bx - state.station.x, by - state.station.y);
    if (distToStation > state.territoryRadius) return false;
  }

  state.resources.metal -= cost.metal;
  state.resources.fuel  -= cost.fuel;

  const id = nextId(state);
  const building = createBuilding(id, type, body.id, slotIndex, bx, by);
  state.buildings.push(building);
  body.buildings.push({ type, id, slotIndex });
  slot.occupied = true;
  slot.buildingId = id;

  return true;
}
