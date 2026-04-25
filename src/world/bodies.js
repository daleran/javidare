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
  extractor: 3,
  lightTurret: 5,
  turretPlatform: 7,
  shipyard: 10,
  cryoBattery: 6,
  fortress: 12,
};

export const BUILDING_LABEL = {
  extractor: 'EXTRACTOR',
  lightTurret: 'LT TURRET',
  turretPlatform: 'TURRET',
  shipyard: 'SHIPYARD',
  cryoBattery: 'CRYO BATT',
  fortress: 'FORTRESS',
};

// Procedural belt generator — deterministic from index.
function makeBelt(idPrefix, label, count, rMin, rMax, sizeMin, sizeMax, baseSpeed, retro = false) {
  const out = [];
  const colors = ['#888070', '#706870', '#807868', '#787058', '#94806e'];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const orbitRadius = rMin + (Math.sin(i * 2.71) * 0.5 + 0.5) * (rMax - rMin);
    const phase = t * Math.PI * 2 + ((i * 31) % 70) / 100;
    const sizeFrac = ((i * 17) % 100) / 100;
    const radius = Math.round((sizeMin + sizeFrac * (sizeMax - sizeMin)) * 10) / 10;
    const speedJitter = 0.85 + ((i * 23) % 30) / 100;
    out.push({
      id: `${idPrefix}${String(i + 1).padStart(2, '0')}`,
      type: 'asteroid',
      parentId: 'sun',
      orbitRadius,
      orbitSpeed: (retro ? -1 : 1) * baseSpeed * speedJitter,
      phase,
      radius,
      color: colors[i % colors.length],
      label: `${label}-${String(i + 1).padStart(2, '0')}`,
    });
  }
  return out;
}

const INNER_SHOAL = [
  { id: 'sol1', type: 'asteroid', parentId: 'sun', orbitRadius: 340, orbitSpeed:  0.034, phase: Math.PI * 0.10, radius: 6,  color: '#a08070', label: 'Sol-A' },
  { id: 'sol2', type: 'asteroid', parentId: 'sun', orbitRadius: 405, orbitSpeed: -0.029, phase: Math.PI * 0.55, radius: 5,  color: '#806858', label: 'Sol-B' },
  { id: 'sol3', type: 'rocky',    parentId: 'sun', orbitRadius: 460, orbitSpeed:  0.027, phase: Math.PI * 1.10, radius: 11, color: '#9a6048', label: 'Solis' },
  { id: 'sol4', type: 'asteroid', parentId: 'sun', orbitRadius: 510, orbitSpeed:  0.025, phase: Math.PI * 1.50, radius: 5,  color: '#706060', label: 'Sol-D' },
  { id: 'sol5', type: 'asteroid', parentId: 'sun', orbitRadius: 540, orbitSpeed: -0.024, phase: Math.PI * 1.85, radius: 6,  color: '#787058', label: 'Sol-E' },
  { id: 'sol6', type: 'asteroid', parentId: 'sun', orbitRadius: 580, orbitSpeed:  0.023, phase: Math.PI * 0.30, radius: 5,  color: '#807060', label: 'Sol-F' },
];

const BELT_A = makeBelt('ba', 'Belt-A', 18, 800,  960,  4, 6, 0.0185);
const BELT_B = makeBelt('bb', 'Belt-B', 20, 1850, 2050, 4, 6, 0.0095, true);

export const BODY_DEFS = [
  // Sun — fixed at origin
  { id: 'sun', type: 'sun', parentId: null, orbitRadius: 0, orbitSpeed: 0, phase: 0, radius: 64, color: '#ffe580', label: 'Star' },

  // Inner-system shoal (between sun and Keth)
  ...INNER_SHOAL,

  // Home planet + moons
  { id: 'keth',   type: 'rocky',    parentId: 'sun',  orbitRadius: 620, orbitSpeed:  0.022, phase: 0,                radius: 22, color: '#b08060', label: 'Keth', isHome: true },
  { id: 'kethI',  type: 'moon',     parentId: 'keth', orbitRadius: 80,  orbitSpeed:  0.12,  phase: Math.PI * 0.30,   radius: 9,  color: '#888888', label: 'Keth I' },
  { id: 'kethII', type: 'ice_moon', parentId: 'keth', orbitRadius: 130, orbitSpeed: -0.085, phase: Math.PI * 1.20,   radius: 7,  color: '#b8d4e0', label: 'Keth II' },

  // Inner asteroid belt (between Keth and Dera)
  ...BELT_A,

  // Outer rocky planet
  { id: 'dera', type: 'rocky', parentId: 'sun', orbitRadius: 1050, orbitSpeed: 0.014, phase: Math.PI * 0.65, radius: 18, color: '#c06050', label: 'Dera' },

  // Alvos — ringed giant + 4 moons
  { id: 'alvos',    type: 'ringed_giant', parentId: 'sun',   orbitRadius: 1600, orbitSpeed:  0.008,  phase: Math.PI * 1.10, radius: 46, color: '#607898', label: 'Alvos' },
  { id: 'alvosI',   type: 'moon',         parentId: 'alvos', orbitRadius: 110,  orbitSpeed:  0.090,  phase: Math.PI * 1.70, radius: 11, color: '#607090', label: 'Alvos I' },
  { id: 'alvosII',  type: 'moon',         parentId: 'alvos', orbitRadius: 145,  orbitSpeed: -0.075,  phase: Math.PI * 0.40, radius: 8,  color: '#5d6886', label: 'Alvos II' },
  { id: 'alvosIII', type: 'ice_moon',     parentId: 'alvos', orbitRadius: 175,  orbitSpeed:  0.062,  phase: Math.PI * 1.05, radius: 9,  color: '#a8c8d8', label: 'Alvos III' },
  { id: 'alvosIV',  type: 'moon',         parentId: 'alvos', orbitRadius: 205,  orbitSpeed:  0.052,  phase: Math.PI * 0.85, radius: 7,  color: '#7a8aa2', label: 'Alvos IV' },

  // Outer asteroid belt (between Alvos and Miru)
  ...BELT_B,

  // Miru — gas giant + 5 moons
  { id: 'miru',    type: 'gas',      parentId: 'sun',  orbitRadius: 2300, orbitSpeed:  0.005, phase: Math.PI * 1.85, radius: 58, color: '#507848', label: 'Miru' },
  { id: 'miruI',   type: 'moon',     parentId: 'miru', orbitRadius: 100,  orbitSpeed:  0.100, phase: Math.PI * 0.20, radius: 8,  color: '#487860', label: 'Miru I' },
  { id: 'miruII',  type: 'ice_moon', parentId: 'miru', orbitRadius: 140,  orbitSpeed: -0.080, phase: Math.PI * 0.95, radius: 10, color: '#b8d4d0', label: 'Miru II' },
  { id: 'miruIII', type: 'moon',     parentId: 'miru', orbitRadius: 180,  orbitSpeed:  0.065, phase: Math.PI * 1.45, radius: 9,  color: '#6a8a72', label: 'Miru III' },
  { id: 'miruIV',  type: 'moon',     parentId: 'miru', orbitRadius: 215,  orbitSpeed:  0.055, phase: Math.PI * 1.75, radius: 7,  color: '#7c9c84', label: 'Miru IV' },
  { id: 'miruV',   type: 'moon',     parentId: 'miru', orbitRadius: 248,  orbitSpeed:  0.046, phase: Math.PI * 0.55, radius: 8,  color: '#5a8068', label: 'Miru V' },
];
