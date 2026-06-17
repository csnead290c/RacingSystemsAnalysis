/**
 * Weather Impact Calculator
 * Shows exactly how each weather factor affects ET
 * Similar to Crew Chief Pro's ET Change breakdown
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
}

// Standard factors for gasoline engines (from Crew Chief Pro reference)
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
