export const BODY_TYPE = {
  SUN: 'sun',
  ROCKY: 'rocky',
  GAS: 'gas',
  RINGED_GIANT: 'ringed_giant',
  MOON: 'moon',
  ICE_MOON: 'ice_moon',
  ASTEROID: 'asteroid',
};

// Allowed buildings per body kind. Capacity = number of entries (each
// entry is a unique slot type, so you can't double up the same building).
export const BUILDING_FOR_BODY = {
  rocky:        ['turretPlatform'],
  gas:          ['shipyard', 'fortress'],
  ringed_giant: ['shipyard', 'fortress'],
  moon:         ['lightTurret'],
  ice_moon:     ['cryoBattery'],
  asteroid:     ['extractor'],
};

export const BUILDING_COST = {
  extractor: 6,
  lightTurret: 12,
  turretPlatform: 25,
  shipyard: 40,
  cryoBattery: 18,
  fortress: 60,
};

export const BUILDING_LABEL = {
  extractor: 'EXTRACTOR',
  lightTurret: 'LT TURRET',
  turretPlatform: 'TURRET',
  shipyard: 'SHIPYARD',
  cryoBattery: 'CRYO BATT',
  fortress: 'FORTRESS',
};

// A "cluster" is a tight knot of 3 asteroids sharing nearly the same orbit.
function makeCluster(idPrefix, labelPrefix, clusterIdx, centerPhase, centerRadius, baseSpeed) {
  const colors = ['#888070', '#807868', '#94806e'];
  const offsets = [
    { dPhase: -0.05, dRadius: -22, dSize:  0, dSpeed:  0.0004 },
    { dPhase:  0.00, dRadius:  +6, dSize: +1, dSpeed:  0.0000 },
    { dPhase:  0.06, dRadius: +18, dSize: -1, dSpeed: -0.0003 },
  ];
  return offsets.map((o, i) => ({
    id: `${idPrefix}${clusterIdx}-${i + 1}`,
    type: 'asteroid',
    parentId: 'sun',
    orbitRadius: centerRadius + o.dRadius,
    orbitSpeed: baseSpeed + o.dSpeed,
    phase: centerPhase + o.dPhase,
    radius: 7 + o.dSize,
    color: colors[(clusterIdx + i) % colors.length],
    label: `${labelPrefix}-${clusterIdx}.${i + 1}`,
  }));
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
  ...makeCluster('bb', 'Belt-B', 1, 0.40,            1950, -0.0094),
  ...makeCluster('bb', 'Belt-B', 2, Math.PI * 0.90,  1920, -0.0096),
  ...makeCluster('bb', 'Belt-B', 3, Math.PI * 1.55,  1980, -0.0093),
  ...makeCluster('bb', 'Belt-B', 4, Math.PI * 0.20,  1940, -0.0095),
  ...makeCluster('bb', 'Belt-B', 5, Math.PI * 1.20,  1965, -0.0094),
  ...makeCluster('bb', 'Belt-B', 6, Math.PI * 1.80,  1930, -0.0096),
];

const BELT_C_CLUSTERS = [
  ...makeCluster('bc', 'Belt-C', 1, 0.30,            3680, 0.0038),
  ...makeCluster('bc', 'Belt-C', 2, Math.PI * 0.75,  3720, 0.0037),
  ...makeCluster('bc', 'Belt-C', 3, Math.PI * 1.40,  3700, 0.0039),
  ...makeCluster('bc', 'Belt-C', 4, Math.PI * 1.90,  3690, 0.0038),
];

const BELT_D_CLUSTERS = [
  ...makeCluster('bd', 'Belt-D', 1, 0.65,            5180, -0.0028),
  ...makeCluster('bd', 'Belt-D', 2, Math.PI * 0.95,  5220, -0.0027),
  ...makeCluster('bd', 'Belt-D', 3, Math.PI * 1.50,  5200, -0.0029),
  ...makeCluster('bd', 'Belt-D', 4, Math.PI * 1.10,  5190, -0.0028),
];

