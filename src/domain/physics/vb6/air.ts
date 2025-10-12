/**
 * EXACT VB6 PORT – do not modify
 * 
 * VB6 Source: QTRPERF.BAS - Weather() subroutine (lines 1290-1335)
 * 
 * This module implements the exact VB6 air density calculation algorithm:
 * 1. Saturation vapor pressure using 6th-order polynomial (QTRPERF.BAS:1317-1323)
 * 2. Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
 * 3. Ambient pressure (barometer, no elevation correction in this version) (QTRPERF.BAS:1326)
 * 4. Partial pressure of dry air (QTRPERF.BAS:1327)
 * 5. Water-to-air mass ratio (QTRPERF.BAS:1329)
 * 6. Gas constant for moist air (QTRPERF.BAS:1333)
 * 7. Air density via ideal gas law (QTRPERF.BAS:1335)
 */

import { RANKINE_OFFSET, PSTD, BSTD, WTAIR, WTH20, RSTD } from './constants';

export type Vb6AirInputs = {
  barometer_inHg: number;   // Barometric pressure (inHg), e.g. 29.92
  temperature_F: number;    // Temperature (°F), e.g. 75
  relHumidity_pct: number;  // Relative humidity (0..100)
};

export type Vb6AirResult = {
  rho_slug_per_ft3: number; // Air density (slugs/ft³)
  pamb_psi: number;         // Ambient pressure (psi)
  PWV_psi: number;          // Water vapor pressure (psi)
  pair_psi: number;         // Dry air partial pressure (psi)
  WAR: number;              // Water-to-air mass ratio
  RGAS: number;             // Gas constant for moist air
  temp_R: number;           // Temperature (°R)
};

/**
 * Calculate air density using exact VB6 algorithm.
 * 
 * VB6 Source: QTRPERF.BAS, Weather() subroutine (lines 1290-1335)
 * 
 * @param air - Air conditions (barometer, temperature, humidity)
 * @returns Air density and intermediate values
 */
export function airDensityVB6(air: Vb6AirInputs): Vb6AirResult {
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
                cps[1] * air.temperature_F + 
                cps[2] * air.temperature_F ** 2 + 
                cps[3] * air.temperature_F ** 3 + 
                cps[4] * air.temperature_F ** 4 + 
                cps[5] * air.temperature_F ** 5;

  // Step 2: Water vapor pressure from relative humidity (QTRPERF.BAS:1325)
  // VB6: PWV = (gc_Humidity.Value / 100) * psdry
  const PWV = (air.relHumidity_pct / 100) * psdry;

  // Step 3: Ambient pressure (QTRPERF.BAS:1326, simplified - no elevation correction)
  // VB6: pamb = (PSTD * gc_Barometer.Value / BSTD) * ((TSTD - 0.00356616 * gc_Elevation.Value) / TSTD) ^ 5.25588
  // For this version, we use barometer directly (elevation correction removed for simplicity)
  const pamb = PSTD * air.barometer_inHg / BSTD;

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
  const temp_R = air.temperature_F + RANKINE_OFFSET;
  const rho = 144 * pamb / (RGAS * temp_R);

  return {
    rho_slug_per_ft3: rho,
    pamb_psi: pamb,
    PWV_psi: PWV,
    pair_psi: pair,
    WAR: WAR,
    RGAS: RGAS,
    temp_R: temp_R,
  };
}
