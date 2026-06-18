/**
 * Weather Impact & Pressure Utilities Audit — weatherImpact.ts
 *
 * Tests cover:
 *   1. Barometer solver round-trip (existing)
 *   2. Pressure unit conversions: hPaToInHg, inHgToHPa, kPaToInHg
 *   3. Station-to-sea-level conversion (stationToSeaLevelInHg)
 *   4. WeatherKit hPa → RSA inHg normalization example
 *   5. Density altitude consistency with pressure inputs
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDensityAltitude,
  solveBarometerForDensityAltitude,
  hPaToInHg,
  inHgToHPa,
  kPaToInHg,
  stationToSeaLevelInHg,
} from '../weatherImpact';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Barometer solver round-trip (retained from original test)
// ─────────────────────────────────────────────────────────────────────────────

describe('solveBarometerForDensityAltitude', () => {
  it('round-trips: solved barometer reproduces a DA computed from a known barometer', () => {
    const cases = [
      { tempF: 59, humidityPct: 0,  baro: 29.92, elevationFt: 0 },
      { tempF: 75, humidityPct: 50, baro: 29.92, elevationFt: 0 },
      { tempF: 90, humidityPct: 60, baro: 30.10, elevationFt: 0 },
      { tempF: 45, humidityPct: 30, baro: 29.40, elevationFt: 0 },
      { tempF: 70, humidityPct: 55, baro: 28.50, elevationFt: 1200 },
    ];

    for (const c of cases) {
      const targetDA = calculateDensityAltitude(c.tempF, c.baro, c.humidityPct, c.elevationFt);
      const solved = solveBarometerForDensityAltitude(targetDA, c.tempF, c.humidityPct, c.elevationFt);
      expect(solved.converged).toBe(true);
      expect(Math.abs(solved.barometerInHg - c.baro)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(solved.densityAltitude - targetDA)).toBeLessThanOrEqual(10);
    }
  });

  it('solves a realistic time slip example (59.2°F, 77% RH, 391 ft DA at sea level)', () => {
    const solved = solveBarometerForDensityAltitude(391, 59.2, 77, 0);
    expect(solved.converged).toBe(true);
    expect(solved.barometerInHg).toBeGreaterThan(29.0);
    expect(solved.barometerInHg).toBeLessThan(30.2);
    expect(Math.abs(solved.densityAltitude - 391)).toBeLessThanOrEqual(10);
  });

  it('marks not converged when the target DA is outside the barometer range', () => {
    const solved = solveBarometerForDensityAltitude(-20000, 120, 0, 0);
    expect(solved.converged).toBe(false);
    expect(solved.barometerInHg).toBeGreaterThanOrEqual(24.0);
    expect(solved.barometerInHg).toBeLessThanOrEqual(31.5);
  });

  it('respects a custom elevation by shifting the required barometer', () => {
    const da = 1000;
    const seaLevel  = solveBarometerForDensityAltitude(da, 70, 50, 0);
    const highElev  = solveBarometerForDensityAltitude(da, 70, 50, 2000);
    expect(highElev.barometerInHg).toBeGreaterThan(seaLevel.barometerInHg);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pressure unit conversions
// ─────────────────────────────────────────────────────────────────────────────

describe('pressure unit conversions', () => {
  it('hPaToInHg: 1013.25 hPa (standard atmosphere) → 29.92 inHg', () => {
    expect(hPaToInHg(1013.25)).toBeCloseTo(29.921, 2);
  });

  it('inHgToHPa: 29.92 inHg → 1013.25 hPa', () => {
    expect(inHgToHPa(29.92)).toBeCloseTo(1013.25, 0);
  });

  it('hPaToInHg / inHgToHPa are exact inverses within floating-point precision', () => {
    const values = [950, 980, 1013.25, 1020, 1040];
    for (const hPa of values) {
      expect(inHgToHPa(hPaToInHg(hPa))).toBeCloseTo(hPa, 4);
    }
  });

  it('kPaToInHg: 101.325 kPa → 29.92 inHg', () => {
    expect(kPaToInHg(101.325)).toBeCloseTo(29.921, 2);
  });

  it('hPaToInHg returns correct values for typical racing weather', () => {
    // Low pressure day: 990 hPa
    expect(hPaToInHg(990)).toBeCloseTo(29.24, 1);
    // High pressure day: 1030 hPa
    expect(hPaToInHg(1030)).toBeCloseTo(30.42, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Station-to-sea-level pressure conversion
// ─────────────────────────────────────────────────────────────────────────────

describe('stationToSeaLevelInHg', () => {
  it('returns station pressure unchanged at sea level (elevation = 0)', () => {
    const stationInHg = 29.50;
    const result = stationToSeaLevelInHg(stationInHg, 0, 70);
    expect(result).toBeCloseTo(stationInHg, 2);
  });

  it('sea-level equivalent is higher than station pressure at altitude', () => {
    const stationInHg = 28.00;
    const result = stationToSeaLevelInHg(stationInHg, 2000, 70);
    expect(result).toBeGreaterThan(stationInHg);
  });

  it('produces plausible sea-level correction at Denver (~5280 ft)', () => {
    // At ~5280 ft, station pressure is typically ~4 inHg below sea level
    const stationInHg = 25.5;
    const seaLevel = stationToSeaLevelInHg(stationInHg, 5280, 70);
    expect(seaLevel).toBeGreaterThan(stationInHg + 2);
    expect(seaLevel).toBeLessThan(stationInHg + 6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. WeatherKit hPa → RSA inHg normalization example
//    Apple WeatherKit returns sea-level pressure in hPa.
//    No station-to-sea-level conversion needed; only unit conversion.
// ─────────────────────────────────────────────────────────────────────────────

describe('WeatherKit hPa → RSA inHg normalization', () => {
  it('typical WeatherKit sea-level pressure converts to RSA inHg correctly', () => {
    // WeatherKit response: { pressure: 1008.4, pressureUnit: "hPa" }
    const weatherKitHPa = 1008.4;
    const rsaInHg = hPaToInHg(weatherKitHPa);
    // Should be in the ~29.77 range
    expect(rsaInHg).toBeGreaterThan(29.0);
    expect(rsaInHg).toBeLessThan(30.5);
    expect(rsaInHg).toBeCloseTo(29.77, 1);
  });

  it('standard atmosphere pressure converts to 29.92 inHg exactly', () => {
    const stdHPa = 1013.25;
    expect(hPaToInHg(stdHPa)).toBeCloseTo(29.92, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Density altitude consistency with pressure inputs
// ─────────────────────────────────────────────────────────────────────────────

describe('density altitude consistency', () => {
  it('higher temperature → higher DA (worse air)', () => {
    const da60 = calculateDensityAltitude(60,  29.92, 0, 0);
    const da80 = calculateDensityAltitude(80,  29.92, 0, 0);
    expect(da80).toBeGreaterThan(da60);
  });

  it('lower barometer → higher DA (worse air)', () => {
    const daHigh = calculateDensityAltitude(70, 30.10, 0, 0);
    const daLow  = calculateDensityAltitude(70, 29.50, 0, 0);
    expect(daLow).toBeGreaterThan(daHigh);
  });

  it('RSA Standard Day (60°F/0%/29.92 inHg/0 ft) DA is near 0 ft', () => {
    const da = calculateDensityAltitude(60, 29.92, 0, 0);
    expect(da).toBeGreaterThan(-200);
    expect(da).toBeLessThan(200);
  });

  it('DA at 86°F/76%/29.22 inHg (screenshot baseline) is positive', () => {
    const da = calculateDensityAltitude(86, 29.22, 76, 0);
    expect(da).toBeGreaterThan(1000);
  });
});
