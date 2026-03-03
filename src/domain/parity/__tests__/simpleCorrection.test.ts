/**
 * Tests for the shared simple (CF-based) correction helper.
 * applySimpleCorrection matches PHP parity_correctionFactor + parity_correctET exactly.
 * Both Driver History and Parity use correctionFactor() from weatherCorrection.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  applySimpleCorrection,
  correctionFactor,
  SimpleCorrectionInput,
} from '../weatherCorrection';

// ── Known sample data ───────────────────────────────────────────────────
const SAMPLE_WEATHER: SimpleCorrectionInput = {
  temp_f: 76.28,
  pressure_inhg: 29.323,
  rh_pct: 66,
};

describe('applySimpleCorrection', () => {
  it('computes corrected ET values for standard conditions', () => {
    const run = { ft1320: 3.700, ft660: 1.800, ft60: 0.860 };
    const result = applySimpleCorrection(SAMPLE_WEATHER, run);

    expect(result.correctionFactor).not.toBeNull();
    expect(result.correctionFactor!).toBeGreaterThan(0.9);
    expect(result.correctionFactor!).toBeLessThan(1.15);

    const cf = result.correctionFactor!;
    expect(result.corrected_ft1320).toBeCloseTo(3.700 * cf, 4);
    expect(result.corrected_ft660).toBeCloseTo(1.800 * cf, 4);
    expect(result.corrected_ft60).toBeCloseTo(0.860 * cf, 4);
  });

  it('returns all nulls when temperature is missing', () => {
    const weather: SimpleCorrectionInput = { temp_f: null, pressure_inhg: 29.92, rh_pct: 50 };
    const run = { ft1320: 3.700, ft660: 1.800, ft60: 0.860 };
    const result = applySimpleCorrection(weather, run);

    expect(result.correctionFactor).toBeNull();
    expect(result.corrected_ft1320).toBeNull();
    expect(result.corrected_ft660).toBeNull();
    expect(result.corrected_ft60).toBeNull();
  });

  it('returns all nulls when pressure is missing', () => {
    const weather: SimpleCorrectionInput = { temp_f: 76, pressure_inhg: null, rh_pct: 50 };
    const run = { ft1320: 3.700 };
    const result = applySimpleCorrection(weather, run);

    expect(result.correctionFactor).toBeNull();
    expect(result.corrected_ft1320).toBeNull();
  });

  it('handles null rh_pct by defaulting humidity to 0 (dry air)', () => {
    const weather: SimpleCorrectionInput = { temp_f: 76.28, pressure_inhg: 29.323, rh_pct: null };
    const run = { ft1320: 3.700, ft660: 1.800, ft60: 0.860 };
    const result = applySimpleCorrection(weather, run);

    expect(result.correctionFactor).not.toBeNull();
    const cfDry = result.correctionFactor!;

    const resultWet = applySimpleCorrection(SAMPLE_WEATHER, run);
    const cfWet = resultWet.correctionFactor!;

    // Dry air is denser -> lower CF; wet air less dense -> higher CF
    expect(cfDry).not.toEqual(cfWet);
    expect(cfDry).toBeLessThan(cfWet);
  });

  it('handles null ET fields gracefully', () => {
    const run = { ft1320: null, ft660: undefined, ft60: 0.860 };
    const result = applySimpleCorrection(SAMPLE_WEATHER, run);

    expect(result.correctionFactor).not.toBeNull();
    expect(result.corrected_ft1320).toBeNull();
    expect(result.corrected_ft660).toBeNull();
    expect(result.corrected_ft60).not.toBeNull();
  });

  it('handles missing ET fields gracefully', () => {
    const run = {};
    const result = applySimpleCorrection(SAMPLE_WEATHER, run);

    expect(result.correctionFactor).not.toBeNull();
    expect(result.corrected_ft1320).toBeNull();
    expect(result.corrected_ft660).toBeNull();
    expect(result.corrected_ft60).toBeNull();
  });

  it('rounds correctionFactor to 6 decimal places (matching PHP)', () => {
    const run = { ft1320: 3.700 };
    const result = applySimpleCorrection(SAMPLE_WEATHER, run);

    const cfStr = result.correctionFactor!.toString();
    const decimals = cfStr.split('.')[1] || '';
    expect(decimals.length).toBeLessThanOrEqual(6);
  });

  it('rounds corrected ET to 4 decimal places (matching PHP)', () => {
    const run = { ft1320: 3.700123456, ft660: 1.800999, ft60: 0.860111 };
    const result = applySimpleCorrection(SAMPLE_WEATHER, run);

    // Check 4 decimal precision
    const check = (v: number | null) => {
      if (v == null) return;
      const parts = v.toString().split('.');
      expect((parts[1] || '').length).toBeLessThanOrEqual(4);
    };
    check(result.corrected_ft1320);
    check(result.corrected_ft660);
    check(result.corrected_ft60);
  });
});

// ── Regression: correctionFactor matches PHP parity_correctionFactor ─────
describe('correctionFactor regression vs PHP', () => {
  it('standard day (60°F, 29.92 inHg, 0% RH) CF ≈ 1.0', () => {
    const cf = correctionFactor(29.92, 60, 0);
    expect(cf).toBeCloseTo(1.0, 2);
  });

  it('hot day (100°F, 29.0 inHg, 80% RH) CF > 1.0', () => {
    const cf = correctionFactor(29.0, 100, 0.80);
    expect(cf).toBeGreaterThan(1.0);
    expect(cf).toBeLessThan(1.20);
  });

  it('cold dense day (40°F, 30.5 inHg, 20% RH) CF < 1.0', () => {
    const cf = correctionFactor(30.5, 40, 0.20);
    expect(cf).toBeLessThan(1.0);
    expect(cf).toBeGreaterThan(0.85);
  });

  it('applySimpleCorrection CF matches raw correctionFactor', () => {
    const weather: SimpleCorrectionInput = { temp_f: 76.28, pressure_inhg: 29.323, rh_pct: 66 };
    const run = { ft1320: 3.700 };
    const result = applySimpleCorrection(weather, run);
    const rawCF = correctionFactor(29.323, 76.28, 0.66);

    // applySimpleCorrection rounds to 6dp, so check within that tolerance
    expect(result.correctionFactor).toBeCloseTo(rawCF, 5);
  });
});
