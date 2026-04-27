import { EXTRACTOR_PRODUCE_RATE, EXTRACTOR_BUFFER_CAP } from '../entities/building.js';
import { SLOT_RADIUS } from '../world/bodies.js';
import { getRefineScale, getExtractorScale } from './upgrades.js';

const STATION_REFINE_RATE = 0.8; // water units/sec converted to fuel (base)

const PICKUP_COLLECT_RADIUS = 40;
const PICKUP_PULL_RADIUS    = 380;
const PICKUP_PULL_SPEED     = 240;
const PICKUP_VACUUM_SPEED   = 700;

export function updateEconomy(state, dt) {
  if (state.gameStatus !== 'playing') return;

  const bodyById = {};
  for (const b of state.bodies) bodyById[b.id] = b;

  const extractorScale = getExtractorScale(state);

  // Extractor buffer production
  for (const bldg of state.buildings) {
    if (bldg.type !== 'metalExtractor' && bldg.type !== 'waterExtractor') continue;
    if (bldg.buffer < bldg.bufferCap) {
      bldg.buffer = Math.min(bldg.bufferCap, bldg.buffer + EXTRACTOR_PRODUCE_RATE * extractorScale * dt);
    }
  }

  // Station refines water → fuel
  if (state.resources.water > 0) {
    const refineRate = STATION_REFINE_RATE * getRefineScale(state);
    const refined = Math.min(state.resources.water, refineRate * dt);
    state.resources.water -= refined;
    const gained = refined;
    state.resources.fuel = Math.min(state.fuelCap, (state.resources.fuel || 0) + gained);
  }

  // Keep building positions stuck on their orbiting slot
  for (const bldg of state.buildings) {
    const body = bodyById[bldg.bodyId];
    if (!body) continue;
    if (body.slots && bldg.slotIndex != null) {
      const slot = body.slots[bldg.slotIndex];
      if (slot) {
        const slotRadius = body.radius + SLOT_RADIUS;
        bldg.x = body.x + Math.cos(slot.angle) * slotRadius;
        bldg.y = body.y + Math.sin(slot.angle) * slotRadius;
      }
    }
  }

  // Pickups are now collected by transports — see transports.js

  // Clamp transport deposits to caps (transport deposits happen in transports.js handleArrival)
  state.resources.metal = Math.min(state.metalCap, state.resources.metal || 0);
  state.resources.water = Math.min(state.waterCap, state.resources.water || 0);
  state.resources.fuel  = Math.min(state.fuelCap,  state.resources.fuel  || 0);

  // Update wreck cooldown timers
  for (let i = state.wrecks.length - 1; i >= 0; i--) {
    state.wrecks[i].timer -= dt;
    if (state.wrecks[i].timer <= 0) state.wrecks.splice(i, 1);
  }

  // Update FX
  for (let i = state.fx.length - 1; i >= 0; i--) {
    const fx = state.fx[i];
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
    fx.vx *= 0.92;
    fx.vy *= 0.92;
    fx.ttl -= dt;
    if (fx.ttl <= 0) state.fx.splice(i, 1);
  }
}
