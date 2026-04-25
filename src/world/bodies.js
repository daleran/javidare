export const BODY_TYPE = {
  SUN: 'sun',
  ROCKY: 'rocky',
  GAS: 'gas',
  MOON: 'moon',
  ASTEROID: 'asteroid',
};

// Which building type each body type supports
export const BUILDING_FOR_BODY = {
  rocky: 'turretPlatform',
  gas: 'shipyard',
  moon: 'lightTurret',
  asteroid: 'extractor',
};

export const BUILDING_COST = {
  extractor: 3,
  lightTurret: 5,
  turretPlatform: 7,
  shipyard: 10,
};

export const BUILDING_LABEL = {
  extractor: 'EXTRACTOR',
  lightTurret: 'LT TURRET',
  turretPlatform: 'TURRET',
  shipyard: 'SHIPYARD',
};

// Body definitions — orbitSpeed in rad/s, positions computed by solarSystem.js
export const BODY_DEFS = [
  // Sun — fixed at origin
  {
    id: 'sun',
    type: 'sun',
    parentId: null,
    orbitRadius: 0,
    orbitSpeed: 0,
    phase: 0,
    radius: 64,
    color: '#ffe580',
    label: 'Star',
  },
  // Inner rocky planet — Home Planet
  {
    id: 'keth',
    type: 'rocky',
    parentId: 'sun',
    orbitRadius: 620,
    orbitSpeed: 0.022,
    phase: 0,
    radius: 22,
    color: '#b08060',
    label: 'Keth',
    isHome: true,
  },
  // Keth's moon
  {
    id: 'kethI',
    type: 'moon',
    parentId: 'keth',
    orbitRadius: 80,
    orbitSpeed: 0.12,
    phase: Math.PI * 0.3,
    radius: 9,
    color: '#888888',
    label: 'Keth I',
  },
  // Outer rocky planet
  {
    id: 'dera',
    type: 'rocky',
    parentId: 'sun',
    orbitRadius: 1050,
    orbitSpeed: 0.014,
    phase: Math.PI * 0.65,
    radius: 18,
    color: '#c06050',
    label: 'Dera',
  },
  // Inner gas giant
  {
    id: 'alvos',
    type: 'gas',
    parentId: 'sun',
    orbitRadius: 1600,
    orbitSpeed: 0.008,
    phase: Math.PI * 1.1,
    radius: 46,
    color: '#607898',
    label: 'Alvos',
  },
  // Alvos moon
  {
    id: 'alvosI',
    type: 'moon',
    parentId: 'alvos',
    orbitRadius: 110,
    orbitSpeed: 0.09,
    phase: Math.PI * 1.7,
    radius: 11,
    color: '#607090',
    label: 'Alvos I',
  },
  // Outer gas giant
  {
    id: 'miru',
    type: 'gas',
    parentId: 'sun',
    orbitRadius: 2300,
    orbitSpeed: 0.005,
    phase: Math.PI * 1.85,
    radius: 58,
    color: '#507848',
    label: 'Miru',
  },
  // Inner asteroid
  {
    id: 'ven7',
    type: 'asteroid',
    parentId: 'sun',
    orbitRadius: 870,
    orbitSpeed: -0.018,
    phase: Math.PI * 0.4,
    radius: 8,
    color: '#888070',
    label: 'Ven-7',
  },
  // Outer asteroid
  {
    id: 'ven8',
    type: 'asteroid',
    parentId: 'sun',
    orbitRadius: 1300,
    orbitSpeed: 0.011,
    phase: Math.PI * 1.3,
    radius: 7,
    color: '#706870',
    label: 'Ven-8',
  },
];
