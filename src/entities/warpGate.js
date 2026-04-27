const WORLD_HALF = 2200;

// Three gates at evenly spaced angles on the world ring
const GATE_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

export function createWarpGates() {
  return GATE_ANGLES.map((angle, i) => ({
    id: `gate${i + 1}`,
    x: Math.cos(angle) * WORLD_HALF,
    y: Math.sin(angle) * WORLD_HALF,
    angle,
    active: false,   // true during buildup of a wave using this gate
    pulseTimer: 0,
  }));
}
