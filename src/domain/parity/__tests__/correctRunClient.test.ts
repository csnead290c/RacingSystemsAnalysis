/**
 * Regression tests for correctRunClientSide — the authoritative client-side
 * weather correction function that replaces all backend corrected_* field usage.
 *
 * IMPORTANT: These tests use ONLY allowed invariants per Clinton's rules:
 *   1. correctRunClientSide must produce the same output as the authoritative
 *      computeWeather → computeHPC → correctET/correctMPH pipeline.
 *   2. No UI/export code may render backend corrected_* / correction_factor fields.
 *   3. If combo cannot be resolved → corrected values must be null (no fallback).
 *   4. For a given run+weather+combo, DriverDrilldown corrected ≡ Preview corrected.
 *
 * Combo parameters come from a test-only JSON fixture (testCombo.json) that is
 * NOT an approximation of any real production combo. Tests verify pipeline
 * equivalence and structural invariants, not expected output values tied to
 * real combo data.
 */
import { describe, it, expect } from 'vitest';
import {
  correctRunClientSide,
  correctRunsBatch,
  type CorrectionContext,
  type RunForCorrection,
} from '../correctRunClient';
import {
  computeWeather,
  computeHPC,
  correctET,
  correctMPH,
  pct_to_frac,
  correctionFactor,
} from '../weatherCorrection';

// ── Test-only fixture (NOT an approximation of any real combo) ──────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
import fixture from './fixtures/testCombo.json';

const ENGINE_COMBOS = [fixture.engineCombo];
const DRIVER_COMBOS = [fixture.driverCombo];
const CLASS_DEFAULTS = [fixture.classDefault];

const CTX: CorrectionContext = {
  engineCombos: ENGINE_COMBOS,
  driverCombos: DRIVER_COMBOS,
  classDefaults: CLASS_DEFAULTS,
};

const WEATHER = fixture.weather;

const BASE_RUN: RunForCorrection = {
  ...fixture.run,
  weather: WEATHER,
};

// ── Helper: compute expected values via the authoritative pipeline ──────
// This is the SAME pipeline as Weather Correction Preview.

