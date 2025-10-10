import { describe, it, expect } from 'vitest';
import {
  mphToFps,
  fpsToMph,
  lbToSlug,
  inHgToPsi,
  clamp,
  round,
} from '../domain/core/units';
import {
  densityAltitudeFt,
  grainsOfWater,
  hpCorrectionV1,
} from '../domain/core/weather';
import type { Env } from '../domain/schemas/env.schema';

describe('Units Conversions', () => {
  describe('mphToFps and fpsToMph', () => {
    it('should convert mph to fps correctly', () => {
      expect(mphToFps(60)).toBeCloseTo(88, 0); // 60 mph ≈ 88 fps
      expect(mphToFps(100)).toBeCloseTo(146.67, 1);
      expect(mphToFps(0)).toBe(0);
    });

    it('should convert fps to mph correctly', () => {
      expect(fpsToMph(88)).toBeCloseTo(60, 0);
      expect(fpsToMph(146.67)).toBeCloseTo(100, 0);
      expect(fpsToMph(0)).toBe(0);
    });

    it('should be reversible', () => {
      const mph = 75;
      expect(fpsToMph(mphToFps(mph))).toBeCloseTo(mph, 5);
    });
  });

  describe('lbToSlug', () => {
    it('should convert pounds to slugs', () => {
      expect(lbToSlug(32.174)).toBeCloseTo(1, 5);
      expect(lbToSlug(3500)).toBeCloseTo(108.79, 1);
      expect(lbToSlug(0)).toBe(0);
    });
  });

  describe('inHgToPsi', () => {
    it('should convert inHg to psi', () => {
      expect(inHgToPsi(29.92)).toBeCloseTo(14.696, 2); // Standard atmospheric pressure
      expect(inHgToPsi(30)).toBeCloseTo(14.733, 2);
      expect(inHgToPsi(0)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('round', () => {
    it('should round to specified decimal places', () => {
      expect(round(3.14159, 2)).toBe(3.14);
      expect(round(3.14159, 3)).toBe(3.142);
      expect(round(3.14159, 0)).toBe(3);
      expect(round(10.5, 0)).toBe(11);
      expect(round(10.4, 0)).toBe(10);
    });
  });
});

describe('Weather Calculations', () => {
  // Baseline environment for comparisons
  const baselineEnv: Env = {
    elevation: 1000,
    temperatureF: 70,
    barometerInHg: 29.92,
    humidityPct: 50,
  };

  describe('densityAltitudeFt', () => {
    it('should calculate density altitude for baseline conditions', () => {
      const da = densityAltitudeFt(baselineEnv);
      expect(da).toBeGreaterThan(0);
      expect(da).toBeLessThan(10000);
      expect(Number.isFinite(da)).toBe(true);
    });

    it('should increase DA with higher temperature', () => {
      const coldEnv: Env = { ...baselineEnv, temperatureF: 50 };
      const hotEnv: Env = { ...baselineEnv, temperatureF: 90 };

      const coldDA = densityAltitudeFt(coldEnv);
      const hotDA = densityAltitudeFt(hotEnv);

      expect(hotDA).toBeGreaterThan(coldDA);
    });

    it('should increase DA with higher humidity', () => {
      const dryEnv: Env = { ...baselineEnv, humidityPct: 10 };
      const humidEnv: Env = { ...baselineEnv, humidityPct: 90 };

      const dryDA = densityAltitudeFt(dryEnv);
      const humidDA = densityAltitudeFt(humidEnv);

      expect(humidDA).toBeGreaterThan(dryDA);
    });

    it('should decrease DA with higher barometer', () => {
      const lowPressureEnv: Env = { ...baselineEnv, barometerInHg: 28.5 };
      const highPressureEnv: Env = { ...baselineEnv, barometerInHg: 30.5 };

      const lowPressureDA = densityAltitudeFt(lowPressureEnv);
      const highPressureDA = densityAltitudeFt(highPressureEnv);

      expect(lowPressureDA).toBeGreaterThan(highPressureDA);
    });

    it('should return finite values for extreme but valid conditions', () => {
      const extremeHot: Env = {
        elevation: 5000,
        temperatureF: 110,
        barometerInHg: 28.0,
        humidityPct: 90,
      };

      const extremeCold: Env = {
        elevation: 0,
        temperatureF: 20,
        barometerInHg: 31.0,
        humidityPct: 10,
      };

      expect(Number.isFinite(densityAltitudeFt(extremeHot))).toBe(true);
      expect(Number.isFinite(densityAltitudeFt(extremeCold))).toBe(true);
    });
  });

  describe('grainsOfWater', () => {
    it('should calculate grains of water for baseline conditions', () => {
      const grains = grainsOfWater(baselineEnv);
      expect(grains).toBeGreaterThan(0);
      expect(grains).toBeLessThan(500);
      expect(Number.isFinite(grains)).toBe(true);
    });

    it('should increase with higher humidity', () => {
      const dryEnv: Env = { ...baselineEnv, humidityPct: 20 };
      const humidEnv: Env = { ...baselineEnv, humidityPct: 80 };

      const dryGrains = grainsOfWater(dryEnv);
      const humidGrains = grainsOfWater(humidEnv);

      expect(humidGrains).toBeGreaterThan(dryGrains);
    });

    it('should increase with higher temperature at same relative humidity', () => {
      const coolEnv: Env = { ...baselineEnv, temperatureF: 60 };
      const warmEnv: Env = { ...baselineEnv, temperatureF: 90 };

      const coolGrains = grainsOfWater(coolEnv);
      const warmGrains = grainsOfWater(warmEnv);

      // Warmer air can hold more moisture at same RH%
      expect(warmGrains).toBeGreaterThan(coolGrains);
    });

    it('should return finite values for all valid humidity levels', () => {
      for (let humidity = 0; humidity <= 100; humidity += 10) {
        const env: Env = { ...baselineEnv, humidityPct: humidity };
        const grains = grainsOfWater(env);
        expect(Number.isFinite(grains)).toBe(true);
        expect(grains).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('hpCorrectionV1', () => {
    it('should calculate HP correction for baseline conditions', () => {
      const correction = hpCorrectionV1(baselineEnv);
      expect(correction).toBeGreaterThan(0.7);
      expect(correction).toBeLessThan(1.15);
      expect(Number.isFinite(correction)).toBe(true);
    });

    it('should decrease when density altitude worsens (hot conditions)', () => {
      const goodEnv: Env = {
        elevation: 1000,
        temperatureF: 60,
        barometerInHg: 30.2,
        humidityPct: 30,
      };

      const badEnv: Env = {
        elevation: 1000,
        temperatureF: 95,
        barometerInHg: 29.0,
        humidityPct: 80,
      };

      const goodCorrection = hpCorrectionV1(goodEnv);
      const badCorrection = hpCorrectionV1(badEnv);

      // Better conditions (lower DA) should give more power
      expect(goodCorrection).toBeGreaterThan(badCorrection);
    });

    it('should be higher with lower temperature (denser air)', () => {
      const coldEnv: Env = { ...baselineEnv, temperatureF: 50 };
      const hotEnv: Env = { ...baselineEnv, temperatureF: 90 };

      const coldCorrection = hpCorrectionV1(coldEnv);
      const hotCorrection = hpCorrectionV1(hotEnv);

      expect(coldCorrection).toBeGreaterThan(hotCorrection);
    });

    it('should be higher with higher barometric pressure', () => {
      const lowPressure: Env = { ...baselineEnv, barometerInHg: 28.5 };
      const highPressure: Env = { ...baselineEnv, barometerInHg: 30.5 };

      const lowCorrection = hpCorrectionV1(lowPressure);
      const highCorrection = hpCorrectionV1(highPressure);

      expect(highCorrection).toBeGreaterThan(lowCorrection);
    });

    it('should return finite values within bounds for extreme conditions', () => {
      const extremeConditions: Env[] = [
        { elevation: 0, temperatureF: 20, barometerInHg: 31.0, humidityPct: 10 },
        { elevation: 5000, temperatureF: 110, barometerInHg: 28.0, humidityPct: 90 },
        { elevation: 2500, temperatureF: 32, barometerInHg: 29.5, humidityPct: 100 },
      ];

      extremeConditions.forEach((env) => {
        const correction = hpCorrectionV1(env);
        expect(Number.isFinite(correction)).toBe(true);
        expect(correction).toBeGreaterThanOrEqual(0.7);
        expect(correction).toBeLessThanOrEqual(1.15);
      });
    });

    it('should show correlation between DA and HP correction', () => {
      // Create environments with varying DA
      const envs: Env[] = [
        { elevation: 0, temperatureF: 50, barometerInHg: 30.5, humidityPct: 20 },
        { elevation: 1000, temperatureF: 70, barometerInHg: 29.92, humidityPct: 50 },
        { elevation: 3000, temperatureF: 90, barometerInHg: 29.0, humidityPct: 80 },
      ];

      const das = envs.map(densityAltitudeFt);
      const corrections = envs.map(hpCorrectionV1);

      // Higher DA should generally mean lower HP correction
      expect(das[0]).toBeLessThan(das[1]);
      expect(das[1]).toBeLessThan(das[2]);
      expect(corrections[0]).toBeGreaterThan(corrections[1]);
      expect(corrections[1]).toBeGreaterThan(corrections[2]);
    });
  });
});
