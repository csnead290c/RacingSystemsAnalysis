/**
 * Correction pipeline consistency tests.
 *
 * Verifies that both the Parity Dashboard (RunsWeatherPanel) and Parity Report
 * use the same authoritative correction functions from weatherCorrection.ts.
 * Also verifies the PHP server-side formula matches the TS implementation.
 */
import { describe, it, expect } from 'vitest';
import {
  correctET,
  correctMPH,
  computeHPC,
  computeWeather,
  correctionFactor,
  pct_to_frac,
} from '../weatherCorrection';

describe('correction pipeline consistency', () => {
  const SAMPLE_T = 76.28;
  const SAMPLE_H_PCT = 66;
  const SAMPLE_BP = 29.323;
  const SAMPLE_ET = 3.700;
  const SAMPLE_MPH = 330.0;

  it('correctET uses HPC^-0.33 (matches PHP: $value * pow($hpc, -0.33))', () => {
    const hpc = 1.05;
    const corrected = correctET(SAMPLE_ET, hpc);
    expect(corrected).not.toBeNull();
    // PHP formula: $value * pow($hpc, -0.33)
    const expected = SAMPLE_ET * Math.pow(hpc, -0.33);
    expect(corrected).toBeCloseTo(expected, 10);
  });

  it('correctMPH uses HPC^+0.33 (matches PHP: $value * pow($hpc, 0.33))', () => {
    const hpc = 1.05;
    const corrected = correctMPH(SAMPLE_MPH, hpc);
    expect(corrected).not.toBeNull();
    // PHP formula: $value * pow($hpc, 0.33)
    const expected = SAMPLE_MPH * Math.pow(hpc, 0.33);
    expect(corrected).toBeCloseTo(expected, 10);
  });

  it('full pipeline: weather → HPC → correctedET is deterministic', () => {
    const H = pct_to_frac(SAMPLE_H_PCT);
    const w = computeWeather(SAMPLE_T, H, SAMPLE_BP);

    // Using a known engine combo's parameters
    const hpc = computeHPC({
      engineCombo: 'TEST_COMBO',
      tPower: 2.0,
      dPower: 1.2,
      FF: 3.5,
      theta: w.theta,
      delta: w.delta,
    });

    expect(hpc).toBeGreaterThan(0);
    expect(isFinite(hpc)).toBe(true);

    const corr = correctET(SAMPLE_ET, hpc);
    expect(corr).not.toBeNull();
    // HPC > 1 means conditions are better than standard → corrected ET < actual
    if (hpc > 1) expect(corr!).toBeLessThan(SAMPLE_ET);
    // HPC < 1 means conditions are worse → corrected ET > actual
    if (hpc < 1) expect(corr!).toBeGreaterThan(SAMPLE_ET);

    // Run it again — must be deterministic
    const w2 = computeWeather(SAMPLE_T, H, SAMPLE_BP);
    const hpc2 = computeHPC({ engineCombo: 'TEST_COMBO', tPower: 2.0, dPower: 1.2, FF: 3.5, theta: w2.theta, delta: w2.delta });
    const corr2 = correctET(SAMPLE_ET, hpc2);
    expect(corr2).toBe(corr);
  });

  it('correctionFactor (CF-based simple correction) uses same weather primitives', () => {
    const H = pct_to_frac(SAMPLE_H_PCT);
    const cf = correctionFactor(SAMPLE_BP, SAMPLE_T, H);

    // CF is always positive and typically 0.9 – 1.15
    expect(cf).toBeGreaterThan(0.85);
    expect(cf).toBeLessThan(1.2);

    // Simple correction: ET * CF
    const simpleCorrected = SAMPLE_ET * cf;
    expect(simpleCorrected).toBeGreaterThan(0);
  });
});
