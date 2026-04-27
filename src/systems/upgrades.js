import {
  STATION_SHIELD_HP, STATION_SHIELD_REGEN,
} from '../entities/station.js';

// Base caps (tier 0)
const BASE_METAL_CAP = 200;
const BASE_WATER_CAP = 100;
const BASE_FUEL_CAP  = 150;
const BASE_TRANSPORT_CAP = 3;
const BASE_TERRITORY_RADIUS = 100;

export const UPGRADE_TRACKS = {
  storage: {
    label: 'STORAGE',
    max: 4,
    // cost per tier: [metal, fuel]
    costs: [[30, 0], [50, 10], [80, 20], [120, 40]],
    desc: '+50% resource caps per tier',
  },
  logistics: {
    label: 'LOGISTICS',
    max: 3,
    costs: [[40, 15], [70, 30], [110, 50]],
    desc: '+1 transport, +150 territory per tier',
  },
  refining: {
    label: 'REFINING',
    max: 3,
    costs: [[25, 0], [50, 15], [80, 30]],
    desc: '+50% refine rate, +25% extractor rate per tier',
  },
  shielding: {
    label: 'SHIELDING',
    max: 4,
    costs: [[35, 20], [60, 35], [90, 55], [130, 80]],
    desc: '+50 max shield, +1 regen/s per tier',
  },
  weapons: {
    label: 'WEAPONS',
    max: 3,
    costs: [[50, 25], [80, 45], [120, 70]],
    desc: '+25% turret range & fire rate per tier',
  },
};

export function purchaseUpgrade(state, key) {
  const track = UPGRADE_TRACKS[key];
  if (!track) return false;
  const lvl = state.upgrades[key] || 0;
  if (lvl >= track.max) return false;

  const [metalCost, fuelCost] = track.costs[lvl];
  if (state.resources.metal < metalCost) return false;
  if (state.resources.fuel < fuelCost) return false;

  state.resources.metal -= metalCost;
  state.resources.fuel  -= fuelCost;
  state.upgrades[key] = lvl + 1;

  applyUpgradeEffects(state);
  return true;
}

export function applyUpgradeEffects(state) {
  const u = state.upgrades;
  const st = state.station;

  // Storage caps
  const storageMult = 1 + 0.5 * u.storage;
  state.metalCap = Math.round(BASE_METAL_CAP * storageMult);
  state.waterCap = Math.round(BASE_WATER_CAP * storageMult);
  state.fuelCap  = Math.round(BASE_FUEL_CAP  * storageMult);

  // Logistics: transport cap + territory
  state.transportCap = BASE_TRANSPORT_CAP + u.logistics;
  state.territoryRadius = BASE_TERRITORY_RADIUS + u.logistics * 150;

  // Shielding: max shield + regen (affects live station values too)
  if (st) {
    const newMaxShield = STATION_SHIELD_HP + u.shielding * 50;
    if (newMaxShield > st.maxShieldHp) {
      const diff = newMaxShield - st.maxShieldHp;
      st.shieldHp = Math.min(newMaxShield, st.shieldHp + diff);
    }
    st.maxShieldHp = newMaxShield;
  }
}

// Used by combat.js to get current shield regen rate accounting for upgrades
export function getShieldRegen(state) {
  return STATION_SHIELD_REGEN + (state.upgrades.shielding || 0);
}

// Scale factor for turret range/fire rate from weapons upgrade
export function getWeaponsScale(state) {
  return 1 + 0.25 * (state.upgrades.weapons || 0);
}

// Scale for refining and extractor rate
export function getRefineScale(state) {
  return 1 + 0.5 * (state.upgrades.refining || 0);
}

export function getExtractorScale(state) {
  return 1 + 0.25 * (state.upgrades.refining || 0);
}
