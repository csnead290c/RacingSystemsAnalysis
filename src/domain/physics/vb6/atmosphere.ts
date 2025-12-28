/**
 * VB6-ported atmospheric calculations.
 * Source: QTRPERF.BAS - Weather() subroutine (lines 1290-1349)
 * 
 * This module implements the exact VB6 air density calculation including:
 * - Saturation vapor pressure polynomial (6th order)
 * - Humidity effects on air density
 * - Elevation correction using standard atmosphere
 * - Moist air gas constant calculation
 */

import { RANKINE_OFFSET, TSTD, PSTD, BSTD, WTAIR, WTH20, RSTD } from './constants';

/**
 * Calculate air density using VB6 exact formula.
 * 
 * VB6 Source: QTRPERF.BAS, Weather() subroutine (lines 1290-1335)
 * 
 * Algorithm (in VB6 order):
 * 1. Compute saturation vapor pressure (psdry) using 6th-order polynomial
 * 2. Compute water vapor pressure (PWV) from relative humidity
 * 3. Compute ambient pressure (pamb) with elevation correction
 * 4. Compute dry air pressure (pair = pamb - PWV)
 * 5. Compute water-to-air ratio (WAR)
 * 6. Compute gas constant for moist air (RGAS)
 * 7. Compute air density (rho) using ideal gas law
 * 
 * @param baroInHg - Barometric pressure at station (inches Hg)
 * @param tempF - Temperature (°F)
 * @param humidityPct - Relative humidity (0-100%)
 * @param elevationFt - Elevation above sea level (feet)
 * @returns Air density (slugs/ft³)
 */
export function vb6AirDensitySlugFt3(
  baroInHg: number,
  tempF: number,
  humidityPct: number,
  elevationFt: number
): number {
  // VB6 polynomial coefficients for saturation vapor pressure (QTRPERF.BAS:1317-1319)
  // Static cps(1 To 6) As Double
  // cps(1) = 0.0205558:             cps(2) = 0.00118163
  // cps(3) = 0.0000154988:          cps(4) = 0.00000040245
  // cps(5) = 0.000000000434856:     cps(6) = 0.00000000002096
  const cps = [
    0.0205558,           // cps(1)
    0.00118163,          // cps(2)
    0.0000154988,        // cps(3)
    0.00000040245,       // cps(4)
    0.000000000434856,   // cps(5)
    0.00000000002096     // cps(6)
  ];

  // Step 1: Saturation vapor pressure (QTRPERF.BAS:1323)
  // VB6: psdry = cps(1) + cps(2) * gc_Temperature.Value + cps(3) * gc_Temperature.Value ^ 2 + ...
  const psdry = cps[0] + 
                cps[1] * tempF + 
                cps[2] * tempF ** 2 + 
                cps[3] * tempF ** 3 + 
                cps[4] * tempF ** 4 + 
                cps[5] * tempF ** 5;

  // Step 2: Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
  // VB6: PWV = (gc_Humidity.Value / 100) * psdry
  const PWV = (humidityPct / 100) * psdry;

  // Step 3: Ambient pressure with elevation correction (QTRPERF.BAS:1326)
  // VB6: pamb = (PSTD * gc_Barometer.Value / BSTD) * ((TSTD - 0.00356616 * gc_Elevation.Value) / TSTD) ^ 5.25588
  // Uses standard atmosphere lapse rate: 0.00356616 °R/ft
  // Exponent 5.25588 is from standard atmosphere model
  const pamb = (PSTD * baroInHg / BSTD) * 
               ((TSTD - 0.00356616 * elevationFt) / TSTD) ** 5.25588;

  // Step 4: Partial pressure of dry air (QTRPERF.BAS:1327)
  // VB6: pair = pamb - PWV
  const pair = pamb - PWV;

  // Step 5: Water-to-air mass ratio (QTRPERF.BAS:1329)
  // VB6: WAR = (PWV * WTH20) / (pair * WTAIR)
  const WAR = (PWV * WTH20) / (pair * WTAIR);

  // Step 6: Gas constant for moist air (QTRPERF.BAS:1333)
  // VB6: RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
  const RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR);

  // Step 7: Air density using ideal gas law (QTRPERF.BAS:1335)
  // VB6: rho = 144 * pamb / (RGAS * (gc_Temperature.Value + 459.67))
  // Note: 144 converts psi to psf (lb/ft²), since pamb is in psi
  // Result is in slugs/ft³ (mass density)
  const rho = 144 * pamb / (RGAS * (tempF + RANKINE_OFFSET));

  return rho;
}

