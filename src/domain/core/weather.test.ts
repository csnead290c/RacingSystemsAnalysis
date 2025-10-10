import { describe, it, expect } from 'vitest';
import { densityAltitudeFt, grainsOfWater, hpCorrectionV1 } from './weather';
import type { Env } from '../schemas/env.schema';

describe('weather module', () => {
  const testEnv: Env = {
    elevation: 1000,
    temperatureF: 70,
    barometerInHg: 29.92,
    humidityPct: 50,
  };

  it('exports all weather functions', () => {
    expect(typeof densityAltitudeFt).toBe('function');
    expect(typeof grainsOfWater).toBe('function');
    expect(typeof hpCorrectionV1).toBe('function');
  });

  it('calculates density altitude without errors', () => {
    const da = densityAltitudeFt(testEnv);
    expect(Number.isFinite(da)).toBe(true);
    expect(da).toBeGreaterThan(-5000);
    expect(da).toBeLessThan(15000);
  });

  it('calculates grains of water without errors', () => {
    const grains = grainsOfWater(testEnv);
    expect(Number.isFinite(grains)).toBe(true);
    expect(grains).toBeGreaterThan(0);
    expect(grains).toBeLessThan(500);
  });

  it('calculates HP correction without errors', () => {
    const correction = hpCorrectionV1(testEnv);
    expect(Number.isFinite(correction)).toBe(true);
    expect(correction).toBeGreaterThan(0.7);
    expect(correction).toBeLessThan(1.15);
  });
});
