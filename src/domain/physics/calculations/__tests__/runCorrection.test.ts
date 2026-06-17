import { describe, it, expect } from 'vitest';
import {
  RSA_STANDARD_DAY,
  correctToStandard,
  predictET,
  type WeatherInput,
} from '../runCorrection';

const STANDARD: WeatherInput = {
  temperatureF: RSA_STANDARD_DAY.temperatureF,
  humidityPct: RSA_STANDARD_DAY.humidityPct,
  barometerInHg: RSA_STANDARD_DAY.barometerInHg,
  elevation: RSA_STANDARD_DAY.elevation,
};

const HOT: WeatherInput = {
  temperatureF: 95,
  humidityPct: 60,
  barometerInHg: 29.5,
  elevation: 0,
};

describe('correctToStandard', () => {
  it('returns the same ET when the run was already at standard day', () => {
    const r = correctToStandard(9.000, STANDARD);
    expect(r.correctedET).toBeCloseTo(9.0, 3);
    expect(r.etChangeToStandard).toBeCloseTo(0, 3);
    expect(r.correctionFactor).toBeCloseTo(1, 4);
  });

  it('makes a hot/humid/low-pressure run quicker on the standard day', () => {
    // Bad (slow) air corrected to standard day should reduce ET.
    const r = correctToStandard(9.500, HOT);
    expect(r.correctedET).toBeLessThan(9.5);
    expect(r.etChangeToStandard).toBeLessThan(0);
  });

  it('exposes density altitude as a display output', () => {
    const r = correctToStandard(9.5, HOT);
    expect(r.densityAltitude).toBeGreaterThan(0);
    expect(r.standardLabel).toBe('RSA Standard Day');
  });
});

describe('predictET', () => {
  it('predicts the baseline ET back exactly when upcoming weather equals baseline', () => {
    const res = predictET({
      baselineActualET: 9.123,
      baselineWeather: HOT,
      upcomingWeather: HOT,
    });
    // A single direct correction with identical weather is a no-op.
    expect(res.predictedET).toBeCloseTo(9.123, 3);
    expect(res.deltaFromBaseline).toBeCloseTo(0, 3);
  });

  it('predicts a quicker ET when upcoming air is better than the baseline', () => {
    const res = predictET({
      baselineActualET: 9.500,
      baselineWeather: HOT,
      upcomingWeather: STANDARD,
    });
    expect(res.predictedET).toBeLessThan(9.5);
    expect(res.deltaFromBaseline).toBeLessThan(0);
    // correctedBaselineET equals the prediction at standard weather.
    expect(res.predictedET).toBeCloseTo(res.correctedBaselineET, 3);
  });

  it('predicts a slower ET when upcoming air is worse than the baseline', () => {
    const res = predictET({
      baselineActualET: 9.500,
      baselineWeather: STANDARD,
      upcomingWeather: HOT,
    });
    expect(res.predictedET).toBeGreaterThan(9.5);
    expect(res.deltaFromBaseline).toBeGreaterThan(0);
  });

  it('applies a single correction (no double-correction / compounding)', () => {
    const baselineWeather = HOT;
    const upcomingWeather: WeatherInput = {
      temperatureF: 75,
      humidityPct: 40,
      barometerInHg: 29.8,
      elevation: 0,
    };
    const baselineActualET = 9.5;

    const res = predictET({ baselineActualET, baselineWeather, upcomingWeather });

    // The prediction is a single direct correction: the total ET change equals
    // the sum of the per-variable breakdown (no extra correction is folded in).
    const sumOfBreakdown = res.breakdownBaselineToUpcoming.reduce(
      (s, b) => s + b.etChange,
      0
    );
    expect(res.predictedET - baselineActualET).toBeCloseTo(sumOfBreakdown, 3);
    expect(res.deltaFromBaseline).toBeCloseTo(sumOfBreakdown, 3);
  });
});
