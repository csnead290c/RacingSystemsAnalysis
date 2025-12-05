/**
 * Drag Dyno Calculator - VB6 Port
 * Ported from VB6 DragDyno source code (Module1.bas)
 * 
 * Quick ET and MPH estimator based on:
 * - Vehicle weight
 * - Engine horsepower
 * - HP correction factor
 * - Transmission type
 * - Race style
 * 
 * Uses empirical equations developed by RSA circa 1978-2000
 */

// ============================================================================
// INTERFACES
// ============================================================================

export type RaceStyle = 'full_race' | 'pro_street' | 'street';
export type TransmissionType = 'manual' | 'automatic';

export interface DragDynoInput {
  /** Vehicle weight including driver (lbs) */
  weight: number;
  /** Engine horsepower */
  horsepower: number;
  /** HP correction factor (typically 0.95-1.35) */
  hpCorrectionFactor: number;
  /** Race style affects efficiency */
  raceStyle: RaceStyle;
  /** Transmission type */
  transmissionType: TransmissionType;
}

export interface DragDynoResult {
  /** Estimated 1/8 mile ET (seconds) */
  et660: number;
  /** Estimated 1/8 mile MPH */
  mph660: number;
  /** Estimated 1/4 mile ET (seconds) */
  et1320: number;
  /** Estimated 1/4 mile MPH */
  mph1320: number;
  /** Corrected HP/Weight ratio used in calculation */
  hpPerWeight: number;
  /** Transmission efficiency factor */
  transmissionEfficiency: number;
  /** Race style efficiency factor */
  raceEfficiency: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RACE_EFFICIENCY: Record<RaceStyle, number> = {
  'full_race': 1.00,
  'pro_street': 0.93,
  'street': 0.84,
};

const TRANS_EFFICIENCY: Record<TransmissionType, number> = {
  'manual': 1.00,
  'automatic': 0.92,
};

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate estimated ET and MPH
 * Complete port of VB6 CalcPerf subroutine
 * 
 * Uses modified equations from original RSA (circa 1978, Car Craft June 1986)
 * Updated circa 1990 and modified for HPC and D3.0 exponents 06/05/00
 */
export function calculateDragDyno(input: DragDynoInput): DragDynoResult {
  // Get efficiency factors
  const transEff = TRANS_EFFICIENCY[input.transmissionType];
  const raceEff = RACE_EFFICIENCY[input.raceStyle];
  
  // Calculate corrected HP per weight
  // HP is divided by correction factor to get actual HP at track conditions
  const correctedHp = input.horsepower / input.hpCorrectionFactor;
  const effectiveHp = transEff * raceEff * correctedHp;
  const hpqwt = effectiveHp / input.weight;
  
  // Original RSA equations - circa 1978 (Car Craft - June 1986)
  // T660 = 3.75 * HPQWT ^ -0.33
  // MPH660 = 186 * HPQWT ^ 0.33
  // ET = 5.82 * HPQWT ^ -0.33
  // MPH = 234 * HPQWT ^ 0.33
  
  // Updated equations - circa 1990
  // T660 = 1.05 + 2.96 * HPQWT ^ -0.33
  // MPH660 = 10 + 173 * HPQWT ^ 0.33
  // ET = 1.05 + 4.99 * HPQWT ^ -0.33
  // MPH = 10 + 221 * HPQWT ^ 0.33
  
  // Modified to account for HPC and D3.0 exponents 06/05/00
  const t660 = 1.05 + 2.84 * Math.pow(hpqwt, -0.34);
  const mph660 = 10 + 180 * Math.pow(hpqwt, 0.32);
  const et = 1.05 + 4.83 * Math.pow(hpqwt, -0.33);
  const mph = 10 + 227 * Math.pow(hpqwt, 0.31);
  
  return {
    et660: Math.round(t660 * 100) / 100,
    mph660: Math.round(mph660 * 10) / 10,
    et1320: Math.round(et * 100) / 100,
    mph1320: Math.round(mph * 10) / 10,
    hpPerWeight: Math.round(hpqwt * 10000) / 10000,
    transmissionEfficiency: transEff,
    raceEfficiency: raceEff,
  };
}

/**
 * Reverse calculation: estimate HP from ET
 */
export function estimateHpFromEt(
  et1320: number,
  weight: number,
  hpCorrectionFactor: number,
  raceStyle: RaceStyle,
  transmissionType: TransmissionType
): number {
  // Solve: ET = 1.05 + 4.83 * HPQWT ^ -0.33
  // HPQWT = ((ET - 1.05) / 4.83) ^ (-1/0.33)
  const hpqwt = Math.pow((et1320 - 1.05) / 4.83, -1 / 0.33);
  
  const transEff = TRANS_EFFICIENCY[transmissionType];
  const raceEff = RACE_EFFICIENCY[raceStyle];
  
  // Work backwards to get HP
  const effectiveHp = hpqwt * weight;
  const correctedHp = effectiveHp / (transEff * raceEff);
  const hp = correctedHp * hpCorrectionFactor;
  
  return Math.round(hp);
}

/**
 * Reverse calculation: estimate HP from MPH
 */
export function estimateHpFromMph(
  mph1320: number,
  weight: number,
  hpCorrectionFactor: number,
  raceStyle: RaceStyle,
  transmissionType: TransmissionType
): number {
  // Solve: MPH = 10 + 227 * HPQWT ^ 0.31
  // HPQWT = ((MPH - 10) / 227) ^ (1/0.31)
  const hpqwt = Math.pow((mph1320 - 10) / 227, 1 / 0.31);
  
  const transEff = TRANS_EFFICIENCY[transmissionType];
  const raceEff = RACE_EFFICIENCY[raceStyle];
  
  // Work backwards to get HP
  const effectiveHp = hpqwt * weight;
  const correctedHp = effectiveHp / (transEff * raceEff);
  const hp = correctedHp * hpCorrectionFactor;
  
  return Math.round(hp);
}

/**
 * Default drag dyno input
 */
export const defaultDragDynoInput: DragDynoInput = {
  weight: 3200,
  horsepower: 600,
  hpCorrectionFactor: 1.000,
  raceStyle: 'full_race',
  transmissionType: 'manual',
};
