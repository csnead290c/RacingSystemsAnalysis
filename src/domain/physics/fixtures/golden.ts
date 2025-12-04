/**
 * Golden test cases for physics model parity testing.
 * These cases define expected performance ranges for different vehicle types.
 */

import type { ExtendedVehicle, SimInputs } from '../index';
import type { Env } from '../../schemas/env.schema';
import type { RaceLength } from '../../config/raceLengths';

/**
 * Golden test case definition.
 */
export interface GoldenCase {
  name: string;
  vehicle: Omit<ExtendedVehicle, 'id' | 'name' | 'defaultRaceLength'>;
  env: Env;
  raceLength: RaceLength;
  etRange: [number, number];
  mphRange: [number, number];
}

/**
 * Golden test cases for model validation.
 */
export const GOLDEN_CASES: GoldenCase[] = [
  {
    name: 'ProStockDemo',
    vehicle: {
      weightLb: 2350,
      tireDiaIn: 34.5,
      rearGear: 4.56,
      rolloutIn: 9,
      powerHP: 1400,
      frontalArea_ft2: 22,
      cd: 0.38,
      gearRatios: [2.9, 2.1, 1.6, 1.3, 1.0],
      finalDrive: 4.56,
      transEff: 0.9,
      shiftRPM: [9600, 9800, 10000, 10100],
    },
    env: {
      elevation: 0,
      temperatureF: 75,
      barometerInHg: 29.92,
      humidityPct: 50,
      tractionIndex: 0,
    },
    raceLength: 'QUARTER',
    etRange: [6.2, 7.5],
    mphRange: [180, 210],
  },
  {
    name: 'Bracket3500_450hp',
    vehicle: {
      weightLb: 3500,
      tireDiaIn: 28,
      rearGear: 3.73,
      rolloutIn: 8,
      powerHP: 450,
      frontalArea_ft2: 23,
      cd: 0.42,
      gearRatios: [2.52, 1.52, 1.0],
      finalDrive: 3.73,
      transEff: 0.9,
      shiftRPM: [5800, 5600],
    },
    env: {
      elevation: 0,
      temperatureF: 75,
      barometerInHg: 29.92,
      humidityPct: 50,
      tractionIndex: 0,
    },
    raceLength: 'QUARTER',
    etRange: [10, 14],
    mphRange: [95, 130],
  },
  // QuarterJr test case from VB6 printout (supercmp.dat)
  // Expected: 1/8 Mile: 5.59 sec @ 120.0 MPH, 1/4 Mile: 8.90 sec @ 146.2 MPH
  {
    name: 'QuarterJr_Dragster_430hp',
    vehicle: {
      weightLb: 1450,
      tireDiaIn: 32.4,
      tireWidthIn: 12.3,
      rearGear: 4.86,
      rolloutIn: 10,
      powerHP: 430,
      rpmAtPeakHP: 6700,
      displacementCID: 355,
      wheelbaseIn: 225,
      frontalAreaFt2: 14.7,
      bodyStyle: 2, // Dragster
      fuelSystem: 'Methanol+Carb',
      transmissionType: 'converter',
      gearRatios: [1.82, 1.0], // 2nd and 3rd only (starts in 2nd)
      converterStallRPM: 5500,
      converterDiameterIn: 8,
      converterLockup: false,
      shiftRPMs: [7200, 7200],
    },
    env: {
      elevation: 1200,
      temperatureF: 88,
      barometerInHg: 29.92,
      humidityPct: 35,
      tractionIndex: 5,
    },
    raceLength: 'QUARTER',
    etRange: [8.85, 8.95], // VB6: 8.90 sec
    mphRange: [145, 148],  // VB6: 146.2 MPH
  },
  {
    name: 'QuarterJr_Dragster_430hp_Eighth',
    vehicle: {
      weightLb: 1450,
      tireDiaIn: 32.4,
      tireWidthIn: 12.3,
      rearGear: 4.86,
      rolloutIn: 10,
      powerHP: 430,
      rpmAtPeakHP: 6700,
      displacementCID: 355,
      wheelbaseIn: 225,
      frontalAreaFt2: 14.7,
      bodyStyle: 2, // Dragster
      fuelSystem: 'Methanol+Carb',
      transmissionType: 'converter',
      gearRatios: [1.82, 1.0],
      converterStallRPM: 5500,
      converterDiameterIn: 8,
      converterLockup: false,
      shiftRPMs: [7200, 7200],
    },
    env: {
      elevation: 1200,
      temperatureF: 88,
      barometerInHg: 29.92,
      humidityPct: 35,
      tractionIndex: 5,
    },
    raceLength: 'EIGHTH',
    etRange: [5.55, 5.65], // VB6: 5.59 sec
    mphRange: [118, 122],  // VB6: 120.0 MPH
  },
];

/**
 * Convert a golden case to SimInputs format.
 */
export function toSimInputs(goldenCase: GoldenCase): SimInputs {
  return {
    vehicle: {
      id: `golden-${goldenCase.name}`,
      name: goldenCase.name,
      defaultRaceLength: goldenCase.raceLength,
      ...goldenCase.vehicle,
    },
    env: goldenCase.env,
    raceLength: goldenCase.raceLength,
  };
}
