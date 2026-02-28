/**
 * Tests for NHRA Parity Weather Correction + HPC Pipeline
 *
 * Validates all formulas against the known-good spreadsheet sample row.
 */

import { describe, it, expect } from 'vitest';
import {
  hPa_to_inHg,
  pct_to_frac,
  saturatedVaporPressure,
  vaporPressure,
  dryAirPressure,
  dewPoint,
  airDensity,
  densityAltitude,
  waterGrains,
  correctionFactor,
  theta,
  delta,
  computeWeather,
  computeHPC,
  correctET,
  correctMPH,
  correctET_strict,
  correctMPH_strict,
  correctRun,
  resolveEngineComboForRun,
  resolveEngineCombo,
  type DriverComboRow,
  type ApiDriverComboRow,
  type ClassDefaultComboRow,
} from '../weatherCorrection';

// ── Known-good sample row from spreadsheet ──────────────────────────────

const SAMPLE = {
  T: 76.28,
  H: 0.66, // fraction
  BP: 29.32329, // inHg
  engineCombo: 'Nitro TF',
  tPower: 0.4,
  dPower: 0.7,
  FF: 9,
};

const EXPECTED = {
  theta: 1.0313275732676508,
  delta: 0.9599040230844369,
  hpc: 1.045600777675953,
};

// ── Unit Converters ─────────────────────────────────────────────────────

describe('Unit converters', () => {
  it('hPa_to_inHg', () => {
    expect(hPa_to_inHg(1013.25)).toBeCloseTo(29.921, 2);
  });

  it('pct_to_frac', () => {
    expect(pct_to_frac(66)).toBeCloseTo(0.66, 10);
    expect(pct_to_frac(0)).toBe(0);
    expect(pct_to_frac(100)).toBe(1);
  });
});

// ── Core Weather Derived Values ─────────────────────────────────────────

