/**
 * VB6 Fixture Loader
 * 
 * Loads JSON fixtures from the vb6/fixtures directory and converts them
 * to ParityFixture format for strict parity testing.
 */

import type { ParityFixture } from '../../parity/harness';

// Import fixtures statically (Vite doesn't support dynamic JSON imports well)
import supergasData from './pro-supergas.vb6.json';
import tadragData from './pro-tadrag.vb6.json';

/**
 * VB6 fixture JSON schema
 */
export interface VB6FixtureJSON {
  meta: {
    name: string;
    strict: boolean;
    source?: string;
  };
  vb6Targets: {
    quarter: { et_s: number; mph: number };
    eighth: { et_s: number; mph: number };
  };
  env: {
    elevation_ft: number;
    barometer_inHg: number;
    temperature_F: number;
    relHumidity_pct: number;
    wind_mph: number;
    trackTemp_F: number;
    tractionIndex: number;
  };
  vehicle: {
    weight_lb: number;
    wheelbase_in: number;
    overhang_in: number;
    rollout_in: number;
    tireDiaIn?: number;
    tireRolloutIn?: number;
    tireWidthIn: number;
  };
  aero: {
    frontalArea_ft2: number;
    Cd: number;
    Cl: number;
  };
  drivetrain: {
    finalDrive: number;
    overallEfficiency: number;
    gearRatios: number[];
    perGearEff: number[];
    shiftRPM: number[];
    clutch?: {
      launchRPM: number;
      slipRPM: number;
      slippageFactor: number;
      lockup: boolean;
    };
    converter?: {
      launchRPM: number;
      stallRPM: number;
      slippageFactor: number;
      torqueMult: number;
      lockup: boolean;
    };
  };
  engineHP: [number, number][];
  fuel: {
    type: string;
    hpTorqueMultiplier: number;
  };
  pmi: {
    engine_flywheel_clutch: number;
    transmission_driveshaft: number;
    tires_wheels_ringgear: number;
  };
}

/**
 * Available fixture names
 */
export type FixtureName = 'pro-supergas' | 'pro-tadrag';

/**
 * Fixture registry
 */
const FIXTURES: Record<FixtureName, VB6FixtureJSON> = {
  'pro-supergas': supergasData as VB6FixtureJSON,
  'pro-tadrag': tadragData as VB6FixtureJSON,
};

/**
 * Load a VB6 fixture by name
 */
export function loadVB6Fixture(name: FixtureName): VB6FixtureJSON {
  const fixture = FIXTURES[name];
  if (!fixture) {
    throw new Error(`Unknown VB6 fixture: ${name}`);
  }
  return fixture;
}

/**
 * Convert VB6 fixture JSON to ParityFixture format
 */
export function toParityFixture(
  json: VB6FixtureJSON,
  distance: 'quarter' | 'eighth'
): ParityFixture {
  const distanceFt = distance === 'quarter' ? 1320 : 660;
  const targets = json.vb6Targets[distance];
  
  // Derive tire diameter from rollout if not specified
  const tireDiaIn = json.vehicle.tireDiaIn ?? 
    (json.vehicle.tireRolloutIn ? json.vehicle.tireRolloutIn / Math.PI : 28);
  
  return {
    name: `${json.meta.name}_${distance.toUpperCase()}`,
    distanceFt,
    vb6ET_s: targets.et_s,
    vb6MPH: targets.mph,
    flags: { vb6Strict: true },
    vehicle: {
      weightLb: json.vehicle.weight_lb,
      wheelbase_in: json.vehicle.wheelbase_in,
      tireDiaIn,
      tireRolloutIn: json.vehicle.tireRolloutIn ?? tireDiaIn * Math.PI,
      tireWidthIn: json.vehicle.tireWidthIn,
      rolloutIn: json.vehicle.rollout_in,
      frontalArea_ft2: json.aero.frontalArea_ft2,
      cd: json.aero.Cd,
      liftCoeff: json.aero.Cl,
      finalDrive: json.drivetrain.finalDrive,
      gearRatios: [...json.drivetrain.gearRatios],
      gearEff: [...json.drivetrain.perGearEff],
      shiftRPM: [...json.drivetrain.shiftRPM],
      transEff: json.drivetrain.overallEfficiency,
      torqueCurve: json.engineHP.map(([rpm, hp]) => ({ rpm, hp })),
      // Clutch or converter (mutually exclusive)
      clutch: json.drivetrain.clutch ? {
        launchRPM: json.drivetrain.clutch.launchRPM,
        slipRPM: json.drivetrain.clutch.slipRPM,
        slippageFactor: json.drivetrain.clutch.slippageFactor,
        lockup: json.drivetrain.clutch.lockup,
      } : undefined,
      converter: json.drivetrain.converter ? {
        launchRPM: json.drivetrain.converter.launchRPM,
        stallRPM: json.drivetrain.converter.stallRPM,
        slippageFactor: json.drivetrain.converter.slippageFactor,
        torqueMult: json.drivetrain.converter.torqueMult,
        lockup: json.drivetrain.converter.lockup,
      } : undefined,
      // PMI values
      pmi: {
        engine_flywheel_clutch: json.pmi.engine_flywheel_clutch,
        transmission_driveshaft: json.pmi.transmission_driveshaft,
        tires_wheels_ringgear: json.pmi.tires_wheels_ringgear,
      },
    },
    env: {
      elevation: json.env.elevation_ft,
      barometerInHg: json.env.barometer_inHg,
      temperatureF: json.env.temperature_F,
      humidityPct: json.env.relHumidity_pct,
      trackTempF: json.env.trackTemp_F,
      tractionIndex: json.env.tractionIndex,
    },
  };
}

/**
 * Get all available fixture names
 */
export function getAvailableFixtures(): FixtureName[] {
  return Object.keys(FIXTURES) as FixtureName[];
}
