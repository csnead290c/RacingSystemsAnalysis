/**
 * VB6-ported atmospheric calculations.
 * Source: QTRPERF.BAS - Weather() subroutine (lines 1290-1349)
 */

import { RANKINE_OFFSET } from './constants';

/**
 * Calculate air density using VB6 exact formula.
 * 
 * VB6 Source: QTRPERF.BAS, Weather() subroutine
 * 
 * @param baroInHg - Barometric pressure (inches Hg)
 * @param tempF - Temperature (°F)
 * @param humidityPct - Relative humidity (0-100%)
 * @param elevationFt - Elevation (feet)
 * @returns Air density (slugs/ft³)
 */
export function vb6AirDensitySlugFt3(
  baroInHg: number,
  tempF: number,
  humidityPct: number,
  elevationFt: number
): number {
  // VB6 Constants from QTRPERF.BAS lines 1291-1296
  const TSTD = 519.67;      // Standard temperature (°R)
  const PSTD = 14.696;      // Standard pressure (psi)
  const BSTD = 29.92;       // Standard barometer (inHg)
  const WTAIR = 28.9669;    // Molecular weight of air
  const WTH20 = 18.016;     // Molecular weight of water
  const RSTD = 1545.32;     // Universal gas constant

  // VB6 polynomial coefficients for saturation pressure (lines 1317-1319)
  const cps = [
    0.0205558,
    0.00118163,
    0.0000154988,
    0.00000040245,
    0.000000000434856,
    0.00000000002096
  ];

  // Partial pressure of dry air from relative humidity (line 1323)
  const psdry = cps[0] + 
                cps[1] * tempF + 
                cps[2] * tempF ** 2 + 
                cps[3] * tempF ** 3 + 
                cps[4] * tempF ** 4 + 
                cps[5] * tempF ** 5;

  // Water vapor pressure (line 1325)
  const PWV = (humidityPct / 100) * psdry;

  // Ambient pressure with elevation correction (line 1326)
  const pamb = (PSTD * baroInHg / BSTD) * 
               ((TSTD - 0.00356616 * elevationFt) / TSTD) ** 5.25588;

  // Partial pressure of air (line 1327)
  const pair = pamb - PWV;

  // Water-to-air ratio (line 1329)
  const WAR = (PWV * WTH20) / (pair * WTAIR);

  // Gas constant for moist air (line 1333)
  const RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR);

  // Air density (line 1335)
  // VB6: rho = 144 * pamb / (RGAS * (tempF + 459.67))
  // Note: 144 converts psi to psf (lb/ft²)
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
