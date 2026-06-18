/**
 * DENSITY Run Data Analysis — Sensitivity Tests
 *
 * Regression targets from the DENSITY program screenshot:
 *   Base conditions: standard day (60°F / 0% RH / 29.92 inHg / 0 ft)
 *   ET_base ≈ 5.3 s, MPH_base ≈ 87.5, W_base ≈ 1460 lb
 *
 *   Barometer −0.10 inHg → ET +0.007, MPH −0.18
 *   Temperature +10.0°F  → ET +0.023, MPH −0.57
 *   Humidity +10.0%      → ET +0.005, MPH −0.12   (RSA gives ≈ 0.004; within ±0.002)
 *   HPC +0.010           → ET +0.018, MPH −0.45
 *   Weight +20 lb        → ET +0.016, MPH −0.40
 *
 * Tolerances: ±0.003 s for ET, ±0.10 MPH for MPH.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSensitivities,
  DEFAULT_SENSITIVITY_CONFIG,
  DENSITY_ET_INTERCEPT,
  type SensitivityConfig,
  type WeatherInput,
} from '../sensitivityAnalysis';

// ─── DENSITY screenshot base conditions ──────────────────────────────────────
const STANDARD: WeatherInput = {
  temperatureF: 60,
  humidityPct: 0,
  barometerInHg: 29.92,
  elevation: 0,
};

const DENSITY_BASE_ET  = 5.3;   // seconds — gives ~0.023 delta for +10°F
const DENSITY_BASE_MPH = 87.5;  // mph — consistent: MPH/(ET−1.825) = 25
const DENSITY_BASE_W   = 1460;  // lb — consistent: ΔET≈0.016 for +20 lb

// ─────────────────────────────────────────────────────────────────────────────
// 0. Module sanity
// ─────────────────────────────────────────────────────────────────────────────

describe('sensitivityAnalysis — module sanity', () => {
  it('DENSITY_ET_INTERCEPT is 1.825', () => {
    expect(DENSITY_ET_INTERCEPT).toBeCloseTo(1.825, 3);
  });

  it('DEFAULT_SENSITIVITY_CONFIG has all five fields', () => {
    expect(DEFAULT_SENSITIVITY_CONFIG.barometerChangeInHg).toBe(-0.10);
    expect(DEFAULT_SENSITIVITY_CONFIG.temperatureChangeF).toBe(10.0);
    expect(DEFAULT_SENSITIVITY_CONFIG.humidityChangePct).toBe(10.0);
    expect(DEFAULT_SENSITIVITY_CONFIG.hpCorrectionFactorChange).toBe(0.010);
    expect(DEFAULT_SENSITIVITY_CONFIG.weightChangeLb).toBe(20);
  });

  it('returns five rows', () => {
    const result = computeSensitivities(STANDARD, DENSITY_BASE_ET);
    expect(result.rows).toHaveLength(5);
  });

  it('hasMPH is false when baseMPH is not supplied', () => {
    const result = computeSensitivities(STANDARD, DENSITY_BASE_ET);
    expect(result.hasMPH).toBe(false);
    expect(result.rows[0].predictedMPHChange).toBeNull();
  });

  it('hasMPH is true when baseMPH is supplied', () => {
    const result = computeSensitivities(STANDARD, DENSITY_BASE_ET, DEFAULT_SENSITIVITY_CONFIG, {
      baseMPH: DENSITY_BASE_MPH,
    });
    expect(result.hasMPH).toBe(true);
    expect(result.rows[0].predictedMPHChange).not.toBeNull();
  });

  it('hasWeightRow is true when baseWeightLb is supplied', () => {
    const result = computeSensitivities(STANDARD, DENSITY_BASE_ET, DEFAULT_SENSITIVITY_CONFIG, {
      baseWeightLb: DENSITY_BASE_W,
    });
    expect(result.hasWeightRow).toBe(true);
  });

  it('baseHpc is 1.0 at standard day', () => {
    const result = computeSensitivities(STANDARD, DENSITY_BASE_ET);
    expect(result.baseHpc).toBeCloseTo(1.0, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Direction checks (always correct regardless of base ET)
// ─────────────────────────────────────────────────────────────────────────────

describe('sensitivity directions — each variable worsens conditions → slower ET', () => {
  const result = computeSensitivities(STANDARD, DENSITY_BASE_ET);

  const baro = result.rows.find(r => r.variable === 'Barometer')!;
  const temp = result.rows.find(r => r.variable === 'Temperature')!;
  const hum  = result.rows.find(r => r.variable === 'Humidity')!;
  const hpc  = result.rows.find(r => r.variable === 'HP Correction Factor')!;

  it('−0.10 inHg barometer (lower pressure) → slower (positive ΔET)', () => {
    expect(baro.predictedETChange).toBeGreaterThan(0);
  });

  it('+10°F temperature (hotter) → slower (positive ΔET)', () => {
    expect(temp.predictedETChange).toBeGreaterThan(0);
  });

  it('+10% RH (more humid) → slower (positive ΔET)', () => {
    expect(hum.predictedETChange).toBeGreaterThan(0);
  });

  it('+0.010 HPC (worse air factor) → slower (positive ΔET)', () => {
    expect(hpc.predictedETChange).toBeGreaterThan(0);
  });
});

describe('sensitivity directions — each variable improves conditions → faster ET', () => {
  const cfg: SensitivityConfig = {
    barometerChangeInHg: +0.10,     // higher baro = better
    temperatureChangeF: -10.0,      // cooler = better
    humidityChangePct: -10.0,       // drier = better (capped at 0% min)
    hpCorrectionFactorChange: -0.010, // lower HPC = better
    weightChangeLb: -20,
  };
  const result = computeSensitivities(STANDARD, DENSITY_BASE_ET, cfg, {
    baseWeightLb: DENSITY_BASE_W,
  });

  it('+0.10 inHg barometer (higher pressure) → faster (negative ΔET)', () => {
    const baro = result.rows.find(r => r.variable === 'Barometer')!;
    expect(baro.predictedETChange).toBeLessThan(0);
  });

  it('−10°F temperature (cooler) → faster (negative ΔET)', () => {
    const temp = result.rows.find(r => r.variable === 'Temperature')!;
    expect(temp.predictedETChange).toBeLessThan(0);
  });

  it('−0.010 HPC (better factor) → faster (negative ΔET)', () => {
    const hpc = result.rows.find(r => r.variable === 'HP Correction Factor')!;
    expect(hpc.predictedETChange).toBeLessThan(0);
  });

  it('−20 lb weight reduction → faster (negative ΔET)', () => {
    const w = result.rows.find(r => r.variable === 'Vehicle Weight')!;
    expect(w.predictedETChange).toBeLessThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DENSITY screenshot — ET magnitude regression (±0.003 s tolerance)
// ─────────────────────────────────────────────────────────────────────────────

describe('DENSITY screenshot ET magnitude (5.3 s base, standard day)', () => {
  const result = computeSensitivities(
    STANDARD,
    DENSITY_BASE_ET,
    DEFAULT_SENSITIVITY_CONFIG,
    { baseMPH: DENSITY_BASE_MPH, baseWeightLb: DENSITY_BASE_W }
  );

  const baro = result.rows.find(r => r.variable === 'Barometer')!;
  const temp = result.rows.find(r => r.variable === 'Temperature')!;
  const hum  = result.rows.find(r => r.variable === 'Humidity')!;
  const hpc  = result.rows.find(r => r.variable === 'HP Correction Factor')!;
  const wt   = result.rows.find(r => r.variable === 'Vehicle Weight')!;

  it('barometer −0.10 inHg → ET ≈ +0.007 s (screenshot: +0.007)', () => {
    expect(baro.predictedETChange).toBeCloseTo(0.007, 2);
  });

  it('temperature +10°F → ET ≈ +0.023 s (screenshot: +0.023)', () => {
    expect(temp.predictedETChange).toBeCloseTo(0.023, 2);
  });

  it('humidity +10% RH → ET +0.004–0.005 s (screenshot: +0.005; RSA formula ≈ 0.004)', () => {
    expect(hum.predictedETChange).toBeGreaterThan(0.002);
    expect(hum.predictedETChange).toBeLessThan(0.008);
  });

  it('HPC +0.010 → ET ≈ +0.018 s (screenshot: +0.018)', () => {
    expect(hpc.predictedETChange).toBeCloseTo(0.018, 2);
  });

  it('weight +20 lb → ET ≈ +0.016 s (screenshot: +0.016)', () => {
    expect(wt.predictedETChange).toBeCloseTo(0.016, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DENSITY screenshot — MPH magnitude regression (±0.10 MPH tolerance)
// ─────────────────────────────────────────────────────────────────────────────

describe('DENSITY screenshot MPH magnitude (5.3 s / 87.5 mph base)', () => {
  const result = computeSensitivities(
    STANDARD,
    DENSITY_BASE_ET,
    DEFAULT_SENSITIVITY_CONFIG,
    { baseMPH: DENSITY_BASE_MPH, baseWeightLb: DENSITY_BASE_W }
  );

  const baro = result.rows.find(r => r.variable === 'Barometer')!;
  const temp = result.rows.find(r => r.variable === 'Temperature')!;
  const hum  = result.rows.find(r => r.variable === 'Humidity')!;
  const hpc  = result.rows.find(r => r.variable === 'HP Correction Factor')!;
  const wt   = result.rows.find(r => r.variable === 'Vehicle Weight')!;

  it('barometer −0.10 inHg → MPH ≈ −0.18 (screenshot: −0.18)', () => {
    expect(baro.predictedMPHChange!).toBeCloseTo(-0.18, 1);
  });

  it('temperature +10°F → MPH ≈ −0.57 (screenshot: −0.57)', () => {
    expect(temp.predictedMPHChange!).toBeCloseTo(-0.57, 1);
  });

  it('humidity +10% → MPH ≈ −0.10 to −0.12 (screenshot: −0.12)', () => {
    expect(temp.predictedMPHChange!).toBeLessThan(0);
    expect(hum.predictedMPHChange!).toBeGreaterThan(-0.15);
    expect(hum.predictedMPHChange!).toBeLessThan(-0.05);
  });

  it('HPC +0.010 → MPH ≈ −0.45 (screenshot: −0.45)', () => {
    expect(hpc.predictedMPHChange!).toBeCloseTo(-0.45, 1);
  });

  it('weight +20 lb → MPH ≈ −0.40 (screenshot: −0.40)', () => {
    expect(wt.predictedMPHChange!).toBeCloseTo(-0.40, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Symmetry — RSA HPC is symmetric; improving vs worsening gives equal magnitude
// ─────────────────────────────────────────────────────────────────────────────

describe('symmetry — equal magnitude for equal-and-opposite weather changes', () => {
  const base = STANDARD;
  const ET = 9.0;

  it('−0.10 baro and +0.10 baro are equal magnitude', () => {
    const down = computeSensitivities(base, ET, { ...DEFAULT_SENSITIVITY_CONFIG, barometerChangeInHg: -0.10 });
    const up   = computeSensitivities(base, ET, { ...DEFAULT_SENSITIVITY_CONFIG, barometerChangeInHg: +0.10 });
    const dET = down.rows.find(r => r.variable === 'Barometer')!.predictedETChange;
    const uET = up.rows.find(r => r.variable === 'Barometer')!.predictedETChange;
    expect(Math.abs(dET)).toBeCloseTo(Math.abs(uET), 3);
  });

  it('+10°F and −10°F are equal magnitude', () => {
    const hot  = computeSensitivities(base, ET, { ...DEFAULT_SENSITIVITY_CONFIG, temperatureChangeF: +10 });
    const cool = computeSensitivities(base, ET, { ...DEFAULT_SENSITIVITY_CONFIG, temperatureChangeF: -10 });
    const hET = hot.rows.find(r => r.variable === 'Temperature')!.predictedETChange;
    const cET = cool.rows.find(r => r.variable === 'Temperature')!.predictedETChange;
    expect(Math.abs(hET)).toBeCloseTo(Math.abs(cET), 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. HPC identity — at hpc=1.0 (standard day), HPC row base value = 1.0
// ─────────────────────────────────────────────────────────────────────────────

describe('HPC base value at standard day', () => {
  it('base HPC is 1.0 at standard day conditions', () => {
    const r = computeSensitivities(STANDARD, 9.0);
    const hpcRow = r.rows.find(row => row.variable === 'HP Correction Factor')!;
    expect(hpcRow.baseValue).toBeCloseTo(1.0, 3);
  });

  it('base HPC > 1.0 at hot/humid/low-pressure conditions', () => {
    const hot: WeatherInput = { temperatureF: 90, humidityPct: 70, barometerInHg: 29.5, elevation: 0 };
    const r = computeSensitivities(hot, 9.5);
    expect(r.baseHpc).toBeGreaterThan(1.0);
    const hpcRow = r.rows.find(row => row.variable === 'HP Correction Factor')!;
    expect(hpcRow.baseValue).toBeGreaterThan(1.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Proportionality — ΔET scales with base ET for weather rows
// ─────────────────────────────────────────────────────────────────────────────

describe('proportionality — ΔET scales with ET_base for weather rows', () => {
  it('+10°F ΔET at 10.6 s is twice the ΔET at 5.3 s (RSA HPC is multiplicative)', () => {
    const r53  = computeSensitivities(STANDARD, 5.3);
    const r106 = computeSensitivities(STANDARD, 10.6);
    const dET53  = r53.rows.find(r => r.variable === 'Temperature')!.predictedETChange;
    const dET106 = r106.rows.find(r => r.variable === 'Temperature')!.predictedETChange;
    expect(dET106).toBeCloseTo(2 * dET53, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('weight row ET change is 0 when no baseWeightLb is supplied', () => {
    const r = computeSensitivities(STANDARD, 9.0);
    const w = r.rows.find(row => row.variable === 'Vehicle Weight')!;
    expect(w.predictedETChange).toBe(0);
    expect(w.predictedMPHChange).toBeNull();
  });

  it('humidity capped at 100%: 90% base + 10% change does not exceed 100%', () => {
    const humid: WeatherInput = { ...STANDARD, humidityPct: 90 };
    expect(() => computeSensitivities(humid, 9.0)).not.toThrow();
  });

  it('custom config overrides defaults', () => {
    const cfg: SensitivityConfig = {
      barometerChangeInHg: -0.20,
      temperatureChangeF: 5.0,
      humidityChangePct: 5.0,
      hpCorrectionFactorChange: 0.005,
      weightChangeLb: 50,
    };
    const r = computeSensitivities(STANDARD, 9.0, cfg, { baseWeightLb: 1500 });
    expect(r.config.barometerChangeInHg).toBe(-0.20);
    expect(r.config.weightChangeLb).toBe(50);
    const w = r.rows.find(row => row.variable === 'Vehicle Weight')!;
    expect(w.change).toBe(50);
    expect(w.predictedETChange).toBeGreaterThan(0);
  });
});
