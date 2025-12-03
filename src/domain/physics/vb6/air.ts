/**
 * EXACT VB6 PORT – do not modify
 * 
 * VB6 Source: QTRPERF.BAS - Weather() subroutine (lines 1290-1377)
 * 
 * This module implements the exact VB6 air density and HP correction calculation:
 * 1. Saturation vapor pressure using 6th-order polynomial (QTRPERF.BAS:1317-1323)
 * 2. Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
 * 3. Ambient pressure with elevation correction (QTRPERF.BAS:1326)
 * 4. Partial pressure of dry air (QTRPERF.BAS:1327)
 * 5. Water-to-air mass ratio (QTRPERF.BAS:1329)
 * 6. Gas constant for moist air (QTRPERF.BAS:1333)
 * 7. Air density via ideal gas law (QTRPERF.BAS:1335)
 * 8. HP correction factor (hpc) based on fuel/carburetion (QTRPERF.BAS:1341-1376)
 */

import { RANKINE_OFFSET, PSTD, BSTD, WTAIR, WTH20, RSTD, TSTD } from './constants';

/** Fuel system types matching VB6 gc_FuelSystem.Value */
export type FuelSystemType = 
  | 1   // Gas + Carb
  | 2   // Gas + Injector
  | 3   // Methanol + Carb
  | 4   // Methanol + Injector
  | 5   // Nitro + Injector
  | 6   // Gas + Supercharger
  | 7   // Methanol + Supercharger
  | 8   // Nitro + Supercharger
  | 9;  // Electric (hpc = 1)

export type Vb6AirInputs = {
  barometer_inHg: number;   // Barometric pressure (inHg), e.g. 29.92
  temperature_F: number;    // Temperature (°F), e.g. 75
  relHumidity_pct: number;  // Relative humidity (0..100)
  elevation_ft?: number;    // Elevation (ft), default 0
  fuelSystem?: FuelSystemType; // Fuel system type, default 1 (Gas + Carb)
};

export type Vb6AirResult = {
  rho_slug_per_ft3: number; // Air density (slugs/ft³)
  pamb_psi: number;         // Ambient pressure (psi)
  PWV_psi: number;          // Water vapor pressure (psi)
  pair_psi: number;         // Dry air partial pressure (psi)
  WAR: number;              // Water-to-air mass ratio
  RGAS: number;             // Gas constant for moist air
  temp_R: number;           // Temperature (°R)
  hpc: number;              // HP correction factor (1.0 = standard conditions)
  delta: number;            // Pressure ratio (pair / PSTD)
  theta: number;            // Temperature ratio (temp_R / TSTD)
  rgrs: number;             // Gas constant ratio
};

/**
 * Calculate air density and HP correction using exact VB6 algorithm.
 * 
 * VB6 Source: QTRPERF.BAS, Weather() subroutine (lines 1290-1377)
 * 
 * @param air - Air conditions (barometer, temperature, humidity, elevation, fuel system)
 * @returns Air density, HP correction factor, and intermediate values
 */
