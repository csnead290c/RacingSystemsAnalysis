import { describe, it, expect } from 'vitest';
import { predictBaseline } from '../worker/pipeline';
import { DISTANCES } from '../domain/config/raceLengths';
import type { PredictRequest } from '../domain/quarter/types';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import type { Env } from '../domain/schemas/env.schema';

describe('Prediction Pipeline', () => {
  // Demo vehicle for testing
  const demoVehicle: Vehicle = {
    id: 'demo-001',
    name: 'Test Car',
    weightLb: 3500,
    tireDiaIn: 28.5,
    rearGear: 3.73,
    rolloutIn: 89.5,
    powerHP: 450,
    defaultRaceLength: 'QUARTER',
  };

  // Standard environment
  const standardEnv: Env = {
    elevation: 1000,
    temperatureF: 70,
    barometerInHg: 29.92,
    humidityPct: 50,
  };

  describe('Race Length Distance Validation', () => {
    it('should return exactly [60, 330, 660] for EIGHTH mile', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'EIGHTH',
      };

      const result = predictBaseline(request);

      // Extract distances from timeslip
      const distances = result.timeslip.map((split) => split.d_ft);

      // Verify exact match with SSOT
      expect(distances).toEqual(DISTANCES.EIGHTH);
      expect(distances).toEqual([60, 330, 660]);
    });

    it('should return exactly [60, 330, 660, 1000, 1320] for QUARTER mile', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      // Extract distances from timeslip
      const distances = result.timeslip.map((split) => split.d_ft);

      // Verify exact match with SSOT
      expect(distances).toEqual(DISTANCES.QUARTER);
      expect(distances).toEqual([60, 330, 660, 1000, 1320]);
    });
  });

  describe('Baseline Prediction Validity', () => {
    it('should produce positive baseET_s for reasonable vehicle', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.baseET_s).toBeGreaterThan(0);
      expect(Number.isFinite(result.baseET_s)).toBe(true);
      
      // Sanity check: reasonable quarter-mile ET (8-15 seconds for typical car)
      expect(result.baseET_s).toBeGreaterThan(8);
      expect(result.baseET_s).toBeLessThan(15);
    });

    it('should produce positive baseMPH for reasonable vehicle', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.baseMPH).toBeGreaterThan(0);
      expect(Number.isFinite(result.baseMPH)).toBe(true);
      
      // Sanity check: reasonable trap speed (80-140 mph for typical car)
      expect(result.baseMPH).toBeGreaterThan(80);
      expect(result.baseMPH).toBeLessThan(140);
    });

    it('should produce valid timeslip with increasing times', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.timeslip.length).toBe(5); // Quarter mile has 5 splits

      // Verify times are increasing
      for (let i = 1; i < result.timeslip.length; i++) {
        expect(result.timeslip[i].t_s).toBeGreaterThan(result.timeslip[i - 1].t_s);
      }

      // Verify all times are finite and non-negative
      result.timeslip.forEach((split) => {
        expect(Number.isFinite(split.t_s)).toBe(true);
        expect(split.t_s).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(split.v_mph)).toBe(true);
        expect(split.v_mph).toBeGreaterThanOrEqual(0);
      });
    });

    it('should produce valid timeslip with increasing speeds', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      // Verify speeds are increasing (or at least non-decreasing)
      for (let i = 1; i < result.timeslip.length; i++) {
        expect(result.timeslip[i].v_mph).toBeGreaterThanOrEqual(result.timeslip[i - 1].v_mph);
      }
    });

    it('should include correction factors', () => {
      const request: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.factors).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);

      // Verify factor structure
      result.factors.forEach((factor) => {
        expect(factor.name).toBeDefined();
        expect(typeof factor.name).toBe('string');
        expect(Number.isFinite(factor.delta_s)).toBe(true);
      });
    });
  });

  describe('Edge Cases and Safety', () => {
    it('should handle high-power vehicle', () => {
      const highPowerVehicle: Vehicle = {
        ...demoVehicle,
        powerHP: 1000,
        weightLb: 3000,
      };

      const request: PredictRequest = {
        vehicle: highPowerVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.baseET_s).toBeGreaterThan(0);
      expect(result.baseMPH).toBeGreaterThan(0);
      expect(Number.isFinite(result.baseET_s)).toBe(true);
      expect(Number.isFinite(result.baseMPH)).toBe(true);
    });

    it('should handle heavy vehicle', () => {
      const heavyVehicle: Vehicle = {
        ...demoVehicle,
        weightLb: 5000,
        powerHP: 300,
      };

      const request: PredictRequest = {
        vehicle: heavyVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const result = predictBaseline(request);

      expect(result.baseET_s).toBeGreaterThan(0);
      expect(result.baseMPH).toBeGreaterThan(0);
      expect(Number.isFinite(result.baseET_s)).toBe(true);
      expect(Number.isFinite(result.baseMPH)).toBe(true);
    });

    it('should throw error for zero power', () => {
      const zeroPowerVehicle: Vehicle = {
        ...demoVehicle,
        powerHP: 0,
      };

      const request: PredictRequest = {
        vehicle: zeroPowerVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      expect(() => predictBaseline(request)).toThrow();
    });

    it('should throw error for zero weight', () => {
      const zeroWeightVehicle: Vehicle = {
        ...demoVehicle,
        weightLb: 0,
      };

      const request: PredictRequest = {
        vehicle: zeroWeightVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      expect(() => predictBaseline(request)).toThrow();
    });

    it('should throw error for negative power', () => {
      const negativePowerVehicle: Vehicle = {
        ...demoVehicle,
        powerHP: -100,
      };

      const request: PredictRequest = {
        vehicle: negativePowerVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      expect(() => predictBaseline(request)).toThrow();
    });
  });

  describe('Weather Impact', () => {
    it('should show different results for different weather conditions', () => {
      const goodWeather: Env = {
        elevation: 500,
        temperatureF: 60,
        barometerInHg: 30.2,
        humidityPct: 30,
      };

      const badWeather: Env = {
        elevation: 3000,
        temperatureF: 95,
        barometerInHg: 28.5,
        humidityPct: 80,
      };

      const goodRequest: PredictRequest = {
        vehicle: demoVehicle,
        env: goodWeather,
        raceLength: 'QUARTER',
      };

      const badRequest: PredictRequest = {
        vehicle: demoVehicle,
        env: badWeather,
        raceLength: 'QUARTER',
      };

      const goodResult = predictBaseline(goodRequest);
      const badResult = predictBaseline(badRequest);

      // Good weather should produce faster times (lower ET)
      expect(goodResult.baseET_s).toBeLessThan(badResult.baseET_s);
      
      // Good weather should produce higher trap speed
      expect(goodResult.baseMPH).toBeGreaterThan(badResult.baseMPH);
    });
  });

  describe('EIGHTH vs QUARTER Mile', () => {
    it('should produce faster times for EIGHTH mile', () => {
      const eighthRequest: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'EIGHTH',
      };

      const quarterRequest: PredictRequest = {
        vehicle: demoVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };

      const eighthResult = predictBaseline(eighthRequest);
      const quarterResult = predictBaseline(quarterRequest);

      // Eighth mile should be faster (lower ET)
      expect(eighthResult.baseET_s).toBeLessThan(quarterResult.baseET_s);
      
      // Eighth mile should have lower trap speed
      expect(eighthResult.baseMPH).toBeLessThan(quarterResult.baseMPH);
    });
  });
});
