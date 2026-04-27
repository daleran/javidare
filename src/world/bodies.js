export const BODY_TYPE = {
  SUN: 'sun',
  ROCKY: 'rocky',
  GAS: 'gas',
  RINGED_GIANT: 'ringed_giant',
  MOON: 'moon',
  ICE_MOON: 'ice_moon',
  ASTEROID: 'asteroid',
};

// Allowed building types per body kind. Multiple of same type allowed per slot.
export const ALLOWED_FOR_BODY = {
  asteroid:     ['metalExtractor', 'railgunTurret', 'missileTurret'],
  rocky:        ['metalExtractor', 'railgunTurret', 'missileTurret'],
  moon:         ['metalExtractor', 'railgunTurret', 'missileTurret'],
  ice_moon:     ['waterExtractor', 'railgunTurret', 'missileTurret'],
  gas:          [],
  ringed_giant: [],
  sun:          [],
};

// Slot count per body kind; rocky/moon slot counts also scale with radius
export function slotCountForBody(body) {
  switch (body.type) {
    case 'asteroid':     return 1;
    case 'rocky':        return Math.max(2, Math.min(5, Math.round(body.radius / 5)));
    case 'moon':         return Math.max(2, Math.min(3, Math.round(body.radius / 4)));
    case 'ice_moon':     return Math.max(2, Math.min(3, Math.round(body.radius / 4)));
    default:             return 0;
  }
}

// Distance past body.radius where slot positions (and buildings) are placed
export const SLOT_RADIUS = 8;

// Build costs
export const BUILDING_COST = {
  metalExtractor: { metal: 15, fuel: 0 },
  waterExtractor: { metal: 15, fuel: 0 },
  railgunTurret:  { metal: 20, fuel: 0 },
  missileTurret:  { metal: 25, fuel: 15 },
};

export const BUILDING_LABEL = {
  metalExtractor: 'METAL EXTRACTOR',
  waterExtractor: 'WATER EXTRACTOR',
  railgunTurret:  'RAILGUN TURRET',
  missileTurret:  'MISSILE TURRET',
};

// A "cluster" is a tight knot of asteroids sharing nearly the same orbit.
// Using deterministic offsets so the layout is identical every run.
function makeCluster(idPrefix, labelPrefix, clusterIdx, centerPhase, centerRadius, baseSpeed) {
  const count = 7;
  const colors = ['#888070', '#807868', '#94806e', '#9a8070', '#7a7060', '#a09080', '#706858'];
  const results = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const seed = (clusterIdx * 31 + i * 7 + 3) % 20;
    const dPhase  = (t - 0.5) * 0.20;
    const dRadius = Math.sin(t * Math.PI * 2 + clusterIdx * 0.8) * 26 + (seed - 10) * 1.2;
    const dSize   = ((seed % 3) - 1) * 1.2;
    const dSpeed  = (t - 0.5) * 0.0007;
    results.push({
      id: `${idPrefix}${clusterIdx}-${i + 1}`,
      type: 'asteroid',
      parentId: 'sun',
      orbitRadius: centerRadius + dRadius,
      orbitSpeed: baseSpeed + dSpeed,
      phase: centerPhase + dPhase,
      radius: 7 + dSize,
      color: colors[(clusterIdx + i) % colors.length],
      label: `${labelPrefix}-${clusterIdx}.${i + 1}`,
    });
  }
  return results;
}

const INNER_CLUSTERS = [
  ...makeCluster('ba', 'Belt-A', 1, 0.55,            870, 0.0185),
  ...makeCluster('ba', 'Belt-A', 2, Math.PI * 0.85,  880, 0.0184),
  ...makeCluster('ba', 'Belt-A', 3, Math.PI * 1.55,  860, 0.0186),
  ...makeCluster('ba', 'Belt-A', 4, Math.PI * 0.30,  875, 0.0185),
  ...makeCluster('ba', 'Belt-A', 5, Math.PI * 1.15,  865, 0.0186),
  ...makeCluster('ba', 'Belt-A', 6, Math.PI * 1.85,  872, 0.0184),
];

const OUTER_CLUSTERS = [
  ...makeCluster('bb', 'Belt-B', 1, 0.40,            1950, -0.0124),
  ...makeCluster('bb', 'Belt-B', 2, Math.PI * 0.90,  1920, -0.0125),
  ...makeCluster('bb', 'Belt-B', 3, Math.PI * 1.55,  1980, -0.0123),
  ...makeCluster('bb', 'Belt-B', 4, Math.PI * 0.20,  1940, -0.0124),
  ...makeCluster('bb', 'Belt-B', 5, Math.PI * 1.20,  1965, -0.0124),
  ...makeCluster('bb', 'Belt-B', 6, Math.PI * 1.80,  1930, -0.0125),
];

