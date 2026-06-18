/**
 * Weather Impact Calculator
 * Shows how each weather factor affects ET using the RSA/QTRPERF correction method.
 *
 * Pressure convention (RSA internal):
 *   All barometer values are corrected/sea-level equivalent barometric pressure
 *   expressed in inches of mercury (inHg).  This matches the value shown on a
 *   standard weather station barometer at any elevation.
 *
 *   WeatherKit (Apple Weather) provides sea-level pressure in hPa/mbar.
 *   Station/absolute pressure from a sensor at altitude is LOWER than sea-level
 *   pressure and must NOT be used directly as barometerInHg.
 *
 *   Conversion: 1 inHg = 33.8639 hPa  (exact, NIST)
 *     hPaToInHg(hPa)  = hPa  / 33.8639
 *     inHgToHPa(inHg) = inHg * 33.8639
 *
 *   If a provider gives station pressure, convert to sea-level equivalent
 *   using the hypsometric formula before passing to RSA functions.
 */

export interface WeatherConditions {
  temperatureF: number;
  humidityPct: number;
  barometerInHg: number;
  elevation?: number;
  windMph?: number;
  windAngleDeg?: number;
}

export interface WeatherImpact {
  factor: string;
  baselineValue: number;
  currentValue: number;
  difference: number;
  etChange: number;          // Positive = slower, negative = faster
  direction: 'faster' | 'slower' | 'neutral';
}

