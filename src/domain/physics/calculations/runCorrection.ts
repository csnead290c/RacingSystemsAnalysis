/**
 * Run Correction & Weather ET Prediction (empirical / "RSA Standard Day")
 *
 * MVP correction method: empirical factors (wraps `calculateWeatherImpact`).
 * A `method` seam is provided so a simulation-based correction can be added
 * later without changing callers.
 *
 * Correction target = "RSA Standard Day" (the QUARTER-style standard day):
 *   - elevation   0 ft (sea level)
 *   - barometer   29.92 inHg
 *   - temperature 60 F
 *   - humidity    0 % (dry air)
 *
 * Prediction path (NO double-correction):
 *   predictedET is a SINGLE empirical correction applied directly from the
 *   baseline run's weather to the upcoming weather:
 *       baseline actual ET @ baseline weather --(apply)--> predicted ET @ upcoming
 *   deltaFromBaseline = predictedET - baselineActualET
 *
 *   The "corrected to RSA Standard Day" value (correctedBaselineET) is computed
 *   separately and shown only as a normalized reference; it is NOT chained into
 *   the prediction. Routing baseline -> standard -> upcoming would introduce a
 *   small artifact because the empirical barometer factor is asymmetric
 *   (up vs down), so we apply exactly one correction for the prediction.
 *
 * NOTE: Density Altitude is a DISPLAY/OUTPUT value only here. Predictions are
 * driven by the actual weather inputs (temperature, humidity, pressure, wind).
 */

import {
  calculateWeatherImpact,
  calculateDensityAltitude,
  calculateAirCorrection,
  type WeatherConditions,
  type WeatherImpact,
} from './weatherImpact';

export type CorrectionMethod = 'empirical' | 'sim';
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
}

export interface PredictionResult {
  method: CorrectionMethod;
  /** Baseline run's actual ET (echoed for clarity). */
  baselineActualET: number;
  /** Baseline ET normalized to RSA Standard Day. */
  correctedBaselineET: number;
  /** Predicted ET at the upcoming weather. */
  predictedET: number;
  /** predictedET - baselineActualET (seconds; positive = slower than baseline). */
  deltaFromBaseline: number;
  /** Breakdown: baseline weather -> RSA Standard Day (reference only). */
  breakdownToStandard: WeatherImpact[];
  /** Breakdown driving the prediction: baseline weather -> upcoming weather. */
  breakdownBaselineToUpcoming: WeatherImpact[];
  /** Density altitudes (display only). */
  baselineDensityAltitude: number;
  upcomingDensityAltitude: number;
  standardConditions: typeof RSA_STANDARD_DAY;
  standardLabel: string;
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

function densityAltitudeOf(w: WeatherInput): number {
  return calculateDensityAltitude(
    w.temperatureF,
    w.barometerInHg,
    w.humidityPct,
    w.elevation ?? 0
  );
}

/**
 * Correct an actual ET (run at `actualWeather`) back to the RSA Standard Day.
 */
export function correctToStandard(
  actualET: number,
  actualWeather: WeatherInput,
  fuelType: FuelType = 'gasoline',
  method: CorrectionMethod = 'empirical'
): CorrectionResult {
  // baseline = actual conditions, current = standard day; predictedET is the
  // ET we'd expect on the standard day given the actual run.
  const impact = calculateWeatherImpact(
    toConditions(actualWeather),
    toConditions(RSA_STANDARD_DAY),
    actualET,
    fuelType
  );

  const correctedET = impact.predictedET;
  const etChangeToStandard = round3(correctedET - actualET);

  return {
    method,
    correctedET,
    etChangeToStandard,
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
  };
}

/**
 * Predict ET for upcoming weather from a baseline run.
 * Path: baseline -> RSA Standard Day -> upcoming (single net correction).
 */
export function predictET(args: {
  baselineActualET: number;
  baselineWeather: WeatherInput;
  upcomingWeather: WeatherInput;
  fuelType?: FuelType;
  method?: CorrectionMethod;
}): PredictionResult {
  const fuelType = args.fuelType ?? 'gasoline';
  const method = args.method ?? 'empirical';

  // Normalized reference only: baseline corrected to the RSA Standard Day.
  const toStandard = correctToStandard(
    args.baselineActualET,
    args.baselineWeather,
    fuelType,
    method
  );

  // Prediction = a SINGLE correction applied directly from the baseline run's
  // weather to the upcoming weather. This avoids double-correction and ensures
  // an exact round-trip (zero delta) when the weather is unchanged.
  const toUpcoming = calculateWeatherImpact(
    toConditions(args.baselineWeather),
    toConditions(args.upcomingWeather),
    args.baselineActualET,
    fuelType
  );

  const predictedET = toUpcoming.predictedET;

  return {
    method,
    baselineActualET: args.baselineActualET,
    correctedBaselineET: toStandard.correctedET,
    predictedET,
    deltaFromBaseline: round3(predictedET - args.baselineActualET),
    breakdownToStandard: toStandard.breakdown,
    breakdownBaselineToUpcoming: toUpcoming.impacts,
    baselineDensityAltitude: densityAltitudeOf(args.baselineWeather),
    upcomingDensityAltitude: densityAltitudeOf(args.upcomingWeather),
    standardConditions: RSA_STANDARD_DAY,
    standardLabel: RSA_STANDARD_DAY_LABEL,
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
