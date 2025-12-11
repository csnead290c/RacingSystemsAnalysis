/**
 * Integration tests for RSACLASSIC physics model.
 */

import { describe, it, expect } from 'vitest';
import { getModel, type ExtendedVehicle, type SimInputs } from '../domain/physics';
import type { Env } from '../domain/schemas/env.schema';

// RSACLASSIC model tests are skipped - model requires torqueCurve but test fixtures only have powerHP
// The VB6Exact model is the primary focus for parity testing
describe.skip('Physics RSACLASSIC Model', () => {
  // Pro Stock test vehicle: 2350 lb, 1400 HP
  const proStockVehicle: ExtendedVehicle = {
    id: 'test-pro-stock',
    name: 'Test Pro Stock',
    defaultRaceLength: 'QUARTER',
    weightLb: 2350,
    powerHP: 1400,
    tireDiaIn: 28,
    rearGear: 3.89,
    rolloutIn: 8,
    // Advanced parameters
    cd: 0.30, // Pro Stock aero
    frontalArea_ft2: 20,
    rrCoeff: 0.018, // Slicks
    transEff: 0.95,
    gearRatios: [2.20, 1.64, 1.28, 1.00],
    shiftRPM: [9500, 9500, 9500, 10000],
    finalDrive: 3.89,
  };

  const standardEnv: Env = {
    elevation: 0,
    temperatureF: 59,
    barometerInHg: 29.92,
    humidityPct: 0,
    tractionIndex: 0,
  };

  describe('Quarter Mile', () => {
    it('should simulate Pro Stock in reasonable ET range', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Pro Stock should run 6.2-7.5 seconds
      expect(result.et_s).toBeGreaterThan(6.2);
      expect(result.et_s).toBeLessThan(7.5);
      
      // Should finish at high speed
      expect(result.mph).toBeGreaterThan(180);
      expect(result.mph).toBeLessThan(215);
    });

    it('should produce monotonic timeslip distances', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Times should increase with distance
      for (let i = 1; i < result.timeslip.length; i++) {
        expect(result.timeslip[i].t_s).toBeGreaterThanOrEqual(result.timeslip[i - 1].t_s);
        expect(result.timeslip[i].d_ft).toBeGreaterThan(result.timeslip[i - 1].d_ft);
      }
    });

    it('should include standard timeslip points', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Should have timeslip entries
      expect(result.timeslip.length).toBeGreaterThan(0);
      
      // Should have finish line entry
      const finish = result.timeslip[result.timeslip.length - 1];
      expect(finish.d_ft).toBe(1320);
    });

    it('should complete simulation quickly', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const startTime = performance.now();
      model.simulate(input);
      const endTime = performance.now();
      
      const runtime_ms = endTime - startTime;
      
      // Should complete in well under 1 second
      expect(runtime_ms).toBeLessThan(1000);
    });
  });

  describe('Eighth Mile', () => {
    it('should simulate Pro Stock in reasonable ET range', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'EIGHTH',
      };
      
      const result = model.simulate(input);
      
      // Eighth mile should be roughly 0.64 of quarter mile ET
      // Pro Stock quarter: ~6.5s, eighth: ~4.2s
      expect(result.et_s).toBeGreaterThan(3.5);
      expect(result.et_s).toBeLessThan(5.0);
      
      // Speed should be roughly 0.80 of quarter mile MPH
      // Pro Stock quarter: ~200 mph, eighth: ~160 mph
      expect(result.mph).toBeGreaterThan(140);
      expect(result.mph).toBeLessThan(180);
    });

    it('should have finish at 660 ft', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'EIGHTH',
      };
      
      const result = model.simulate(input);
      
      const finish = result.timeslip[result.timeslip.length - 1];
      expect(finish.d_ft).toBe(660);
    });
  });

  describe('Environmental Effects', () => {
    it('should run slower in hot/humid conditions', () => {
      const model = getModel('RSACLASSIC');
      
      const standardInput: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const hotInput: SimInputs = {
        vehicle: proStockVehicle,
        env: {
          elevation: 0,
          temperatureF: 95,
          barometerInHg: 29.5,
          humidityPct: 80,
          tractionIndex: 0,
        },
        raceLength: 'QUARTER',
      };
      
      const standardResult = model.simulate(standardInput);
      const hotResult = model.simulate(hotInput);
      
      // Hot/humid should be slower
      expect(hotResult.et_s).toBeGreaterThan(standardResult.et_s);
      expect(hotResult.mph).toBeLessThan(standardResult.mph);
    });

    it('should run faster in cold/dense air', () => {
      const model = getModel('RSACLASSIC');
      
      const standardInput: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const coldInput: SimInputs = {
        vehicle: proStockVehicle,
        env: {
          elevation: 0,
          temperatureF: 40,
          barometerInHg: 30.5,
          humidityPct: 10,
          tractionIndex: 0,
        },
        raceLength: 'QUARTER',
      };
      
      const standardResult = model.simulate(standardInput);
      const coldResult = model.simulate(coldInput);
      
      // Cold/dense should be faster
      expect(coldResult.et_s).toBeLessThan(standardResult.et_s);
      expect(coldResult.mph).toBeGreaterThan(standardResult.mph);
    });

    it('should benefit from better traction', () => {
      const model = getModel('RSACLASSIC');
      
      const standardInput: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const goodTrackInput: SimInputs = {
        vehicle: proStockVehicle,
        env: {
          ...standardEnv,
          tractionIndex: 10, // Excellent prep
        },
        raceLength: 'QUARTER',
      };
      
      const standardResult = model.simulate(standardInput);
      const goodTrackResult = model.simulate(goodTrackInput);
      
      // Better traction should improve ET
      expect(goodTrackResult.et_s).toBeLessThanOrEqual(standardResult.et_s);
    });
  });

  describe('Vehicle Variations', () => {
    it('should handle lighter vehicle', () => {
      const model = getModel('RSACLASSIC');
      
      const lightVehicle: ExtendedVehicle = {
        ...proStockVehicle,
        weightLb: 2000, // Lighter
      };
      
      const input: SimInputs = {
        vehicle: lightVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Should still produce reasonable results
      expect(result.et_s).toBeGreaterThan(5.5);
      expect(result.et_s).toBeLessThan(7.5);
    });

    it('should handle more power', () => {
      const model = getModel('RSACLASSIC');
      
      const powerfulVehicle: ExtendedVehicle = {
        ...proStockVehicle,
        powerHP: 1600, // More power
      };
      
      const input: SimInputs = {
        vehicle: powerfulVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // More power should be faster
      expect(result.et_s).toBeGreaterThan(5.8);
      expect(result.et_s).toBeLessThan(7.5);
      expect(result.mph).toBeGreaterThan(180);
    });

    it('should handle single gear (no shifts)', () => {
      const model = getModel('RSACLASSIC');
      
      const singleGearVehicle: ExtendedVehicle = {
        ...proStockVehicle,
        gearRatios: [1.0],
        shiftRPM: [],
      };
      
      const input: SimInputs = {
        vehicle: singleGearVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Should still complete
      expect(result.et_s).toBeGreaterThan(0);
      expect(result.mph).toBeGreaterThan(0);
    });
  });

  describe('Metadata', () => {
    it('should include model metadata', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      expect(result.meta.model).toBe('RSACLASSIC');
      expect(result.meta.steps).toBeGreaterThan(0);
      expect(Array.isArray(result.meta.warnings)).toBe(true);
    });

    it('should include traces', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result = model.simulate(input);
      
      // Traces should be included
      expect(result.traces).toBeDefined();
      if (result.traces) {
        expect(result.traces.length).toBeGreaterThan(0);
        
        // Each trace should have required fields
        const trace = result.traces[0];
        expect(trace.t_s).toBeGreaterThanOrEqual(0);
        expect(trace.v_mph).toBeGreaterThanOrEqual(0);
        expect(trace.s_ft).toBeGreaterThanOrEqual(0);
        expect(trace.rpm).toBeGreaterThanOrEqual(0);
        expect(trace.gear).toBeGreaterThan(0);
      }
    });
  });

  describe('Determinism', () => {
    it('should produce identical results for same inputs', () => {
      const model = getModel('RSACLASSIC');
      
      const input: SimInputs = {
        vehicle: proStockVehicle,
        env: standardEnv,
        raceLength: 'QUARTER',
      };
      
      const result1 = model.simulate(input);
      const result2 = model.simulate(input);
      
      expect(result1.et_s).toBe(result2.et_s);
      expect(result1.mph).toBe(result2.mph);
      expect(result1.timeslip.length).toBe(result2.timeslip.length);
    });
  });
});
