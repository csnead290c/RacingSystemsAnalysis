/**
 * Run Correction & Weather ET Prediction — RSA two-step path.
 *
 * Correction model: RSA/QTRPERF weather correction.
 *
 * RSA Standard Day (correction target / normalisation point):
 *   elevation    0 ft
 *   barometer    29.92 inHg  (BSTD)
 *   temperature  60 °F       (TSTD = 519.67 °R)
 *   humidity     0 %         (dry air)
 *
 * Algorithm source:
 *   Direct port of QTRPERF.BAS Weather() by Patrick Hale, RSA.
 *   File: /Reference Files/OtherRefFiles/QPro Family 1_18_2023/QCommon/QTRPERF.BAS
 *   Formula:  hpc = (δ^px) / (√rgrs · θ^tx)  then  (1+mech)·kwar/hpc − mech
 *   ET prediction: ET_pred = ET_base × (hpc_target / hpc_base)^(1/3)
 *   EXACTLY REVERSIBLE: A → Standard → A = A within floating-point precision.
 *
 * Prediction path (two-step):
 *   Step 1: correctActualToStandard(actualET, baselineWeather)
 *           → standardET  ("normalise baseline to RSA Standard Day")
 *   Step 2: correctStandardToTarget(standardET, targetWeather)
 *           → predictedET ("project Standard Day to upcoming conditions")
 *
 * Wind: not included. QTRPERF.BAS Weather() has no wind input.
 *   If wind fields are present, a note is surfaced in the result for display.
 *
 * NOTE: Density Altitude is DISPLAY/REFERENCE only.
 *   Corrections are driven by temperature, humidity, barometer, elevation.
 */

import {
  calculateRsaWeatherImpact,
  computeRsaHpc,
  calculateDensityAltitude,
  calculateAirCorrection,
  type WeatherConditions,
  type WeatherImpact,
} from './weatherImpact';

export { computeRsaHpc };

/** RSA/QTRPERF weather correction. The only active correction model. */
export type CorrectionMethod = 'rsa';
export type FuelType = 'gasoline' | 'alcohol';

/** The RSA Standard Day correction target. */
export const RSA_STANDARD_DAY: Required<Pick<
  WeatherConditions,
  'temperatureF' | 'humidityPct' | 'barometerInHg' | 'elevation' | 'windMph' | 'windAngleDeg'
>> = {
  temperatureF: 60,
  humidityPct: 0,
  barometerInHg: 29.92,
  elevation: 0,
  windMph: 0,
  windAngleDeg: 0,
};

export const RSA_STANDARD_DAY_LABEL = 'RSA Standard Day';

/** Minimal env-like shape accepted from RunRecordV1.env or manual inputs. */
export interface WeatherInput {
  temperatureF: number;
  humidityPct: number;
  barometerInHg: number;
  elevation?: number;
  windMph?: number;
  windAngleDeg?: number;
}

export interface CorrectionResult {
  method: CorrectionMethod;
  /** ET normalized to the RSA Standard Day. */
  correctedET: number;
  /** correctedET - actualET (seconds; negative = standard day is quicker). */
  etChangeToStandard: number;
  /** Multiplicative factor correctedET / actualET. */
  correctionFactor: number;
  /** Per-variable breakdown of the correction. */
  breakdown: WeatherImpact[];
  /** Density altitude of the actual conditions (display only). */
  densityAltitude: number;
  /** Air (HP) correction factor of the actual conditions (display only). */
  airCorrection: number;
  standardConditions: typeof RSA_STANDARD_DAY;
  standardLabel: string;
  /** Present when wind data was supplied but excluded from RSA correction. */
  windNote?: string;
}

export interface PredictionResult {
  method: CorrectionMethod;
  /** Baseline run's actual ET. */
  baselineActualET: number;

  // ── Step 1: Baseline actual conditions → RSA Standard Day ──────────────
  /** Step 1 result: baseline ET corrected to RSA Standard Day. */
  standardET: number;
  /** Multiplicative factor for step 1 (standardET / baselineActualET). */
  factorToStandard: number;
  /** ET change in step 1 (standardET − baselineActualET). */
  etChangeToStandard: number;
  /** Per-variable breakdown for step 1 (baseline weather → RSA Standard Day). */
  breakdownToStandard: WeatherImpact[];

