import { describe, it, expect } from 'vitest';
import {
  calculateDensityAltitude,
  solveBarometerForDensityAltitude,
} from './weatherImpact';

describe('solveBarometerForDensityAltitude', () => {
  it('round-trips: solved barometer reproduces a DA computed from a known barometer', () => {
    const cases = [
      { tempF: 59, humidityPct: 0, baro: 29.92, elevationFt: 0 },
      { tempF: 75, humidityPct: 50, baro: 29.92, elevationFt: 0 },
      { tempF: 90, humidityPct: 60, baro: 30.10, elevationFt: 0 },
      { tempF: 45, humidityPct: 30, baro: 29.40, elevationFt: 0 },
      { tempF: 70, humidityPct: 55, baro: 28.50, elevationFt: 1200 },
    ];

    for (const c of cases) {
      const targetDA = calculateDensityAltitude(
        c.tempF,
        c.baro,
        c.humidityPct,
        c.elevationFt
      );
      const solved = solveBarometerForDensityAltitude(
        targetDA,
        c.tempF,
        c.humidityPct,
        c.elevationFt
      );

      expect(solved.converged).toBe(true);
      // Solved barometer should be within rounding distance of the original.
      expect(Math.abs(solved.barometerInHg - c.baro)).toBeLessThanOrEqual(0.02);
      // And the DA it produces should match the target within tolerance.
      expect(Math.abs(solved.densityAltitude - targetDA)).toBeLessThanOrEqual(10);
    }
  });

  it('solves a realistic time slip example (59.2°F, 77% RH, 391 ft DA at sea level)', () => {
    const solved = solveBarometerForDensityAltitude(391, 59.2, 77, 0);

    expect(solved.converged).toBe(true);
    // Sanity: should be a believable near-standard barometer.
    expect(solved.barometerInHg).toBeGreaterThan(29.0);
    expect(solved.barometerInHg).toBeLessThan(30.2);
    expect(Math.abs(solved.densityAltitude - 391)).toBeLessThanOrEqual(10);
  });

  it('marks not converged when the target DA is outside the barometer range', () => {
    // An absurdly low DA at very hot temps cannot be reached within 24-31.5 inHg.
    const solved = solveBarometerForDensityAltitude(-20000, 120, 0, 0);
    expect(solved.converged).toBe(false);
    // Still returns a bounded, usable barometer.
    expect(solved.barometerInHg).toBeGreaterThanOrEqual(24.0);
    expect(solved.barometerInHg).toBeLessThanOrEqual(31.5);
  });

  it('respects a custom elevation by shifting the required barometer', () => {
    const da = 1000;
    const seaLevel = solveBarometerForDensityAltitude(da, 70, 50, 0);
    const highElev = solveBarometerForDensityAltitude(da, 70, 50, 2000);
    // calculateDensityAltitude adds elevation, so at higher elevation the
    // barometer-derived portion must be smaller => higher barometer needed.
    expect(highElev.barometerInHg).toBeGreaterThan(seaLevel.barometerInHg);
  });
});