export const BODY_DEFS = [
  // Sun — fixed at origin
  { id: 'sun', type: 'sun', parentId: null, orbitRadius: 0, orbitSpeed: 0, phase: 0, radius: 64, color: '#ffe580', label: 'Star' },

  // Inner-system shoal: a small rocky body and a couple of asteroids
  { id: 'solis',  type: 'rocky',    parentId: 'sun', orbitRadius: 460, orbitSpeed:  0.027, phase: Math.PI * 1.10, radius: 11, color: '#9a6048', label: 'Solis' },
  { id: 'inner1', type: 'asteroid', parentId: 'sun', orbitRadius: 360, orbitSpeed:  0.034, phase: Math.PI * 0.10, radius: 6,  color: '#a08070', label: 'Inner-1' },
  { id: 'inner2', type: 'asteroid', parentId: 'sun', orbitRadius: 545, orbitSpeed: -0.024, phase: Math.PI * 1.85, radius: 6,  color: '#787058', label: 'Inner-2' },

  // Home planet + moons
  { id: 'keth',   type: 'rocky',    parentId: 'sun',  orbitRadius: 620, orbitSpeed:  0.022, phase: 0,                radius: 22, color: '#b08060', label: 'Keth', isHome: true },
  { id: 'kethI',  type: 'moon',     parentId: 'keth', orbitRadius: 80,  orbitSpeed:  0.12,  phase: Math.PI * 0.30,   radius: 9,  color: '#888888', label: 'Keth I' },
  { id: 'kethII', type: 'ice_moon', parentId: 'keth', orbitRadius: 130, orbitSpeed: -0.085, phase: Math.PI * 1.20,   radius: 7,  color: '#b8d4e0', label: 'Keth II' },

  // Inner asteroid belt — 3 clusters
  ...INNER_CLUSTERS,

  // Outer rocky planet
  { id: 'dera', type: 'rocky', parentId: 'sun', orbitRadius: 1050, orbitSpeed: 0.014, phase: Math.PI * 0.65, radius: 18, color: '#c06050', label: 'Dera' },

  // Alvos — ringed giant + 4 moons
  { id: 'alvos',    type: 'ringed_giant', parentId: 'sun',   orbitRadius: 1600, orbitSpeed:  0.008,  phase: Math.PI * 1.10, radius: 46, color: '#607898', label: 'Alvos' },
  { id: 'alvosI',   type: 'moon',         parentId: 'alvos', orbitRadius: 110,  orbitSpeed:  0.090,  phase: Math.PI * 1.70, radius: 11, color: '#607090', label: 'Alvos I' },
  { id: 'alvosII',  type: 'moon',         parentId: 'alvos', orbitRadius: 145,  orbitSpeed: -0.075,  phase: Math.PI * 0.40, radius: 8,  color: '#5d6886', label: 'Alvos II' },
  { id: 'alvosIII', type: 'ice_moon',     parentId: 'alvos', orbitRadius: 175,  orbitSpeed:  0.062,  phase: Math.PI * 1.05, radius: 9,  color: '#a8c8d8', label: 'Alvos III' },
  { id: 'alvosIV',  type: 'moon',         parentId: 'alvos', orbitRadius: 205,  orbitSpeed:  0.052,  phase: Math.PI * 0.85, radius: 7,  color: '#7a8aa2', label: 'Alvos IV' },

  // Outer asteroid belt — 3 clusters
  ...OUTER_CLUSTERS,

  // Miru — gas giant + 5 moons
  { id: 'miru',    type: 'gas',      parentId: 'sun',  orbitRadius: 2300, orbitSpeed:  0.005, phase: Math.PI * 1.85, radius: 58, color: '#507848', label: 'Miru' },
  { id: 'miruI',   type: 'moon',     parentId: 'miru', orbitRadius: 100,  orbitSpeed:  0.100, phase: Math.PI * 0.20, radius: 8,  color: '#487860', label: 'Miru I' },
  { id: 'miruII',  type: 'ice_moon', parentId: 'miru', orbitRadius: 140,  orbitSpeed: -0.080, phase: Math.PI * 0.95, radius: 10, color: '#b8d4d0', label: 'Miru II' },
  { id: 'miruIII', type: 'moon',     parentId: 'miru', orbitRadius: 180,  orbitSpeed:  0.065, phase: Math.PI * 1.45, radius: 9,  color: '#6a8a72', label: 'Miru III' },
  { id: 'miruIV',  type: 'moon',     parentId: 'miru', orbitRadius: 215,  orbitSpeed:  0.055, phase: Math.PI * 1.75, radius: 7,  color: '#7c9c84', label: 'Miru IV' },
  { id: 'miruV',   type: 'moon',     parentId: 'miru', orbitRadius: 248,  orbitSpeed:  0.046, phase: Math.PI * 0.55, radius: 8,  color: '#5a8068', label: 'Miru V' },

  // Nex — outer rocky planet + 2 moons
  { id: 'nex',   type: 'rocky',    parentId: 'sun',  orbitRadius: 3200, orbitSpeed:  0.0040, phase: Math.PI * 0.45, radius: 16, color: '#7a5c4a', label: 'Nex' },
  { id: 'nexI',  type: 'moon',     parentId: 'nex',  orbitRadius: 75,   orbitSpeed:  0.095,  phase: Math.PI * 0.80, radius: 8,  color: '#7a7060', label: 'Nex I' },
  { id: 'nexII', type: 'ice_moon', parentId: 'nex',  orbitRadius: 110,  orbitSpeed: -0.070,  phase: Math.PI * 1.60, radius: 7,  color: '#aac4d4', label: 'Nex II' },

  // Belt-C — outer asteroid belt between Nex and Thal
  ...BELT_C_CLUSTERS,

  // Thal — gas giant + 3 moons
  { id: 'thal',    type: 'gas',      parentId: 'sun',  orbitRadius: 4600, orbitSpeed:  0.0026, phase: Math.PI * 1.30, radius: 52, color: '#786050', label: 'Thal' },
  { id: 'thalI',   type: 'moon',     parentId: 'thal', orbitRadius: 120,  orbitSpeed:  0.085,  phase: Math.PI * 0.60, radius: 10, color: '#887060', label: 'Thal I' },
  { id: 'thalII',  type: 'ice_moon', parentId: 'thal', orbitRadius: 160,  orbitSpeed: -0.065,  phase: Math.PI * 1.40, radius: 9,  color: '#b4ccd8', label: 'Thal II' },
  { id: 'thalIII', type: 'moon',     parentId: 'thal', orbitRadius: 195,  orbitSpeed:  0.052,  phase: Math.PI * 0.95, radius: 8,  color: '#a09078', label: 'Thal III' },

  // Belt-D — asteroid belt between Thal and Kral
  ...BELT_D_CLUSTERS,

  // Kral — ringed giant + 4 moons
  { id: 'kral',    type: 'ringed_giant', parentId: 'sun',   orbitRadius: 5800, orbitSpeed: -0.0019, phase: Math.PI * 0.70, radius: 48, color: '#607888', label: 'Kral' },
  { id: 'kralI',   type: 'moon',         parentId: 'kral',  orbitRadius: 105,  orbitSpeed:  0.088,  phase: Math.PI * 1.20, radius: 9,  color: '#506878', label: 'Kral I' },
  { id: 'kralII',  type: 'moon',         parentId: 'kral',  orbitRadius: 140,  orbitSpeed: -0.072,  phase: Math.PI * 0.35, radius: 8,  color: '#6a7888', label: 'Kral II' },
  { id: 'kralIII', type: 'ice_moon',     parentId: 'kral',  orbitRadius: 175,  orbitSpeed:  0.058,  phase: Math.PI * 1.65, radius: 9,  color: '#a8bcd0', label: 'Kral III' },
  { id: 'kralIV',  type: 'moon',         parentId: 'kral',  orbitRadius: 210,  orbitSpeed:  0.048,  phase: Math.PI * 0.90, radius: 7,  color: '#788898', label: 'Kral IV' },

  // Veth — distant ice world + 2 ice moons
  { id: 'veth',   type: 'rocky',    parentId: 'sun',  orbitRadius: 7200, orbitSpeed:  0.0013, phase: Math.PI * 1.50, radius: 20, color: '#8ab4c8', label: 'Veth' },
  { id: 'vethI',  type: 'ice_moon', parentId: 'veth', orbitRadius: 85,   orbitSpeed:  0.080,  phase: Math.PI * 0.70, radius: 9,  color: '#c4d8e8', label: 'Veth I' },
  { id: 'vethII', type: 'ice_moon', parentId: 'veth', orbitRadius: 120,  orbitSpeed: -0.060,  phase: Math.PI * 1.40, radius: 7,  color: '#b0cce0', label: 'Veth II' },
];