  // ── Step 2: RSA Standard Day → target/upcoming weather ─────────────────
  /** Step 2 result: Standard Day ET projected to target weather = predicted ET. */
  predictedET: number;
  /** Multiplicative factor for step 2 (predictedET / standardET). */
  factorToTarget: number;
  /** ET change in step 2 (predictedET − standardET). */
  etChangeToTarget: number;
  /** Per-variable breakdown for step 2 (RSA Standard Day → target weather). */
  breakdownToTarget: WeatherImpact[];

  // ── Net ─────────────────────────────────────────────────────────────────
  /** Net multiplicative factor: predictedET / baselineActualET. */
  netFactor: number;
  /** predictedET − baselineActualET (positive = slower than baseline). */
  deltaFromBaseline: number;

  // ── Display values (density altitude is reference only) ─────────────────
  baselineDensityAltitude: number;
  /** @deprecated use targetDensityAltitude */
  upcomingDensityAltitude: number;
  targetDensityAltitude: number;
  standardConditions: typeof RSA_STANDARD_DAY;
  standardLabel: string;
  /** Present when wind data was supplied but excluded from RSA correction. */
  windNote?: string;

  // ── Backward-compatible aliases ──────────────────────────────────────────
  /** Alias for standardET (used by PredictWeather.tsx and saved scenarios). */
  correctedBaselineET: number;
  /**
   * @deprecated — use breakdownToStandard or breakdownToTarget.
   * Kept for backward compat; now equals breakdownToTarget (step 2).
   */
  breakdownBaselineToUpcoming: WeatherImpact[];
}

function toConditions(w: WeatherInput): WeatherConditions {
  return {
    temperatureF: w.temperatureF,
    humidityPct: w.humidityPct,
    barometerInHg: w.barometerInHg,
    elevation: w.elevation ?? 0,
    windMph: w.windMph,
    windAngleDeg: w.windAngleDeg,
  };
}

function rsaImpact(
  from: WeatherInput,
  to: WeatherInput,
  baseET: number,
  fuelType: FuelType
) {
  return calculateRsaWeatherImpact(toConditions(from), toConditions(to), baseET, fuelType);
}

function densityAltitudeOf(w: WeatherInput): number {
  return calculateDensityAltitude(
    w.temperatureF,
    w.barometerInHg,
    w.humidityPct,
    w.elevation ?? 0
  );
}

/**
 * Step 1: Correct an actual ET (measured at `actualWeather`) back to the
 * RSA Standard Day.
 *
 * "Observed baseline run is normalized to RSA Standard Day."
 * Correction model: RSA/QTRPERF. Density altitude is display-only.
 */
export function correctActualToStandard(
  actualET: number,
  actualWeather: WeatherInput,
  fuelType: FuelType = 'gasoline',
  method: CorrectionMethod = 'rsa'
): CorrectionResult {
  void method; // 'rsa' is the only model; parameter kept for API compatibility.
  const impact = rsaImpact(
    actualWeather,    // from: actual run conditions
    RSA_STANDARD_DAY, // to:   RSA Standard Day
    actualET,
    fuelType
  );

  const correctedET = impact.predictedET;
  return {
    method: 'rsa',
    correctedET,
    etChangeToStandard: round3(correctedET - actualET),
    correctionFactor: actualET > 0 ? round5(correctedET / actualET) : 1,
    breakdown: impact.impacts,
    densityAltitude: densityAltitudeOf(actualWeather),
    airCorrection: round4(
      calculateAirCorrection(
        actualWeather.temperatureF,
        actualWeather.barometerInHg,
        actualWeather.humidityPct
      )
    ),
    standardConditions: RSA_STANDARD_DAY,
    standardLabel: RSA_STANDARD_DAY_LABEL,
    windNote: impact.windNote,
  };
}

/** Backward-compatible alias — prefer correctActualToStandard. */
export const correctToStandard = correctActualToStandard;