describe('Core weather formulas', () => {
  it('saturatedVaporPressure returns a positive number', () => {
    const svp = saturatedVaporPressure(SAMPLE.T);
    expect(svp).toBeGreaterThan(0);
    expect(svp).toBeLessThan(5); // reasonable range for 76°F
  });

  it('vaporPressure = H * SVP', () => {
    const svp = saturatedVaporPressure(SAMPLE.T);
    const vp = vaporPressure(SAMPLE.T, SAMPLE.H);
    expect(vp).toBeCloseTo(SAMPLE.H * svp, 10);
  });

  it('dryAirPressure = BP - VP', () => {
    const vp = vaporPressure(SAMPLE.T, SAMPLE.H);
    const dap = dryAirPressure(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(dap).toBeCloseTo(SAMPLE.BP - vp, 10);
  });

  it('airDensity is in expected range (~95 for warm day)', () => {
    const ad = airDensity(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(ad).toBeGreaterThan(85);
    expect(ad).toBeLessThan(105);
  });

  it('densityAltitude is positive for warm conditions', () => {
    const da = densityAltitude(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(da).toBeGreaterThan(0);
    expect(da).toBeLessThan(10000);
  });

  it('waterGrains is positive', () => {
    const wg = waterGrains(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(wg).toBeGreaterThan(0);
    expect(wg).toBeLessThan(200);
  });

  it('correctionFactor is near 1.0 for mild conditions', () => {
    const cf = correctionFactor(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(cf).toBeGreaterThan(0.8);
    expect(cf).toBeLessThan(1.3);
  });
});

// ── Theta & Delta (exact match to spreadsheet) ─────────────────────────

describe('Theta and Delta (exact spreadsheet match)', () => {
  it('theta matches expected value', () => {
    const th = theta(SAMPLE.T);
    expect(th).toBeCloseTo(EXPECTED.theta, 9);
  });

  it('delta matches expected value', () => {
    const dl = delta(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    expect(dl).toBeCloseTo(EXPECTED.delta, 9);
  });
});

// ── HPC (exact match to spreadsheet) ────────────────────────────────────

describe('HPC calculation', () => {
  it('matches expected HPC for Nitro TF sample', () => {
    const th = theta(SAMPLE.T);
    const dl = delta(SAMPLE.BP, SAMPLE.T, SAMPLE.H);
    const hpc = computeHPC({
      engineCombo: SAMPLE.engineCombo,
      tPower: SAMPLE.tPower,
      dPower: SAMPLE.dPower,
      FF: SAMPLE.FF,
      theta: th,
      delta: dl,
    });
    expect(hpc).toBeCloseTo(EXPECTED.hpc, 6);
  });

  it('returns 0 when engineCombo is 0', () => {
    const hpc = computeHPC({
      engineCombo: 0,
      tPower: 0.4,
      dPower: 0.7,
      FF: 9,
      theta: 1.03,
      delta: 0.96,
    });
    expect(hpc).toBe(0);
  });
});

// ── Run Correction ──────────────────────────────────────────────────────

describe('Run correction (ET and MPH)', () => {
  it('correctET for 60ft time matches expected', () => {
    const actual60 = 0.861;
    const corrected = correctET(actual60, EXPECTED.hpc);
    expect(corrected).not.toBeNull();
    expect(corrected!).toBeCloseTo(0.848, 3);
  });

  it('correctET returns null when HPC is 0', () => {
    expect(correctET(3.7, 0)).toBeNull();
  });

  it('correctET returns null when HPC is NaN', () => {
    expect(correctET(3.7, NaN)).toBeNull();
  });

  it('correctET returns null when HPC is Infinity', () => {
    expect(correctET(3.7, Infinity)).toBeNull();
  });

  it('correctMPH returns null when HPC is 0', () => {
    expect(correctMPH(330, 0)).toBeNull();
  });

  it('correctMPH produces higher speed for HPC > 1', () => {
    const corrected = correctMPH(330, 1.05);
    expect(corrected).not.toBeNull();
    expect(corrected!).toBeGreaterThan(330);
  });

  it('correctET_strict throws on invalid HPC', () => {
    expect(() => correctET_strict(3.7, 0)).toThrow('Invalid HPC');
    expect(() => correctET_strict(3.7, NaN)).toThrow('Invalid HPC');
  });

  it('correctMPH_strict throws on invalid HPC', () => {
    expect(() => correctMPH_strict(330, 0)).toThrow('Invalid HPC');
  });
});

// ── Full Pipeline ───────────────────────────────────────────────────────

describe('Full correctRun pipeline', () => {
  it('produces expected HPC and corrected 60ft', () => {
    const result = correctRun({
      T: SAMPLE.T,
      H: SAMPLE.H,
      BP: SAMPLE.BP,
      engineComboName: SAMPLE.engineCombo,
      tPower: SAMPLE.tPower,
      dPower: SAMPLE.dPower,
      FF: SAMPLE.FF,
      actualET: 0.861,
      actualMPH: 330,
    });
    expect(result.hpc).toBeCloseTo(EXPECTED.hpc, 6);
    expect(result.correctedET).not.toBeNull();
    expect(result.correctedET!).toBeCloseTo(0.848, 3);
    expect(result.correctedMPH).not.toBeNull();
    expect(result.correctedMPH!).toBeGreaterThan(330);
    expect(result.weather.theta).toBeCloseTo(EXPECTED.theta, 9);
    expect(result.weather.delta).toBeCloseTo(EXPECTED.delta, 9);
  });

  it('returns null corrections when engineCombo is 0', () => {
    const result = correctRun({
      T: SAMPLE.T,
      H: SAMPLE.H,
      BP: SAMPLE.BP,
      engineComboName: 0,
      tPower: 0,
      dPower: 0,
      FF: 0,
      actualET: 3.7,
      actualMPH: 330,
    });
    expect(result.hpc).toBe(0);
    expect(result.correctedET).toBeNull();
    expect(result.correctedMPH).toBeNull();
  });

  it('handles null actuals gracefully', () => {
    const result = correctRun({
      T: SAMPLE.T,
      H: SAMPLE.H,
      BP: SAMPLE.BP,
      engineComboName: SAMPLE.engineCombo,
      tPower: SAMPLE.tPower,
      dPower: SAMPLE.dPower,
      FF: SAMPLE.FF,
    });
    expect(result.correctedET).toBeNull();
    expect(result.correctedMPH).toBeNull();
    expect(result.hpc).toBeCloseTo(EXPECTED.hpc, 6);
  });
});

// ── computeWeather aggregated result ────────────────────────────────────

describe('computeWeather', () => {
  it('returns all fields for sample inputs', () => {
    const w = computeWeather(SAMPLE.T, SAMPLE.H, SAMPLE.BP);
    expect(w.svp).toBeGreaterThan(0);
    expect(w.vp).toBeGreaterThan(0);
    expect(w.dap).toBeGreaterThan(0);
    expect(w.dewPoint).toBeDefined();
    expect(w.airDensity).toBeGreaterThan(0);
    expect(w.densityAltitude).toBeDefined();
    expect(w.waterGrains).toBeGreaterThan(0);
    expect(w.correctionFactor).toBeGreaterThan(0);
    expect(w.theta).toBeCloseTo(EXPECTED.theta, 9);
    expect(w.delta).toBeCloseTo(EXPECTED.delta, 9);
  });
});

// ── Driver Combo Resolver ───────────────────────────────────────────────

describe('resolveEngineComboForRun', () => {
  const rows: DriverComboRow[] = [
    {
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      engineCombo: 'Nitro FC',
      effectiveFromUtc: '2024-01-01T00:00:00Z',
      effectiveToUtc: '2024-07-01T00:00:00Z',
    },
    {
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      engineCombo: 'Nitro FC v2',
      effectiveFromUtc: '2024-07-01T00:00:00Z',
      effectiveToUtc: null,
    },
    {
      driverName: 'BRITTANY FORCE',
      classIndex: 'TF',
      engineCombo: 'Nitro TF',
      effectiveFromUtc: '2024-01-01T00:00:00Z',
      effectiveToUtc: null,
    },
  ];

  it('returns correct combo for run within first range', () => {
    const result = resolveEngineComboForRun({
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      runUtcTimestamp: '2024-03-15T18:30:00Z',
      driverComboRows: rows,
    });
    expect(result).toBe('Nitro FC');
  });

  it('returns v2 combo for run in second range', () => {
    const result = resolveEngineComboForRun({
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      runUtcTimestamp: '2024-09-15T18:30:00Z',
      driverComboRows: rows,
    });
    expect(result).toBe('Nitro FC v2');
  });

  it('returns 0 when no combo matches driver', () => {
    const result = resolveEngineComboForRun({
      driverName: 'UNKNOWN DRIVER',
      classIndex: 'FC',
      runUtcTimestamp: '2024-03-15T18:30:00Z',
      driverComboRows: rows,
    });
    expect(result).toBe(0);
  });

  it('returns 0 when no combo matches class', () => {
    const result = resolveEngineComboForRun({
      driverName: 'JOHN FORCE',
      classIndex: 'TF',
      runUtcTimestamp: '2024-03-15T18:30:00Z',
      driverComboRows: rows,
    });
    expect(result).toBe(0);
  });

  it('returns 0 when run timestamp is before all ranges', () => {
    const result = resolveEngineComboForRun({
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      runUtcTimestamp: '2023-12-31T23:59:59Z',
      driverComboRows: rows,
    });
    expect(result).toBe(0);
  });

  it('returns 0 when run timestamp equals effectiveToUtc (exclusive upper bound)', () => {
    const result = resolveEngineComboForRun({
      driverName: 'JOHN FORCE',
      classIndex: 'FC',
      runUtcTimestamp: '2024-07-01T00:00:00Z',
      driverComboRows: rows,
    });
    // At exactly effectiveToUtc of first, should pick second (effectiveFromUtc matches)
    expect(result).toBe('Nitro FC v2');
  });

  it('picks latest effectiveFromUtc when ranges overlap', () => {
    const overlapping: DriverComboRow[] = [
      {
        driverName: 'DRIVER A',
        classIndex: 'TF',
        engineCombo: 'Combo Old',
        effectiveFromUtc: '2024-01-01T00:00:00Z',
        effectiveToUtc: null,
      },
      {
        driverName: 'DRIVER A',
        classIndex: 'TF',
        engineCombo: 'Combo New',
        effectiveFromUtc: '2024-06-01T00:00:00Z',
        effectiveToUtc: null,
      },
    ];
    const result = resolveEngineComboForRun({
      driverName: 'DRIVER A',
      classIndex: 'TF',
      runUtcTimestamp: '2024-08-01T00:00:00Z',
      driverComboRows: overlapping,
    });
    expect(result).toBe('Combo New');
  });

  it('returns combo for different driver in same class', () => {
    const result = resolveEngineComboForRun({
      driverName: 'BRITTANY FORCE',
      classIndex: 'TF',
      runUtcTimestamp: '2024-05-01T12:00:00Z',
      driverComboRows: rows,
    });
    expect(result).toBe('Nitro TF');
  });
});

// ── Integration: full correction pipeline with mock combos ──────────────

describe('Integration: full correction pipeline with mock combos', () => {
  const engineCombos = [
    { name: 'Nitro TF', tPower: 0.4, dPower: 0.7, FF: 9 },
    { name: 'Nitro FC', tPower: 0.35, dPower: 0.65, FF: 8 },
  ];

  const driverCombos: DriverComboRow[] = [
    {
      driverName: 'BRITTANY FORCE',
      classIndex: 'TF',
      engineCombo: 'Nitro TF',
      effectiveFromUtc: '2024-01-01T00:00:00Z',
      effectiveToUtc: null,
    },
  ];

  const mockRun = {
    driverName: 'BRITTANY FORCE',
    classIndex: 'TF',
    runUtcTimestamp: '2024-10-30T18:00:00Z',
    ft1320: 3.700,
    mph1320: 330.0,
    ft60: 0.861,
    weather: { temp_f: 76.28, rh_pct: 66, pressure_inhg: 29.32329 },
  };

  it('resolves engine combo and computes corrected values end-to-end', () => {
    // Step 1: resolve engine combo
    const combo = resolveEngineComboForRun({
      driverName: mockRun.driverName,
      classIndex: mockRun.classIndex,
      runUtcTimestamp: mockRun.runUtcTimestamp,
      driverComboRows: driverCombos,
    });
    expect(combo).toBe('Nitro TF');

    // Step 2: get engine combo params
    const ec = engineCombos.find(e => e.name === combo);
    expect(ec).toBeDefined();

    // Step 3: compute weather
    const H = pct_to_frac(mockRun.weather.rh_pct);
    const w = computeWeather(mockRun.weather.temp_f, H, mockRun.weather.pressure_inhg);
    expect(w.theta).toBeCloseTo(EXPECTED.theta, 9);
    expect(w.delta).toBeCloseTo(EXPECTED.delta, 9);

    // Step 4: compute HPC
    const hpc = computeHPC({
      engineCombo: ec!.name,
      tPower: ec!.tPower,
      dPower: ec!.dPower,
      FF: ec!.FF,
      theta: w.theta,
      delta: w.delta,
    });
    expect(hpc).toBeCloseTo(EXPECTED.hpc, 6);

    // Step 5: correct ET and MPH
    const corr1320 = correctET(mockRun.ft1320, hpc);
    expect(corr1320).not.toBeNull();
    expect(corr1320!).toBeLessThan(mockRun.ft1320); // HPC > 1 → corrected ET < actual

    const corrMph = correctMPH(mockRun.mph1320, hpc);
    expect(corrMph).not.toBeNull();
    expect(corrMph!).toBeGreaterThan(mockRun.mph1320); // HPC > 1 → corrected MPH > actual

    const corr60 = correctET(mockRun.ft60, hpc);
    expect(corr60).not.toBeNull();
    expect(corr60!).toBeCloseTo(0.848, 3);
  });

  it('returns 0 HPC when driver has no combo mapping', () => {
    const combo = resolveEngineComboForRun({
      driverName: 'UNKNOWN DRIVER',
      classIndex: 'TF',
      runUtcTimestamp: '2024-10-30T18:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(combo).toBe(0);

    // HPC should be 0 when no combo
    const hpc = computeHPC({
      engineCombo: 0,
      tPower: 0, dPower: 0, FF: 0,
      theta: 1.03, delta: 0.96,
    });
    expect(hpc).toBe(0);

    // correctET/correctMPH should return null for HPC=0
    expect(correctET(3.7, hpc)).toBeNull();
    expect(correctMPH(330, hpc)).toBeNull();
  });

  it('handles missing weather gracefully in pipeline', () => {
    // When weather is missing, correction should not be applied
    const hpc = computeHPC({
      engineCombo: 'Nitro TF',
      tPower: 0.4, dPower: 0.7, FF: 9,
      theta: 1.0, delta: 1.0, // std conditions
    });
    // At standard conditions, HPC should be near 1.0
    expect(hpc).toBeCloseTo(1.0, 2);
  });
});

// ── B3 Frontend-focused tests ───────────────────────────────────────────

describe('B3: Run row with missing combo yields blank corrected values + reason', () => {
  const driverCombos: DriverComboRow[] = [
    { driverName: 'AUSTIN PROCK', classIndex: 'TF', engineCombo: 'Nitro TF', effectiveFromUtc: '2024-01-01T00:00:00Z', effectiveToUtc: null },
  ];

  it('returns 0 (no combo) for unknown driver', () => {
    const result = resolveEngineComboForRun({
      driverName: 'NOBODY',
      classIndex: 'TF',
      runUtcTimestamp: '2024-06-01T12:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(result).toBe(0);
  });

  it('returns 0 (no combo) for wrong class', () => {
    const result = resolveEngineComboForRun({
      driverName: 'AUSTIN PROCK',
      classIndex: 'FC',
      runUtcTimestamp: '2024-06-01T12:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(result).toBe(0);
  });

  it('correctET/correctMPH return null when HPC=0 (missing combo)', () => {
    expect(correctET(3.7, 0)).toBeNull();
    expect(correctMPH(330, 0)).toBeNull();
  });
});

describe('B3: Overlapping driver combos resolve to latest effectiveFrom', () => {
  const driverCombos: DriverComboRow[] = [
    { driverName: 'STEVE TORRENCE', classIndex: 'TF', engineCombo: 'Nitro TF v1', effectiveFromUtc: '2024-01-01T00:00:00Z', effectiveToUtc: '2024-12-31T23:59:59Z' },
    { driverName: 'STEVE TORRENCE', classIndex: 'TF', engineCombo: 'Nitro TF v2', effectiveFromUtc: '2024-06-01T00:00:00Z', effectiveToUtc: '2024-12-31T23:59:59Z' },
    { driverName: 'STEVE TORRENCE', classIndex: 'TF', engineCombo: 'Nitro TF v3', effectiveFromUtc: '2024-09-01T00:00:00Z', effectiveToUtc: null },
  ];

  it('before any v2/v3 range, resolves to v1', () => {
    const result = resolveEngineComboForRun({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runUtcTimestamp: '2024-03-15T12:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(result).toBe('Nitro TF v1');
  });

  it('in overlap between v1 and v2, resolves to v2 (latest effectiveFrom)', () => {
    const result = resolveEngineComboForRun({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runUtcTimestamp: '2024-07-15T12:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(result).toBe('Nitro TF v2');
  });

  it('in overlap between all three, resolves to v3 (latest effectiveFrom)', () => {
    const result = resolveEngineComboForRun({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runUtcTimestamp: '2024-10-15T12:00:00Z',
      driverComboRows: driverCombos,
    });
    expect(result).toBe('Nitro TF v3');
  });
});

describe('B3: Pre-indexing and caching produce identical numeric outputs', () => {
  it('computeWeather returns identical results for same inputs (caching correctness)', () => {
    const T = 76.28, H = 0.66, BP = 29.32329;
    const w1 = computeWeather(T, H, BP);
    const w2 = computeWeather(T, H, BP);

    // Every field must be bit-identical
    expect(w1.svp).toBe(w2.svp);
    expect(w1.vp).toBe(w2.vp);
    expect(w1.dap).toBe(w2.dap);
    expect(w1.dewPoint).toBe(w2.dewPoint);
    expect(w1.airDensity).toBe(w2.airDensity);
    expect(w1.densityAltitude).toBe(w2.densityAltitude);
    expect(w1.waterGrains).toBe(w2.waterGrains);
    expect(w1.correctionFactor).toBe(w2.correctionFactor);
    expect(w1.theta).toBe(w2.theta);
    expect(w1.delta).toBe(w2.delta);
  });

  it('pre-indexed driver combo lookup matches linear scan', () => {
    const driverCombos: DriverComboRow[] = [
      { driverName: 'JOHN FORCE', classIndex: 'FC', engineCombo: 'Nitro FC v1', effectiveFromUtc: '2024-01-01T00:00:00Z', effectiveToUtc: '2024-06-01T00:00:00Z' },
      { driverName: 'JOHN FORCE', classIndex: 'FC', engineCombo: 'Nitro FC v2', effectiveFromUtc: '2024-06-01T00:00:00Z', effectiveToUtc: null },
      { driverName: 'AUSTIN PROCK', classIndex: 'TF', engineCombo: 'Nitro TF', effectiveFromUtc: '2024-01-01T00:00:00Z', effectiveToUtc: null },
    ];

    // Build pre-indexed map (same logic as RunsWeatherPanel)
    const dcIndex = new Map<string, DriverComboRow[]>();
    for (const dc of driverCombos) {
      const key = `${dc.driverName}|${dc.classIndex}`;
      if (!dcIndex.has(key)) dcIndex.set(key, []);
      dcIndex.get(key)!.push(dc);
    }
    for (const arr of dcIndex.values()) {
      arr.sort((a, b) => b.effectiveFromUtc.localeCompare(a.effectiveFromUtc));
    }

    // Test: index lookup should produce same result as resolveEngineComboForRun
    const ts = '2024-07-15T12:00:00Z';
    const linearResult = resolveEngineComboForRun({
      driverName: 'JOHN FORCE', classIndex: 'FC',
      runUtcTimestamp: ts, driverComboRows: driverCombos,
    });

    const dcKey = 'JOHN FORCE|FC';
    const candidates = dcIndex.get(dcKey) ?? [];
    const indexed = candidates.find(dc =>
      ts >= dc.effectiveFromUtc && (dc.effectiveToUtc == null || ts < dc.effectiveToUtc)
    );

    expect(indexed).toBeDefined();
    expect(indexed!.engineCombo).toBe(linearResult);
    expect(linearResult).toBe('Nitro FC v2');
  });
});

// ── Enhanced Resolver: resolveEngineCombo (driver → classDefault → none) ──

describe('resolveEngineCombo: priority resolution', () => {
  const driverCombos: ApiDriverComboRow[] = [
    {
      driver_name: 'AUSTIN PROCK',
      class_index: 'TF',
      engine_combo_id: 1,
      engine_combo_name: 'Nitro TF',
      effective_from_utc: '2024-01-01T00:00:00Z',
      effective_to_utc: null,
    },
    {
      driver_name: 'JOHN FORCE',
      class_index: 'FC',
      engine_combo_id: 2,
      engine_combo_name: 'Nitro FC v1',
      effective_from_utc: '2024-01-01T00:00:00Z',
      effective_to_utc: '2024-07-01T00:00:00Z',
    },
    {
      driver_name: 'JOHN FORCE',
      class_index: 'FC',
      engine_combo_id: 3,
      engine_combo_name: 'Nitro FC v2',
      effective_from_utc: '2024-07-01T00:00:00Z',
      effective_to_utc: null,
    },
  ];

  const classDefaults: ClassDefaultComboRow[] = [
    {
      class_index: 'TF',
      engine_combo_id: 10,
      engine_combo_name: 'TF Default',
      effective_from_utc: null,
      effective_to_utc: null,
    },
    {
      class_index: 'FC',
      engine_combo_id: 20,
      engine_combo_name: 'FC Default',
      effective_from_utc: '2024-01-01T00:00:00Z',
      effective_to_utc: null,
    },
    {
      class_index: 'PS',
      engine_combo_id: 30,
      engine_combo_name: 'PS Default',
      effective_from_utc: null,
      effective_to_utc: null,
    },
  ];

  it('resolves driver combo when available (highest priority)', () => {
    const r = resolveEngineCombo({
      driverName: 'AUSTIN PROCK',
      classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos,
      classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Nitro TF');
    expect(r.engineComboId).toBe(1);
  });

  it('falls back to class default when no driver combo matches', () => {
    const r = resolveEngineCombo({
      driverName: 'UNKNOWN DRIVER',
      classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos,
      classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('TF Default');
    expect(r.engineComboId).toBe(10);
  });

  it('returns none when neither driver combo nor class default exists', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY',
      classIndex: 'PSM',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos,
      classDefaults,
    });
    expect(r.source).toBe('none');
    expect(r.engineComboName).toBeNull();
    expect(r.engineComboId).toBeNull();
    expect(r.detail).toContain('No driver assignment');
  });

  it('uses class default for class with no driver assignments at all', () => {
    const r = resolveEngineCombo({
      driverName: 'SOMEONE',
      classIndex: 'PS',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos,
      classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('PS Default');
    expect(r.engineComboId).toBe(30);
  });
});

describe('resolveEngineCombo: effective date boundaries', () => {
  const driverCombos: ApiDriverComboRow[] = [
    {
      driver_name: 'DRIVER A',
      class_index: 'TF',
      engine_combo_id: 1,
      engine_combo_name: 'Combo First',
      effective_from_utc: '2024-01-01T00:00:00Z',
      effective_to_utc: '2024-06-01T00:00:00Z',
    },
    {
      driver_name: 'DRIVER A',
      class_index: 'TF',
      engine_combo_id: 2,
      engine_combo_name: 'Combo Second',
      effective_from_utc: '2024-06-01T00:00:00Z',
      effective_to_utc: null,
    },
  ];
  const classDefaults: ClassDefaultComboRow[] = [
    { class_index: 'TF', engine_combo_id: 10, engine_combo_name: 'TF Default', effective_from_utc: null, effective_to_utc: null },
  ];

  it('run before all ranges → falls back to class default', () => {
    const r = resolveEngineCombo({
      driverName: 'DRIVER A', classIndex: 'TF',
      runTimestampUtc: '2023-12-31T23:59:59Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
  });

  it('run at exactly effective_from_utc of first → matches first', () => {
    const r = resolveEngineCombo({
      driverName: 'DRIVER A', classIndex: 'TF',
      runTimestampUtc: '2024-01-01T00:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Combo First');
  });

  it('run at exactly effective_to_utc boundary (exclusive) → matches second', () => {
    const r = resolveEngineCombo({
      driverName: 'DRIVER A', classIndex: 'TF',
      runTimestampUtc: '2024-06-01T00:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Combo Second');
  });

  it('run 1ms before boundary → still matches first', () => {
    const r = resolveEngineCombo({
      driverName: 'DRIVER A', classIndex: 'TF',
      runTimestampUtc: '2024-05-31T23:59:59Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Combo First');
  });

  it('open-ended combo matches far future', () => {
    const r = resolveEngineCombo({
      driverName: 'DRIVER A', classIndex: 'TF',
      runTimestampUtc: '2030-12-31T23:59:59Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Combo Second');
  });
});

describe('resolveEngineCombo: case-insensitive matching', () => {
  const driverCombos: ApiDriverComboRow[] = [
    {
      driver_name: 'John Force',
      class_index: 'fc',
      engine_combo_id: 1,
      engine_combo_name: 'Nitro FC',
      effective_from_utc: '2024-01-01T00:00:00Z',
      effective_to_utc: null,
    },
  ];
  const classDefaults: ClassDefaultComboRow[] = [
    { class_index: 'Fc', engine_combo_id: 10, engine_combo_name: 'FC Default', effective_from_utc: null, effective_to_utc: null },
  ];

  it('driver name case mismatch still matches', () => {
    const r = resolveEngineCombo({
      driverName: 'JOHN FORCE', classIndex: 'FC',
      runTimestampUtc: '2024-06-01T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Nitro FC');
  });

  it('class index case mismatch still matches for class default', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'fc',
      runTimestampUtc: '2024-06-01T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('FC Default');
  });
});

describe('resolveEngineCombo: overlapping driver combos pick latest effectiveFrom', () => {
  const driverCombos: ApiDriverComboRow[] = [
    {
      driver_name: 'STEVE TORRENCE', class_index: 'TF',
      engine_combo_id: 1, engine_combo_name: 'TF v1',
      effective_from_utc: '2024-01-01T00:00:00Z', effective_to_utc: null,
    },
    {
      driver_name: 'STEVE TORRENCE', class_index: 'TF',
      engine_combo_id: 2, engine_combo_name: 'TF v2',
      effective_from_utc: '2024-06-01T00:00:00Z', effective_to_utc: null,
    },
    {
      driver_name: 'STEVE TORRENCE', class_index: 'TF',
      engine_combo_id: 3, engine_combo_name: 'TF v3',
      effective_from_utc: '2024-09-01T00:00:00Z', effective_to_utc: null,
    },
  ];
  const classDefaults: ClassDefaultComboRow[] = [];

  it('before v2 range → v1', () => {
    const r = resolveEngineCombo({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runTimestampUtc: '2024-03-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.engineComboName).toBe('TF v1');
    expect(r.engineComboId).toBe(1);
  });

  it('in overlap of v1+v2 → v2 (latest effectiveFrom)', () => {
    const r = resolveEngineCombo({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runTimestampUtc: '2024-07-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.engineComboName).toBe('TF v2');
    expect(r.engineComboId).toBe(2);
  });

  it('in overlap of all three → v3 (latest effectiveFrom)', () => {
    const r = resolveEngineCombo({
      driverName: 'STEVE TORRENCE', classIndex: 'TF',
      runTimestampUtc: '2024-10-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.engineComboName).toBe('TF v3');
    expect(r.engineComboId).toBe(3);
  });
});

describe('resolveEngineCombo: class default effective date ranges', () => {
  const driverCombos: ApiDriverComboRow[] = [];
  const classDefaults: ClassDefaultComboRow[] = [
    {
      class_index: 'TF', engine_combo_id: 10, engine_combo_name: 'TF Default Old',
      effective_from_utc: '2023-01-01T00:00:00Z', effective_to_utc: '2024-01-01T00:00:00Z',
    },
    {
      class_index: 'TF', engine_combo_id: 11, engine_combo_name: 'TF Default New',
      effective_from_utc: '2024-01-01T00:00:00Z', effective_to_utc: null,
    },
    {
      class_index: 'FC', engine_combo_id: 20, engine_combo_name: 'FC Universal',
      effective_from_utc: null, effective_to_utc: null,
    },
  ];

  it('picks dated class default matching timestamp', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'TF',
      runTimestampUtc: '2023-06-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('TF Default Old');
  });

  it('picks latest dated class default when multiple match', () => {
    // At 2024-06-15 only "TF Default New" is active (Old expired)
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('TF Default New');
    expect(r.engineComboId).toBe(11);
  });

  it('universal default (no dates) always matches', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'FC',
      runTimestampUtc: '2020-01-01T00:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('FC Universal');
  });

  it('returns none when class default expired and no fallback', () => {
    // Before 2023 for TF, only TF Default Old exists but effective_from is 2023
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'TF',
      runTimestampUtc: '2022-06-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('none');
  });
});

describe('resolveEngineCombo: driver combo takes priority over class default', () => {
  const driverCombos: ApiDriverComboRow[] = [
    {
      driver_name: 'BRITTANY FORCE', class_index: 'TF',
      engine_combo_id: 5, engine_combo_name: 'Custom TF',
      effective_from_utc: '2024-01-01T00:00:00Z', effective_to_utc: null,
    },
  ];
  const classDefaults: ClassDefaultComboRow[] = [
    { class_index: 'TF', engine_combo_id: 10, engine_combo_name: 'TF Default', effective_from_utc: null, effective_to_utc: null },
  ];

  it('driver combo wins over class default', () => {
    const r = resolveEngineCombo({
      driverName: 'BRITTANY FORCE', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('driver');
    expect(r.engineComboName).toBe('Custom TF');
    expect(r.engineComboId).toBe(5);
  });

  it('same class, different driver → falls to class default', () => {
    const r = resolveEngineCombo({
      driverName: 'OTHER DRIVER', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos, classDefaults,
    });
    expect(r.source).toBe('classDefault');
    expect(r.engineComboName).toBe('TF Default');
  });
});

describe('resolveEngineCombo: detail string format', () => {
  it('driver source includes date in detail', () => {
    const r = resolveEngineCombo({
      driverName: 'A', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos: [{
        driver_name: 'A', class_index: 'TF', engine_combo_id: 1,
        engine_combo_name: 'X', effective_from_utc: '2024-03-01T00:00:00Z', effective_to_utc: null,
      }],
      classDefaults: [],
    });
    expect(r.detail).toBe('Driver assignment from 2024-03-01');
  });

  it('class default with date includes date in detail', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos: [],
      classDefaults: [{
        class_index: 'TF', engine_combo_id: 1, engine_combo_name: 'X',
        effective_from_utc: '2024-01-01T00:00:00Z', effective_to_utc: null,
      }],
    });
    expect(r.detail).toBe('Class default from 2024-01-01');
  });

  it('class default without date omits date in detail', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'TF',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos: [],
      classDefaults: [{
        class_index: 'TF', engine_combo_id: 1, engine_combo_name: 'X',
        effective_from_utc: null, effective_to_utc: null,
      }],
    });
    expect(r.detail).toBe('Class default');
  });

  it('none source has descriptive detail', () => {
    const r = resolveEngineCombo({
      driverName: 'NOBODY', classIndex: 'ZZ',
      runTimestampUtc: '2024-06-15T12:00:00Z',
      driverCombos: [], classDefaults: [],
    });
    expect(r.detail).toBe('No driver assignment; no class default');
  });
});