/**
 * Calculate horsepower correction factor (hpc).
 * 
 * VB6 Source: QTRPERF.BAS, Weather() subroutine (lines 1290-1377)
 * 
 * This is the complete VB6 hpc calculation including:
 * - Fuel type effects (gas, methanol, nitro)
 * - Carburetion type effects (carb, injector, supercharger)
 * - Temperature and pressure corrections
 * - Water-to-air ratio (humidity) effects
 * 
 * @param baroInHg - Barometric pressure at station (inches Hg)
 * @param tempF - Temperature (°F)
 * @param humidityPct - Relative humidity (0-100%)
 * @param elevationFt - Elevation above sea level (feet)
 * @param fuelSystem - Fuel system type (1-9)
 * @returns HP correction factor (multiply dyno HP by this to get actual HP)
 */
export function vb6HpCorrection(
  baroInHg: number,
  tempF: number,
  humidityPct: number,
  elevationFt: number,
  fuelSystem: number = 1
): number {
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
                cps[1] * tempF + 
                cps[2] * tempF ** 2 + 
                cps[3] * tempF ** 3 + 
                cps[4] * tempF ** 4 + 
                cps[5] * tempF ** 5;

  // Step 2: Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
  const PWV = (humidityPct / 100) * psdry;

  // Step 3: Ambient pressure with elevation correction (QTRPERF.BAS:1326)
  const pamb = (PSTD * baroInHg / BSTD) * 
               ((TSTD - 0.00356616 * elevationFt) / TSTD) ** 5.25588;

  // Step 4: Partial pressure of dry air (QTRPERF.BAS:1327-1328)
  const pair = pamb - PWV;
  const delta = pair / PSTD;

  // Step 5: Water-to-air mass ratio (QTRPERF.BAS:1329)
  const WAR = (PWV * WTH20) / (pair * WTAIR);

  // Step 6: Theta and gas constant ratio (QTRPERF.BAS:1332-1334)
  const theta = (tempF + 459.67) / TSTD;
  const RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR);
  const rgrs = RGAS / (RSTD / WTAIR);

  // Step 7: Set ifuel and icarb values (QTRPERF.BAS:1341-1350)
  // ifuel: 1=gas, 2=methanol, 3=nitro
  // icarb: 1=carb, 2=injector, 3=supercharger
  let ifuel: number;
  let icarb: number;
  
  switch (fuelSystem) {
    case 1:  ifuel = 1; icarb = 1; break;  // Gasoline Carburetor
    case 2:  ifuel = 1; icarb = 2; break;  // Gasoline Injector
    case 3:  ifuel = 2; icarb = 1; break;  // Methanol Carburetor
    case 4:  ifuel = 2; icarb = 2; break;  // Methanol Injector
    case 5:  ifuel = 3; icarb = 2; break;  // Nitromethane Injector
    case 6:  ifuel = 1; icarb = 3; break;  // Supercharged Gasoline
    case 7:
    case 9:  ifuel = 2; icarb = 3; break;  // Supercharged Methanol / Flat Rate
    case 8:  ifuel = 3; icarb = 3; break;  // Supercharged Nitro
    default: ifuel = 1; icarb = 1; break;
  }

  // Step 8: Eliminate loss in thermal efficiency due to WAR (QTRPERF.BAS:1354)
  const kwar = 1 + 2.48 * WAR ** 1.5;

  // Step 9: Set fuel-specific parameters (QTRPERF.BAS:1356-1360)
  let px: number;
  let tx: number;
  let mech: number;
  
  switch (ifuel) {
    case 1:  px = 1;    tx = 0.6;  mech = 0.15;  break;  // Gas
    case 2:  px = 1;    tx = 0.3;  mech = 0.13;  break;  // Methanol
    case 3:  px = 0.85; tx = 0.5;  mech = 0.055; break;  // Nitro
    default: px = 1;    tx = 0.6;  mech = 0.15;  break;
  }

  // Step 10: Injector adjustment (QTRPERF.BAS:1362)
  if (icarb === 2) {
    mech = mech - 0.005;
  }

  // Step 11: Supercharger adjustment (QTRPERF.BAS:1364-1371)
  if (icarb === 3) {
    px = 0.95;
    let dtx = (1.35 - 1) / 1.35;
    dtx = dtx / 0.85;
    px = px - dtx * tx;
    tx = tx + dtx;
    mech = 0.6 * mech;
  }

  // Step 12: Calculate hpc (QTRPERF.BAS:1373-1374)
  let hpc = (delta ** px) / (Math.sqrt(rgrs) * (theta ** tx));
  hpc = (1 + mech) * kwar / hpc - mech;

  // Step 13: Flat rate engine override (QTRPERF.BAS:1376)
  if (fuelSystem === 9) {
    hpc = 1;
  }

  return hpc;
}