function previewPipeline(run: RunForCorrection, ctx: CorrectionContext) {
  if (!run.weather || run.weather.temp_f == null || run.weather.pressure_inhg == null) return null;
  const w = computeWeather(run.weather.temp_f, pct_to_frac(run.weather.rh_pct ?? 0), run.weather.pressure_inhg);
  const combo = ctx.engineCombos[0];
  const hpc = computeHPC({
    engineCombo: combo.name, tPower: combo.t_power, dPower: combo.d_power,
    FF: combo.friction_factor, theta: w.theta, delta: w.delta,
  });
  return {
    hpc,
    correctedET: run.ft1320 != null ? correctET(run.ft1320, hpc) : null,
    correctedMPH: run.mph1320 != null ? correctMPH(run.mph1320, hpc) : null,
    corrected60: run.ft60 != null ? correctET(run.ft60, hpc) : null,
    corrected660: run.ft660 != null ? correctET(run.ft660, hpc) : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// INVARIANT 1: correctRunClientSide ≡ Weather Correction Preview pipeline
// ══════════════════════════════════════════════════════════════════════════

describe('invariant 1: correctRunClientSide ≡ Preview pipeline', () => {
  it('produces identical HPC to the Preview computeHPC call', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    const expected = previewPipeline(BASE_RUN, CTX)!;
    expect(result.hpc).toBeCloseTo(expected.hpc, 10);
  });

  it('produces identical correctedET to the Preview correctET call', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    const expected = previewPipeline(BASE_RUN, CTX)!;
    expect(result.correctedET).toBeCloseTo(expected.correctedET!, 10);
  });

  it('produces identical correctedMPH to the Preview correctMPH call', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    const expected = previewPipeline(BASE_RUN, CTX)!;
    expect(result.correctedMPH).toBeCloseTo(expected.correctedMPH!, 10);
  });

  it('produces identical corrected60 and corrected660', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    const expected = previewPipeline(BASE_RUN, CTX)!;
    expect(result.corrected60).toBeCloseTo(expected.corrected60!, 10);
    expect(result.corrected660).toBeCloseTo(expected.corrected660!, 10);
  });

  it('corrected ET formula is ET × HPC^(-0.33)', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.hpc).not.toBeNull();
    const expected = BASE_RUN.ft1320! * Math.pow(result.hpc!, -0.33);
    expect(result.correctedET).toBeCloseTo(expected, 10);
  });

  it('corrected MPH formula is MPH × HPC^(0.33)', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.hpc).not.toBeNull();
    const expected = BASE_RUN.mph1320! * Math.pow(result.hpc!, 0.33);
    expect(result.correctedMPH).toBeCloseTo(expected, 10);
  });

  it('corrected ET ≠ raw ET (correction has effect)', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.correctedET).not.toBeNull();
    expect(result.correctedET).not.toBe(BASE_RUN.ft1320);
  });

  it('HPC-corrected ET ≠ simple CF-corrected ET (the original bug)', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    // The WRONG formula: ET × correctionFactor(BP, T, H)
    const cf = correctionFactor(WEATHER.pressure_inhg, WEATHER.temp_f, pct_to_frac(WEATHER.rh_pct));
    const wrongCorrectedET = BASE_RUN.ft1320! * cf;
    expect(result.correctedET).not.toBeNull();
    expect(Math.abs(result.correctedET! - wrongCorrectedET)).toBeGreaterThan(0.001);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INVARIANT 3: Unresolved combo → null (no fallback)
// ══════════════════════════════════════════════════════════════════════════

describe('invariant 3: combo resolution and null on unresolved', () => {
  it('resolves driver combo when driver/class/timestamp match', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.comboResolution).not.toBeNull();
    expect(result.comboResolution!.source).toBe('driver');
    expect(result.comboResolution!.engineComboName).toBe(fixture.engineCombo.name);
  });

  it('falls back to class default when driver has no combo', () => {
    const run = { ...BASE_RUN, driver_name: 'NOCOMBO, DRIVER', class_index: fixture.classDefault.class_index };
    const result = correctRunClientSide(run, CTX);
    expect(result.comboResolution).not.toBeNull();
    expect(result.comboResolution!.source).toBe('classDefault');
    expect(result.comboResolution!.engineComboName).toBe(fixture.engineCombo.name);
    expect(result.correctedET).not.toBeNull();
  });

  it('returns null correction when no combo can be resolved — never falls back to CF', () => {
    const run = { ...BASE_RUN, driver_name: 'UNKNOWN, DRIVER', class_index: 'ZZ' };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
    expect(result.correctedMPH).toBeNull();
    expect(result.hpc).toBeNull();
    expect(result.comboResolution).not.toBeNull();
    expect(result.comboResolution!.source).toBe('none');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Null handling
// ══════════════════════════════════════════════════════════════════════════

describe('null handling', () => {
  it('returns all nulls when weather is missing', () => {
    const run = { ...BASE_RUN, weather: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
    expect(result.correctedMPH).toBeNull();
    expect(result.hpc).toBeNull();
  });

  it('returns all nulls when temp_f is null', () => {
    const run = { ...BASE_RUN, weather: { ...WEATHER, temp_f: null } };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
  });

  it('returns all nulls when pressure_inhg is null', () => {
    const run = { ...BASE_RUN, weather: { ...WEATHER, pressure_inhg: null } };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
  });

  it('returns all nulls when driver_name is null', () => {
    const run = { ...BASE_RUN, driver_name: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
  });

  it('returns all nulls when class_index is null', () => {
    const run = { ...BASE_RUN, class_index: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
  });

  it('returns all nulls when run_timestamp_utc is null', () => {
    const run = { ...BASE_RUN, run_timestamp_utc: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
  });

  it('handles null ft1320 gracefully (MPH still corrected)', () => {
    const run = { ...BASE_RUN, ft1320: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedET).toBeNull();
    expect(result.correctedMPH).not.toBeNull();
  });

  it('handles null mph1320 gracefully (ET still corrected)', () => {
    const run = { ...BASE_RUN, mph1320: null };
    const result = correctRunClientSide(run, CTX);
    expect(result.correctedMPH).toBeNull();
    expect(result.correctedET).not.toBeNull();
  });

  it('treats null rh_pct as 0% humidity (dry air)', () => {
    const runDry = { ...BASE_RUN, weather: { ...WEATHER, rh_pct: null } };
    const runZero = { ...BASE_RUN, weather: { ...WEATHER, rh_pct: 0 } };
    const resultDry = correctRunClientSide(runDry, CTX);
    const resultZero = correctRunClientSide(runZero, CTX);
    expect(resultDry.correctedET).toBeCloseTo(resultZero.correctedET!, 10);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Batch helper
// ══════════════════════════════════════════════════════════════════════════

describe('correctRunsBatch', () => {
  it('returns a map keyed by run ID with correct results', () => {
    const runs = [
      { ...BASE_RUN, id: 1 } as RunForCorrection & { id: number },
      { ...BASE_RUN, id: 2, ft1320: 5.000 } as RunForCorrection & { id: number },
    ];
    const map = correctRunsBatch(runs, CTX, r => r.id);
    expect(map.size).toBe(2);
    expect(map.get(1)?.correctedET).not.toBeNull();
    expect(map.get(2)?.correctedET).not.toBeNull();
    // Different input ET → different corrected ET
    expect(map.get(1)?.correctedET).not.toEqual(map.get(2)?.correctedET);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Anti-regression: backend fields are never consumed
// ══════════════════════════════════════════════════════════════════════════

describe('anti-regression: backend corrected_ fields ignored', () => {
  it('correctRunClientSide ignores corrected_ft1320 and correction_factor on input', () => {
    const runWithBackendFields = {
      ...BASE_RUN,
      corrected_ft1320: 999.999,
      correction_factor: 999.999,
    } as any;
    const result = correctRunClientSide(runWithBackendFields, CTX);
    expect(result.correctedET).not.toBeNull();
    expect(result.correctedET).not.toBe(999.999);
    expect(result.correctedET).not.toBeCloseTo(999.999, 0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Deterministic fixture: verify numeric output against inline pipeline
// Uses testCombo.json parameters — NOT an approximation of any real combo.
// ══════════════════════════════════════════════════════════════════════════

describe('deterministic fixture: numeric output matches inline pipeline', () => {
  // Pre-compute expected values using the EXACT same pipeline as Weather Correction Preview
  const w = computeWeather(WEATHER.temp_f, pct_to_frac(WEATHER.rh_pct), WEATHER.pressure_inhg);
  const combo = fixture.engineCombo;
  const expectedHPC = computeHPC({
    engineCombo: combo.name, tPower: combo.t_power, dPower: combo.d_power,
    FF: combo.friction_factor, theta: w.theta, delta: w.delta,
  });
  const expectedCorrET = correctET(fixture.run.ft1320, expectedHPC)!;
  const expectedCorrMPH = correctMPH(fixture.run.mph1320, expectedHPC)!;

  it('HPC from correctRunClientSide matches Preview pipeline exactly', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.hpc).toBe(expectedHPC);
  });

  it('correctedET from correctRunClientSide matches Preview pipeline exactly', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.correctedET).toBe(expectedCorrET);
  });

  it('correctedMPH from correctRunClientSide matches Preview pipeline exactly', () => {
    const result = correctRunClientSide(BASE_RUN, CTX);
    expect(result.correctedMPH).toBe(expectedCorrMPH);
  });

  it('the simple CF formula produces a DIFFERENT result (catches the original bug)', () => {
    const cf = correctionFactor(WEATHER.pressure_inhg, WEATHER.temp_f, pct_to_frac(WEATHER.rh_pct));
    const wrongET = fixture.run.ft1320 * cf;
    // CF formula and HPC formula must disagree — this is the bug we caught
    expect(wrongET).not.toBeCloseTo(expectedCorrET, 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INVARIANT 2 + 4: Source-level anti-regression
// No UI path may display backend corrected_* fields or multiply ET by CF.
// ══════════════════════════════════════════════════════════════════════════

describe('source-level anti-regression: no backend corrected fields in display code', () => {
  const { readFileSync } = require('fs');
  const { resolve } = require('path');

  const portalSource = readFileSync(resolve(__dirname, '../../../pages/ParityPortal.tsx'), 'utf-8');
  const reportSource = readFileSync(resolve(__dirname, '../../../pages/ParityReport.tsx'), 'utf-8');
  const pdfSource = readFileSync(resolve(__dirname, '../../../services/parityPdf.ts'), 'utf-8');
  const clientSource = readFileSync(resolve(__dirname, '../correctRunClient.ts'), 'utf-8');

  it('ParityPortal does not render backend corrected fields', () => {
    expect(portalSource).not.toMatch(/r\.corrected_ft1320(?!\??\.\w)/);
    expect(portalSource).not.toMatch(/r\.corrected_best_et/);
    expect(portalSource).not.toMatch(/ft1320\s*\*\s*correction_factor/);
    expect(portalSource).not.toMatch(/ft1320\s*\*\s*cf\b/);
  });

  it('ParityReport does not render backend corrected fields', () => {
    expect(reportSource).not.toMatch(/r\.corrected_ft1320/);
    expect(reportSource).not.toMatch(/r\.correction_factor/);
  });

  it('parityPdf does not fall back to backend corrected fields', () => {
    expect(pdfSource).not.toMatch(/r\.corrected_ft1320/);
    expect(pdfSource).not.toMatch(/r\.correction_factor/);
  });

  it('correctRunClient.ts uses HPC pipeline, not CF', () => {
    expect(clientSource).toContain('correctET');
    expect(clientSource).toContain('correctMPH');
    expect(clientSource).toContain('computeHPC');
    expect(clientSource).not.toContain('applySimpleCorrection');
    expect(clientSource).not.toContain('correctionFactor');
  });

  it('TrendsPanel does not offer corrected_ft1320 metric', () => {
    expect(portalSource).not.toMatch(/value="corrected_ft1320"/);
  });

  it('DriverDrilldown uses client-side HPC correction', () => {
    expect(portalSource).toContain('getCorrected(r)');
    expect(portalSource).toContain('correctRunClientSide');
  });
});