export interface WeatherImpactSummary {
  impacts: WeatherImpact[];
  totalETChange: number;
  densityAltitudeChange: number;
  airCorrectionChange: number;
  predictedET: number;
  /**
   * Set when wind data was present but excluded from correction.
   * Display this note in the UI whenever it is non-undefined.
   */
  windNote?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RSA HP Correction Factor — exact TypeScript port of the Weather() subroutine
// in QTRPERF.BAS (QCommon library), by Patrick Hale, Racing Systems Analysis.
//
// Source reference:
//   /Reference Files/OtherRefFiles/QPro Family 1_18_2023/QCommon/QTRPERF.BAS
//   Public Sub Weather(rho As Single, hpc As Single), lines 1290-1377
//
// ET prediction formula derived from TIMESLIP.FRM line 882:
//   hpmax ∝ HP_input / hpc
//   ET = K * (hpmax / W)^(-1/3)  →  ET ∝ hpc^(1/3)
//   ET_pred = ET_base × (hpc_target / hpc_base)^(1/3)
//
// This is EXACTLY REVERSIBLE:
//   A → Std: ET_std = ET_A × (1 / hpc_A)^(1/3)   [hpc_standard = 1.0]
//   Std → A: ET_A   = ET_std × hpc_A^(1/3)
//   Round-trip: ET_A × (1/hpc_A)^(1/3) × hpc_A^(1/3) = ET_A ✓
//
// ⚠  Gap: DENSITY's exact binary source is in a .CAB file (not readable).
//   The 1/3 exponent is confirmed in TIMESLIP.FRM and is the standard
//   drag-racing power-to-ET relationship used throughout RSA's code.
// ─────────────────────────────────────────────────────────────────────────────

/** RSA standard constants — same as QTRPERF.BAS. */
const RSA_TSTD  = 519.67;    // Standard temperature (°R = 60°F + 459.67)
const RSA_PSTD  = 14.696;    // Standard pressure (psia)
const RSA_BSTD  = 29.92;     // Standard barometer (inHg)
const RSA_WTAIR = 28.9669;   // Molecular weight of dry air
const RSA_WTH20 = 18.016;    // Molecular weight of water
const RSA_RSTD  = 1545.32;   // Universal gas constant (ft·lbf / lbmol·°R)

/**
 * Saturation vapor pressure polynomial coefficients (T in °F → psi).
 * From QTRPERF.BAS lines 1317-1319.  Matches steam tables to <0.01% over
 * the 35–120°F range used in drag racing.
 */
const RSA_VPCPS = [
  0.0205558,
  0.00118163,
  0.0000154988,
  0.00000040245,
  0.000000000434856,
  0.00000000002096,
] as const;

/** Fuel-specific exponents from QTRPERF.BAS lines 1356-1360. */
const RSA_FUEL_PARAMS: Record<string, { px: number; tx: number; mech: number }> = {
  gasoline: { px: 1.0, tx: 0.6, mech: 0.15 },  // Case 1: ifuel=1, icarb=1
  alcohol:  { px: 1.0, tx: 0.3, mech: 0.13 },  // Case 3: ifuel=2, icarb=1
};

/**
 * Compute the RSA HP Correction Factor (hpc) for given weather conditions.
 *
 * Direct TypeScript port of `Public Sub Weather(rho, hpc)` in QTRPERF.BAS.
 * No algorithm changes from the VB6 original.
 *
 * Convention (matches RSA DENSITY manual §5-2):
 *   hpc = 1.0  at RSA Standard Day (29.92 inHg, 60°F, 0% RH, 0 ft)
 *   hpc > 1.0  conditions WORSE than standard (engine makes LESS power)
 *   hpc < 1.0  conditions BETTER than standard (engine makes MORE power)
 *
 * @param weather  Conditions; barometer MUST be sea-level-corrected inHg.
 * @param fuelType 'gasoline' (default) or 'alcohol'.
 * @returns Dimensionless RSA HP correction factor.
 */
export function computeRsaHpc(
  weather: WeatherConditions,
  fuelType: 'gasoline' | 'alcohol' = 'gasoline'
): number {
  const T    = weather.temperatureF;
  const baro = weather.barometerInHg;
  const rh   = weather.humidityPct;
  const elev = weather.elevation ?? 0;

  // Saturation vapor pressure at dry-bulb temperature (psi)
  const T2 = T * T;
  const psdry =
    RSA_VPCPS[0] +
    RSA_VPCPS[1] * T +
    RSA_VPCPS[2] * T2 +
    RSA_VPCPS[3] * T2 * T +
    RSA_VPCPS[4] * T2 * T2 +
    RSA_VPCPS[5] * T2 * T2 * T;

  // Partial pressure of water vapor (psi)
  const PWV = (rh / 100) * psdry;

  // Ambient pressure at elevation from sea-level barometer reading (psi)
  const pamb =
    (RSA_PSTD * baro / RSA_BSTD) *
    Math.pow((RSA_TSTD - 0.00356616 * elev) / RSA_TSTD, 5.25588);

  // Dry air pressure (psi)
  const pair = pamb - PWV;

  // Dry air pressure ratio (δ)
  const delta = pair / RSA_PSTD;

  // Water-air ratio by molecular weight
  const WAR = (PWV * RSA_WTH20) / (pair * RSA_WTAIR);

  // Temperature ratio (θ)
  const theta = (T + 459.67) / RSA_TSTD;

  // Specific gas constant of humid air
  const RGAS = RSA_RSTD * ((1 / RSA_WTAIR) + (WAR / RSA_WTH20)) / (1 + WAR);
  const rgrs = RGAS / (RSA_RSTD / RSA_WTAIR);

  // Humidity correction to thermal efficiency (Taylor Vol.1 p.431, fr=1.0)
  const kwar = 1 + 2.48 * Math.pow(WAR, 1.5);

  const { px, tx, mech } = RSA_FUEL_PARAMS[fuelType] ?? RSA_FUEL_PARAMS.gasoline;

  let hpc = Math.pow(delta, px) / (Math.sqrt(rgrs) * Math.pow(theta, tx));
  hpc = (1 + mech) * kwar / hpc - mech;

  return hpc;
}

/**
 * Calculate ET correction using the RSA HP Correction Factor method.
 *
 * ET_pred = ET_base × (hpc_to / hpc_from)^(1/3)
 *
 * Per-factor breakdown is APPROXIMATE (each factor isolated while others
 * held at 'from' values).  The `predictedET` total is always the accurate
 * full-HPC result.  Individual rows will not sum to exactly totalETChange
 * due to nonlinear factor interactions — this is expected and disclosed
 * in the UI.
 *
 * Wind: not included in RSA weather correction.
 * QTRPERF.BAS Weather() has no wind input. If wind data is present it is
 * recorded in `windNote` on the result for display only.
 */
export function calculateRsaWeatherImpact(
  from: WeatherConditions,
  to: WeatherConditions,
  baseET: number,
  fuelType: 'gasoline' | 'alcohol' = 'gasoline'
): WeatherImpactSummary {
  const hpcFrom = computeRsaHpc(from, fuelType);
  const hpcTo   = computeRsaHpc(to,   fuelType);

  // Accurate total: full HPC ratio
  const predictedET   = Math.round(baseET * Math.pow(hpcTo / hpcFrom, 1 / 3) * 1000) / 1000;
  const totalETChange = Math.round((predictedET - baseET) * 1000) / 1000;

  // Approximate per-factor contributions (hold all other factors at 'from')
  const elev = to.elevation ?? from.elevation ?? 0;
  const etTempOnly  = baseET * Math.pow(computeRsaHpc({ ...from, temperatureF:  to.temperatureF  }, fuelType) / hpcFrom, 1 / 3);
  const etBaroOnly  = baseET * Math.pow(computeRsaHpc({ ...from, barometerInHg: to.barometerInHg, elevation: elev }, fuelType) / hpcFrom, 1 / 3);
  const etHumOnly   = baseET * Math.pow(computeRsaHpc({ ...from, humidityPct:   to.humidityPct   }, fuelType) / hpcFrom, 1 / 3);

  const tempChg  = Math.round((etTempOnly  - baseET) * 1000) / 1000;
  const baroChg  = Math.round((etBaroOnly  - baseET) * 1000) / 1000;
  const humChg   = Math.round((etHumOnly   - baseET) * 1000) / 1000;

  const dir = (v: number): 'faster' | 'slower' | 'neutral' =>
    v > 0.0005 ? 'slower' : v < -0.0005 ? 'faster' : 'neutral';

  const impacts: WeatherImpact[] = [
    {
      factor: 'Temperature',
      baselineValue: from.temperatureF,
      currentValue: to.temperatureF,
      difference: to.temperatureF - from.temperatureF,
      etChange: tempChg,
      direction: dir(tempChg),
    },
    {
      factor: 'Barometer',
      baselineValue: from.barometerInHg,
      currentValue: to.barometerInHg,
      difference: to.barometerInHg - from.barometerInHg,
      etChange: baroChg,
      direction: dir(baroChg),
    },
    {
      factor: 'Humidity',
      baselineValue: from.humidityPct,
      currentValue: to.humidityPct,
      difference: to.humidityPct - from.humidityPct,
      etChange: humChg,
      direction: dir(humChg),
    },
  ];

  // Wind is not included in RSA/QTRPERF weather correction.
  // The HPC formula (QTRPERF.BAS Weather()) has no wind input.
  // Record a note for the UI if wind data was provided.
  const windNote: string | undefined =
    (to.windMph !== undefined && to.windMph !== 0)
      ? 'Wind is not included in RSA weather correction.'
      : undefined;

  const baselineDA = calculateDensityAltitude(from.temperatureF, from.barometerInHg, from.humidityPct, from.elevation);
  const currentDA  = calculateDensityAltitude(to.temperatureF,   to.barometerInHg,   to.humidityPct,   to.elevation);
  const baselineAC = calculateAirCorrection(from.temperatureF, from.barometerInHg, from.humidityPct);
  const currentAC  = calculateAirCorrection(to.temperatureF,   to.barometerInHg,   to.humidityPct);

  return {
    impacts,
    totalETChange,
    densityAltitudeChange: currentDA - baselineDA,
    airCorrectionChange: Math.round((currentAC - baselineAC) * 10000) / 10000,
    predictedET,
    windNote,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy empirical weather factors (internal reference only).
// These are NOT RSA-owned math and are NOT used in the default RSA prediction
// path. They exist here only to support the legacy calculateWeatherImpact
// function below, which is kept for internal comparison purposes.
// ─────────────────────────────────────────────────────────────────────────────

const GASOLINE_FACTORS = {
  temperature: 0.00415,      // ET change per degree F
  humidity: 0.001197,        // ET change per % humidity (11.97 / 10000)
  barometerDown: 0.0997,     // ET change per inHg drop
  barometerUp: 0.0423,       // ET change per inHg rise
  headwind: 0.002,           // ET change per mph headwind
  tailwind: -0.001,          // ET change per mph tailwind
  densityAltitude: 0.000061, // ET change per foot of DA (165ft = 0.01)
};

// Alcohol engine factors
const ALCOHOL_FACTORS = {
  temperature: 0.00207,
  humidity: 0.001077,
  barometerDown: 0.1255,
  barometerUp: 0.0603,
  headwind: 0.002,
  tailwind: -0.001,
  densityAltitude: 0.000044, // 227ft = 0.01
};

/**
 * Calculate density altitude
 */
export function calculateDensityAltitude(
  tempF: number,
  baroInHg: number,
  humidityPct: number,
  elevationFt: number = 0
): number {
  // Convert to metric for calculation
  const tempC = (tempF - 32) * 5/9;
  const pressureMb = baroInHg * 33.8639;
  
  // Saturation vapor pressure (simplified) - used for humidity effect
  const es = 6.11 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC));
  void ((humidityPct / 100) * es); // Vapor pressure affects virtual temp
  
  // Pressure altitude
  const pressureAlt = (1 - Math.pow(pressureMb / 1013.25, 0.190284)) * 145366.45;
  
  // Density altitude
  const ISA_temp = 15 - (0.00198 * pressureAlt);
  const densityAlt = pressureAlt + (120 * (tempC - ISA_temp));
  
  return Math.round(densityAlt + elevationFt);
}

export interface BarometerSolveOptions {
  /** Lower bound for barometer search (inHg). */
  minInHg?: number;
  /** Upper bound for barometer search (inHg). */
  maxInHg?: number;
  /** Acceptable DA error to declare convergence (ft). */
  toleranceFt?: number;
  /** Maximum bisection iterations. */
  maxIterations?: number;
}

export interface BarometerSolveResult {
  /** Solved barometer rounded to 0.01 inHg. */
  barometerInHg: number;
  /** DA produced by the solved barometer (using calculateDensityAltitude). */
  densityAltitude: number;
  /** Whether the solver reached the target DA within tolerance. */
  converged: boolean;
  iterations: number;
}

/**
 * Invert {@link calculateDensityAltitude}: given a target density altitude plus
 * temperature, humidity and elevation, solve for the barometer (inHg) that
 * reproduces that DA under the app's own DA math.
 *
 * DA is strictly monotonic in barometer (higher pressure => lower DA), so a
 * simple bounded bisection is reliable and uses the exact same assumptions as
 * the rest of the app.
 */
export function solveBarometerForDensityAltitude(
  targetDensityAltitudeFt: number,
  tempF: number,
  humidityPct: number,
  elevationFt: number = 0,
  options: BarometerSolveOptions = {}
): BarometerSolveResult {
  const minInHg = options.minInHg ?? 24.0;
  const maxInHg = options.maxInHg ?? 31.5;
  const toleranceFt = options.toleranceFt ?? 10;
  const maxIterations = options.maxIterations ?? 100;

  const round2 = (x: number) => Math.round(x * 100) / 100;
  const daAt = (baro: number) =>
    calculateDensityAltitude(tempF, baro, humidityPct, elevationFt);

  // DA decreases as barometer increases.
  const daAtMin = daAt(minInHg); // highest achievable DA (lowest pressure)
  const daAtMax = daAt(maxInHg); // lowest achievable DA (highest pressure)

  // Target outside the achievable range: clamp to nearest bound, not converged.
  if (
    targetDensityAltitudeFt > daAtMin + toleranceFt ||
    targetDensityAltitudeFt < daAtMax - toleranceFt
  ) {
    const baro =
      Math.abs(daAtMin - targetDensityAltitudeFt) <
      Math.abs(daAtMax - targetDensityAltitudeFt)
        ? minInHg
        : maxInHg;
    const rounded = round2(baro);
    return {
      barometerInHg: rounded,
      densityAltitude: daAt(rounded),
      converged: false,
      iterations: 0,
    };
  }

  let lo = minInHg;
  let hi = maxInHg;
  let mid = (lo + hi) / 2;
  let iterations = 0;

  // Bisect to high precision on the continuous barometer value. DA changes by
  // ~11 ft per 0.01 inHg, so we resolve the barometer tightly first and only
  // then round, otherwise rounding alone could exceed the DA tolerance.
  for (; iterations < maxIterations; iterations++) {
    mid = (lo + hi) / 2;
    if (hi - lo < 1e-4) break;
    const err = daAt(mid) - targetDensityAltitudeFt;
    // DA decreasing in barometer: DA too high => need more pressure.
    if (err > 0) lo = mid;
    else hi = mid;
  }

  // Pick the 0.01 inHg value whose DA is closest to the target.
  const candidates = [
    Math.floor(mid * 100) / 100,
    Math.ceil(mid * 100) / 100,
    round2(mid),
  ];
  let best = candidates[0];
  let bestErr = Infinity;
  for (const c of candidates) {
    const e = Math.abs(daAt(c) - targetDensityAltitudeFt);
    if (e < bestErr) {
      bestErr = e;
      best = c;
    }
  }

  return {
    barometerInHg: best,
    densityAltitude: daAt(best),
    converged: bestErr <= toleranceFt,
    iterations,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pressure unit conversions
// 1 inHg = 33.8639 hPa (NIST)
// ─────────────────────────────────────────────────────────────────────────────

/** Convert hPa (millibar) to inches of mercury (inHg). */
export function hPaToInHg(hPa: number): number {
  return hPa / 33.8639;
}

/** Convert inHg to hPa (millibar). */
export function inHgToHPa(inHg: number): number {
  return inHg * 33.8639;
}

/** Convert kPa to inHg. */
export function kPaToInHg(kPa: number): number {
  return hPaToInHg(kPa * 10);
}

/**
 * Convert station (absolute) pressure to sea-level equivalent barometric
 * pressure using the simplified hypsometric formula.
 *
 * Use this when a weather sensor reports station pressure at altitude.
 * Apple WeatherKit reports sea-level pressure directly — no conversion needed.
 *
 * @param stationPressureInHg  Absolute pressure at the station elevation.
 * @param elevationFt          Station elevation above sea level (ft).
 * @param tempF                Temperature at station (°F).
 * @returns Sea-level equivalent barometric pressure (inHg).
 */
export function stationToSeaLevelInHg(
  stationPressureInHg: number,
  elevationFt: number,
  tempF: number
): number {
  const elevationM = elevationFt * 0.3048;
  const tempK = (tempF - 32) * 5 / 9 + 273.15;
  // Standard atmosphere scale height correction
  const factor = Math.exp((9.80665 * elevationM) / (287.058 * tempK));
  return stationPressureInHg * factor;
}

/**
 * Calculate air correction factor (HP correction)
 */
export function calculateAirCorrection(
  tempF: number,
  baroInHg: number,
  humidityPct: number
): number {
  // Standard conditions: 29.92 inHg, 60°F, 0% humidity
  const stdPressure = 29.92;
  const stdTempF = 60;
  
  // Pressure correction
  const pressureCorr = baroInHg / stdPressure;
  
  // Temperature correction (higher temp = less dense air)
  const tempCorr = (stdTempF + 460) / (tempF + 460);
  
  // Humidity correction (higher humidity = less oxygen)
  const humidityCorr = 1 - (humidityPct * 0.0003);
  
  return pressureCorr * tempCorr * humidityCorr;
}

/**
 * Calculate weather impact on ET
 */
export function calculateWeatherImpact(
  baseline: WeatherConditions,
  current: WeatherConditions,
  baselineET: number,
  fuelType: 'gasoline' | 'alcohol' = 'gasoline'
): WeatherImpactSummary {
  const factors = fuelType === 'gasoline' ? GASOLINE_FACTORS : ALCOHOL_FACTORS;
  const impacts: WeatherImpact[] = [];
  
  // Temperature impact
  const tempDiff = current.temperatureF - baseline.temperatureF;
  const tempETChange = tempDiff * factors.temperature;
  impacts.push({
    factor: 'Temperature',
    baselineValue: baseline.temperatureF,
    currentValue: current.temperatureF,
    difference: tempDiff,
    etChange: tempETChange,
    direction: tempETChange > 0.001 ? 'slower' : tempETChange < -0.001 ? 'faster' : 'neutral',
  });
  
  // Humidity impact
  const humidityDiff = current.humidityPct - baseline.humidityPct;
  const humidityETChange = humidityDiff * factors.humidity;
  impacts.push({
    factor: 'Humidity',
    baselineValue: baseline.humidityPct,
    currentValue: current.humidityPct,
    difference: humidityDiff,
    etChange: humidityETChange,
    direction: humidityETChange > 0.001 ? 'slower' : humidityETChange < -0.001 ? 'faster' : 'neutral',
  });
  
  // Barometer impact
  const baroDiff = current.barometerInHg - baseline.barometerInHg;
  const baroFactor = baroDiff < 0 ? factors.barometerDown : factors.barometerUp;
  const baroETChange = Math.abs(baroDiff) * baroFactor * (baroDiff < 0 ? 1 : -1);
  impacts.push({
    factor: 'Barometer',
    baselineValue: baseline.barometerInHg,
    currentValue: current.barometerInHg,
    difference: baroDiff,
    etChange: baroETChange,
    direction: baroETChange > 0.001 ? 'slower' : baroETChange < -0.001 ? 'faster' : 'neutral',
  });
  
  // Wind impact (if available)
  if (current.windMph !== undefined && current.windAngleDeg !== undefined) {
    const baseWind = baseline.windMph ?? 0;
    const baseAngle = baseline.windAngleDeg ?? 0;
    
    // Calculate headwind/tailwind component
    // 0° = headwind, 180° = tailwind
    const currentHeadwind = current.windMph * Math.cos(current.windAngleDeg * Math.PI / 180);
    const baseHeadwind = baseWind * Math.cos(baseAngle * Math.PI / 180);
    const headwindDiff = currentHeadwind - baseHeadwind;
    
    const windFactor = headwindDiff > 0 ? factors.headwind : factors.tailwind;
    const windETChange = Math.abs(headwindDiff) * Math.abs(windFactor) * (headwindDiff > 0 ? 1 : -1);
    
    impacts.push({
      factor: 'Wind',
      baselineValue: baseHeadwind,
      currentValue: currentHeadwind,
      difference: headwindDiff,
      etChange: windETChange,
      direction: windETChange > 0.001 ? 'slower' : windETChange < -0.001 ? 'faster' : 'neutral',
    });
  }
  
  // Calculate totals
  const totalETChange = impacts.reduce((sum, i) => sum + i.etChange, 0);
  
  // Density altitude change
  const baselineDA = calculateDensityAltitude(
    baseline.temperatureF,
    baseline.barometerInHg,
    baseline.humidityPct,
    baseline.elevation
  );
  const currentDA = calculateDensityAltitude(
    current.temperatureF,
    current.barometerInHg,
    current.humidityPct,
    current.elevation
  );
  
  // Air correction change
  const baselineAC = calculateAirCorrection(
    baseline.temperatureF,
    baseline.barometerInHg,
    baseline.humidityPct
  );
  const currentAC = calculateAirCorrection(
    current.temperatureF,
    current.barometerInHg,
    current.humidityPct
  );
  
  return {
    impacts,
    totalETChange: Math.round(totalETChange * 1000) / 1000,
    densityAltitudeChange: currentDA - baselineDA,
    airCorrectionChange: Math.round((currentAC - baselineAC) * 10000) / 10000,
    predictedET: Math.round((baselineET + totalETChange) * 1000) / 1000,
  };
}

/**
 * Find similar runs by density altitude
 */
export function findSimilarRunsByDA(
  targetDA: number,
  runs: Array<{ id: string; densityAltitude: number; [key: string]: unknown }>,
  tolerance: number = 200
): Array<{ id: string; densityAltitude: number; difference: number }> {
  return runs
    .filter(run => Math.abs(run.densityAltitude - targetDA) <= tolerance)
    .map(run => ({
      id: run.id,
      densityAltitude: run.densityAltitude,
      difference: run.densityAltitude - targetDA,
    }))
    .sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference));
}