/**
 * Step 2: Project an RSA Standard Day ET forward to target weather conditions.
 *
 * Correction model: RSA/QTRPERF. Density altitude is display-only.
 * The RSA method is exactly reversible: A → Standard → A = A.
 */
export function correctStandardToTarget(
  standardET: number,
  targetWeather: WeatherInput,
  fuelType: FuelType = 'gasoline',
  method: CorrectionMethod = 'rsa'
): CorrectionResult {
  void method; // 'rsa' is the only model; parameter kept for API compatibility.
  const impact = rsaImpact(
    RSA_STANDARD_DAY, // from: RSA Standard Day
    targetWeather,     // to:   target/upcoming conditions
    standardET,
    fuelType
  );

  const correctedET = impact.predictedET;
  return {
    method: 'rsa',
    correctedET,
    etChangeToStandard: round3(correctedET - standardET),
    correctionFactor: standardET > 0 ? round5(correctedET / standardET) : 1,
    breakdown: impact.impacts,
    densityAltitude: densityAltitudeOf(targetWeather),
    airCorrection: round4(
      calculateAirCorrection(
        targetWeather.temperatureF,
        targetWeather.barometerInHg,
        targetWeather.humidityPct
      )
    ),
    standardConditions: RSA_STANDARD_DAY,
    standardLabel: RSA_STANDARD_DAY_LABEL,
    windNote: impact.windNote,
  };
}

/**
 * Predict ET for upcoming/target weather from a baseline run.
 *
 * Explicit RSA two-step path:
 *   Step 1: correctActualToStandard(baselineActualET, baselineWeather)
 *           → standardET
 *   Step 2: correctStandardToTarget(standardET, targetWeather)
 *           → predictedET
 *
 * Both steps, their individual factors, and per-variable breakdowns are
 * returned in the result so the full correction math is transparent.
 *
 * RSA/QTRPERF correction is exactly reversible: same-weather prediction
 * returns the original ET within rounding tolerance (≤ 0.002 s).
 */
export function predictET(args: {
  baselineActualET: number;
  baselineWeather: WeatherInput;
  upcomingWeather: WeatherInput;
  fuelType?: FuelType;
  method?: CorrectionMethod;
}): PredictionResult {
  const fuelType = args.fuelType ?? 'gasoline';
  const method = args.method ?? 'rsa';

  // Step 1 — Normalize baseline run to RSA Standard Day.
  const step1 = correctActualToStandard(
    args.baselineActualET,
    args.baselineWeather,
    fuelType,
    method
  );

  // Step 2 — Project RSA Standard Day ET to target/upcoming weather.
  const step2 = correctStandardToTarget(
    step1.correctedET,
    args.upcomingWeather,
    fuelType,
    method
  );

  const predictedET = step2.correctedET;
  const netFactor = args.baselineActualET > 0
    ? round5(predictedET / args.baselineActualET)
    : 1;

  return {
    method: 'rsa',
    baselineActualET: args.baselineActualET,
    // Step 1
    standardET: step1.correctedET,
    factorToStandard: step1.correctionFactor,
    etChangeToStandard: step1.etChangeToStandard,
    breakdownToStandard: step1.breakdown,
    // Step 2
    predictedET,
    factorToTarget: step2.correctionFactor,
    etChangeToTarget: step2.etChangeToStandard,
    breakdownToTarget: step2.breakdown,
    // Net
    netFactor,
    deltaFromBaseline: round3(predictedET - args.baselineActualET),
    // Display (DA reference only)
    baselineDensityAltitude: densityAltitudeOf(args.baselineWeather),
    upcomingDensityAltitude: densityAltitudeOf(args.upcomingWeather),
    targetDensityAltitude: densityAltitudeOf(args.upcomingWeather),
    standardConditions: RSA_STANDARD_DAY,
    standardLabel: RSA_STANDARD_DAY_LABEL,
    windNote: step2.windNote ?? step1.windNote,
    // Backward-compat aliases
    correctedBaselineET: step1.correctedET,
    breakdownBaselineToUpcoming: step2.breakdown,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}