export const BODY_DEFS = [
  // Sun — fixed at origin
  { id: 'sun', type: 'sun', parentId: null, orbitRadius: 0, orbitSpeed: 0, phase: 0, radius: 64, color: '#ffe580', label: 'Star' },

  // Inner-system shoal
  { id: 'solis',  type: 'rocky',    parentId: 'sun', orbitRadius: 460, orbitSpeed:  0.0255, phase: Math.PI * 1.10, radius: 11, color: '#9a6048', label: 'Solis' },
  { id: 'inner1', type: 'asteroid', parentId: 'sun', orbitRadius: 360, orbitSpeed:  0.0289, phase: Math.PI * 0.10, radius: 6,  color: '#a08070', label: 'Inner-1' },
  { id: 'inner2', type: 'asteroid', parentId: 'sun', orbitRadius: 545, orbitSpeed: -0.0235, phase: Math.PI * 1.85, radius: 6,  color: '#787058', label: 'Inner-2' },

  // Home planet + moons
  { id: 'keth',   type: 'rocky',    parentId: 'sun',  orbitRadius: 620, orbitSpeed:  0.022, phase: 0,                radius: 22, color: '#b08060', label: 'Keth', isHome: true },
  { id: 'kethI',  type: 'moon',     parentId: 'keth', orbitRadius: 80,  orbitSpeed:  0.12,  phase: Math.PI * 0.30,   radius: 9,  color: '#888888', label: 'Keth I' },
  { id: 'kethII', type: 'ice_moon', parentId: 'keth', orbitRadius: 130, orbitSpeed: -0.085, phase: Math.PI * 1.20,   radius: 7,  color: '#b8d4e0', label: 'Keth II' },

  // Inner asteroid belt — 6 clusters × 7 = 42 asteroids
  ...INNER_CLUSTERS,

  // Outer rocky planet
  { id: 'dera', type: 'rocky', parentId: 'sun', orbitRadius: 1050, orbitSpeed: 0.0169, phase: Math.PI * 0.65, radius: 18, color: '#c06050', label: 'Dera' },

  // Alvos — ringed giant + 4 moons (no build slots on giant itself)
  { id: 'alvos',    type: 'ringed_giant', parentId: 'sun',   orbitRadius: 1600, orbitSpeed:  0.0137, phase: Math.PI * 1.10, radius: 46, color: '#607898', label: 'Alvos' },
  { id: 'alvosI',   type: 'moon',         parentId: 'alvos', orbitRadius: 110,  orbitSpeed:  0.090,  phase: Math.PI * 1.70, radius: 11, color: '#607090', label: 'Alvos I' },
  { id: 'alvosII',  type: 'moon',         parentId: 'alvos', orbitRadius: 145,  orbitSpeed: -0.075,  phase: Math.PI * 0.40, radius: 8,  color: '#5d6886', label: 'Alvos II' },
  { id: 'alvosIII', type: 'ice_moon',     parentId: 'alvos', orbitRadius: 175,  orbitSpeed:  0.062,  phase: Math.PI * 1.05, radius: 9,  color: '#a8c8d8', label: 'Alvos III' },
  { id: 'alvosIV',  type: 'moon',         parentId: 'alvos', orbitRadius: 205,  orbitSpeed:  0.052,  phase: Math.PI * 0.85, radius: 7,  color: '#7a8aa2', label: 'Alvos IV' },

  // Outer asteroid belt — 6 clusters × 7 = 42 asteroids
  ...OUTER_CLUSTERS,

  // Miru — gas giant + 5 moons (no build slots on giant itself)
  { id: 'miru',    type: 'gas',      parentId: 'sun',  orbitRadius: 2300, orbitSpeed:  0.0114, phase: Math.PI * 1.85, radius: 58, color: '#507848', label: 'Miru' },
  { id: 'miruI',   type: 'moon',     parentId: 'miru', orbitRadius: 100,  orbitSpeed:  0.100, phase: Math.PI * 0.20, radius: 8,  color: '#487860', label: 'Miru I' },
  { id: 'miruII',  type: 'ice_moon', parentId: 'miru', orbitRadius: 140,  orbitSpeed: -0.080, phase: Math.PI * 0.95, radius: 10, color: '#b8d4d0', label: 'Miru II' },
  { id: 'miruIII', type: 'moon',     parentId: 'miru', orbitRadius: 180,  orbitSpeed:  0.065, phase: Math.PI * 1.45, radius: 9,  color: '#6a8a72', label: 'Miru III' },
  { id: 'miruIV',  type: 'moon',     parentId: 'miru', orbitRadius: 215,  orbitSpeed:  0.055, phase: Math.PI * 1.75, radius: 7,  color: '#7c9c84', label: 'Miru IV' },
  { id: 'miruV',   type: 'moon',     parentId: 'miru', orbitRadius: 248,  orbitSpeed:  0.046, phase: Math.PI * 0.55, radius: 8,  color: '#5a8068', label: 'Miru V' },
];
