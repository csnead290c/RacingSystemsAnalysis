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
 * Calculate horsepower correction factor.
 * 
 * TODO: Port from VB6 once we find the exact formula.
 * This is a placeholder that returns 1.0 (no correction).
 */
export function vb6HpCorrection(
  _baroInHg: number,
  _tempF: number,
  _humidityPct: number,
  _elevationFt: number
): number {
  // TODO: Replace with VB6 exact formula
  // Placeholder: no correction
  return 1.0;
}