export function airDensityVB6(air: Vb6AirInputs): Vb6AirResult {
  const elevation_ft = air.elevation_ft ?? 0;
  const fuelSystem = air.fuelSystem ?? 1;
  
  // VB6 polynomial coefficients for saturation vapor pressure (QTRPERF.BAS:1317-1319)
  const cps = [
    0.0205558,           // cps(1)
    0.00118163,          // cps(2)
    0.0000154988,        // cps(3)
    0.00000040245,       // cps(4)
    0.000000000434856,   // cps(5)
    0.00000000002096     // cps(6)
  ];

  // Step 1: Saturation vapor pressure (QTRPERF.BAS:1323)
  const psdry = cps[0] + 
                cps[1] * air.temperature_F + 
                cps[2] * air.temperature_F ** 2 + 
                cps[3] * air.temperature_F ** 3 + 
                cps[4] * air.temperature_F ** 4 + 
                cps[5] * air.temperature_F ** 5;

  // Step 2: Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
  const PWV = (air.relHumidity_pct / 100) * psdry;

  // Step 3: Ambient pressure WITH elevation correction (QTRPERF.BAS:1326)
  // VB6: pamb = (PSTD * gc_Barometer.Value / BSTD) * ((TSTD - 0.00356616 * gc_Elevation.Value) / TSTD) ^ 5.25588
  const elevationFactor = Math.pow((TSTD - 0.00356616 * elevation_ft) / TSTD, 5.25588);
  const pamb = (PSTD * air.barometer_inHg / BSTD) * elevationFactor;

  // Step 4: Partial pressure of dry air (QTRPERF.BAS:1327-1328)
  const pair = pamb - PWV;
  const delta = pair / PSTD;

  // Step 5: Water-to-air mass ratio (QTRPERF.BAS:1329)
  const WAR = (PWV * WTH20) / (pair * WTAIR);

  // Step 6: Gas constant for moist air (QTRPERF.BAS:1333-1334)
  const RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR);
  const rgrs = RGAS / (RSTD / WTAIR);

  // Step 7: Temperature ratio and air density (QTRPERF.BAS:1332, 1335)
  const temp_R = air.temperature_F + RANKINE_OFFSET;
  const theta = temp_R / TSTD;
  const rho_lbm_ft3 = 144 * pamb / (RGAS * temp_R);
  const rho = rho_lbm_ft3 / 32.174; // Convert lbm/ft³ to slugs/ft³

  // Step 8: HP correction factor (QTRPERF.BAS:1341-1376)
  // Determine fuel and carburetion type
  let ifuel: number;
  let icarb: number;
  
  switch (fuelSystem) {
    case 1:  ifuel = 1; icarb = 1; break; // Gas + Carb
    case 2:  ifuel = 1; icarb = 2; break; // Gas + Injector
    case 3:  ifuel = 2; icarb = 1; break; // Methanol + Carb
    case 4:  ifuel = 2; icarb = 2; break; // Methanol + Injector
    case 5:  ifuel = 3; icarb = 2; break; // Nitro + Injector
    case 6:  ifuel = 1; icarb = 3; break; // Gas + Supercharger
    case 7:
    case 9:  ifuel = 2; icarb = 3; break; // Methanol + Supercharger (9 = Electric, but same calc)
    case 8:  ifuel = 3; icarb = 3; break; // Nitro + Supercharger
    default: ifuel = 1; icarb = 1; break;
  }
  
  // VB6: kwar = 1 + 2.48 * WAR ^ 1.5 (QTRPERF.BAS:1354)
  const kwar = 1 + 2.48 * Math.pow(WAR, 1.5);
  
  // Fuel-specific coefficients (QTRPERF.BAS:1356-1360)
  let px: number;
  let tx: number;
  let mech: number;
  
  switch (ifuel) {
    case 1: px = 1;    tx = 0.6;  mech = 0.15;  break; // Gas
    case 2: px = 1;    tx = 0.3;  mech = 0.13;  break; // Methanol
    case 3: px = 0.85; tx = 0.5;  mech = 0.055; break; // Nitro
    default: px = 1;   tx = 0.6;  mech = 0.15;  break;
  }
  
  // Injector adjustment (QTRPERF.BAS:1362)
  if (icarb === 2) {
    mech = mech - 0.005;
  }
  
  // Supercharger adjustment (QTRPERF.BAS:1364-1371)
  if (icarb === 3) {
    const dtx = ((1.35 - 1) / 1.35) / 0.85;
    px = 0.95 - dtx * tx;
    tx = tx + dtx;
    mech = 0.6 * mech;
  }
  
  // Calculate hpc (QTRPERF.BAS:1373-1374)
  // hpc = delta ^ px / (Sqr(rgrs) * theta ^ tx)
  // hpc = (1 + mech) * kwar / hpc - mech
  let hpc = Math.pow(delta, px) / (Math.sqrt(rgrs) * Math.pow(theta, tx));
  hpc = (1 + mech) * kwar / hpc - mech;
  
  // Electric override (QTRPERF.BAS:1376)
  if (fuelSystem === 9) {
    hpc = 1;
  }

  return {
    rho_slug_per_ft3: rho,
    pamb_psi: pamb,
    PWV_psi: PWV,
    pair_psi: pair,
    WAR: WAR,
    RGAS: RGAS,
    temp_R: temp_R,
    hpc: hpc,
    delta: delta,
    theta: theta,
    rgrs: rgrs,
  };
}
