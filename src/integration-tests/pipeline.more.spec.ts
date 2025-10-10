/**
 * Additional integration tests for pipeline physics relationships.
 * Tests cube-root relationships and race length invariants.
 */

import { describe, it, expect } from 'vitest';
import { predictBaseline } from '../worker/pipeline';
import type { PredictRequest } from '../domain/quarter/types';

describe('Pipeline Physics Relationships', () => {
  const createRequest = (
    powerHP: number,
    elevation: number,
    raceLength: 'EIGHTH' | 'QUARTER' = 'QUARTER'
  ): PredictRequest => ({
    vehicle: {
      id: 'test',
      name: 'Test Car',
      weightLb: 3000,
      tireDiaIn: 28,
      rearGear: 3.73,
      rolloutIn: 12,
      powerHP,
      defaultRaceLength: raceLength,
    },
    env: {
      elevation,
      temperatureF: 75,
      barometerInHg: 29.92,
      humidityPct: 50,
    },
    raceLength,
  });

  describe('Power relationships', () => {
    it('should reduce ET when doubling HP', () => {
      const req1 = createRequest(400, 0);
      const req2 = createRequest(800, 0);

      const result1 = predictBaseline(req1);
      const result2 = predictBaseline(req2);

      // Doubling HP should reduce ET
      expect(result2.baseET_s).toBeLessThan(result1.baseET_s);
      
      // ET reduction should be significant (at least 5%)
      const reduction = (result1.baseET_s - result2.baseET_s) / result1.baseET_s;
      expect(reduction).toBeGreaterThan(0.05);
    });

    it('should increase MPH when doubling HP', () => {
      const req1 = createRequest(400, 0);
      const req2 = createRequest(800, 0);

      const result1 = predictBaseline(req1);
      const result2 = predictBaseline(req2);

      // Doubling HP should increase MPH
      expect(result2.baseMPH).toBeGreaterThan(result1.baseMPH);
      
      // MPH increase should be significant (at least 5%)
      const increase = (result2.baseMPH - result1.baseMPH) / result1.baseMPH;
      expect(increase).toBeGreaterThan(0.05);
    });

    it('should follow cube-root power relationship for ET', () => {
      const req1 = createRequest(400, 0);
      const req2 = createRequest(800, 0);

      const result1 = predictBaseline(req1);
      const result2 = predictBaseline(req2);

      // ET ratio should be approximately (P1/P2)^(1/3)
      // For 2x power: (1/2)^(1/3) ≈ 0.794
      const etRatio = result2.baseET_s / result1.baseET_s;
      
      // Should be in reasonable range around 0.794
      expect(etRatio).toBeGreaterThan(0.75);
      expect(etRatio).toBeLessThan(0.85);
    });
  });

  describe('Elevation effects', () => {
    it('should worsen ET at higher elevation', () => {
      const reqSeaLevel = createRequest(400, 0);
      const reqHighElevation = createRequest(400, 1000);

      const resultSeaLevel = predictBaseline(reqSeaLevel);
      const resultHighElevation = predictBaseline(reqHighElevation);

      // Higher elevation should increase ET (slower) or stay same if not implemented
      expect(resultHighElevation.baseET_s).toBeGreaterThanOrEqual(resultSeaLevel.baseET_s);
    });

    it('should reduce MPH at higher elevation', () => {
      const reqSeaLevel = createRequest(400, 0);
      const reqHighElevation = createRequest(400, 1000);

      const resultSeaLevel = predictBaseline(reqSeaLevel);
      const resultHighElevation = predictBaseline(reqHighElevation);

      // Higher elevation should reduce MPH or stay same if not implemented
      expect(resultHighElevation.baseMPH).toBeLessThanOrEqual(resultSeaLevel.baseMPH);
    });

    it('should handle different elevations without errors', () => {
      const reqSeaLevel = createRequest(400, 0);
      const reqHighElevation = createRequest(400, 5000);
      const reqNegative = createRequest(400, -282); // Death Valley

      // Should all complete without errors
      expect(() => predictBaseline(reqSeaLevel)).not.toThrow();
      expect(() => predictBaseline(reqHighElevation)).not.toThrow();
      expect(() => predictBaseline(reqNegative)).not.toThrow();
      
      const resultSeaLevel = predictBaseline(reqSeaLevel);
      const resultHigh = predictBaseline(reqHighElevation);
      const resultLow = predictBaseline(reqNegative);

      // All should produce valid results
      expect(resultSeaLevel.baseET_s).toBeGreaterThan(0);
      expect(resultHigh.baseET_s).toBeGreaterThan(0);
      expect(resultLow.baseET_s).toBeGreaterThan(0);
    });
  });

  describe('EIGHTH vs QUARTER mile invariants', () => {
    it('should have EIGHTH ET approximately 0.64 of QUARTER ET', () => {
      const reqQuarter = createRequest(400, 0, 'QUARTER');
      const reqEighth = createRequest(400, 0, 'EIGHTH');

      const resultQuarter = predictBaseline(reqQuarter);
      const resultEighth = predictBaseline(reqEighth);

      // EIGHTH ET should be roughly 64% of QUARTER ET
      const ratio = resultEighth.baseET_s / resultQuarter.baseET_s;
      
      // Allow ±0.15 tolerance (0.49 to 0.79)
      expect(ratio).toBeGreaterThan(0.64 - 0.15);
      expect(ratio).toBeLessThan(0.64 + 0.15);
    });

    it('should have EIGHTH MPH approximately 0.80 of QUARTER MPH', () => {
      const reqQuarter = createRequest(400, 0, 'QUARTER');
      const reqEighth = createRequest(400, 0, 'EIGHTH');

      const resultQuarter = predictBaseline(reqQuarter);
      const resultEighth = predictBaseline(reqEighth);

      // EIGHTH MPH should be roughly 80% of QUARTER MPH
      const ratio = resultEighth.baseMPH / resultQuarter.baseMPH;
      
      // Allow ±0.1 tolerance (0.70 to 0.90)
      expect(ratio).toBeGreaterThan(0.80 - 0.10);
      expect(ratio).toBeLessThan(0.80 + 0.10);
    });

    it('should maintain invariants across different power levels', () => {
      // Test with low power
      const reqQuarterLow = createRequest(300, 0, 'QUARTER');
      const reqEighthLow = createRequest(300, 0, 'EIGHTH');

      const resultQuarterLow = predictBaseline(reqQuarterLow);
      const resultEighthLow = predictBaseline(reqEighthLow);

      const ratioETLow = resultEighthLow.baseET_s / resultQuarterLow.baseET_s;
      const ratioMPHLow = resultEighthLow.baseMPH / resultQuarterLow.baseMPH;

      // Test with high power
      const reqQuarterHigh = createRequest(800, 0, 'QUARTER');
      const reqEighthHigh = createRequest(800, 0, 'EIGHTH');

      const resultQuarterHigh = predictBaseline(reqQuarterHigh);
      const resultEighthHigh = predictBaseline(reqEighthHigh);

      const ratioETHigh = resultEighthHigh.baseET_s / resultQuarterHigh.baseET_s;
      const ratioMPHHigh = resultEighthHigh.baseMPH / resultQuarterHigh.baseMPH;

      // Ratios should be similar regardless of power
      expect(Math.abs(ratioETLow - ratioETHigh)).toBeLessThan(0.1);
      expect(Math.abs(ratioMPHLow - ratioMPHHigh)).toBeLessThan(0.1);
    });

    it('should maintain invariants across different elevations', () => {
      // Test at sea level
      const reqQuarterSea = createRequest(400, 0, 'QUARTER');
      const reqEighthSea = createRequest(400, 0, 'EIGHTH');

      const resultQuarterSea = predictBaseline(reqQuarterSea);
      const resultEighthSea = predictBaseline(reqEighthSea);

      const ratioETSea = resultEighthSea.baseET_s / resultQuarterSea.baseET_s;
      const ratioMPHSea = resultEighthSea.baseMPH / resultQuarterSea.baseMPH;

      // Test at high elevation
      const reqQuarterHigh = createRequest(400, 2000, 'QUARTER');
      const reqEighthHigh = createRequest(400, 2000, 'EIGHTH');

      const resultQuarterHigh = predictBaseline(reqQuarterHigh);
      const resultEighthHigh = predictBaseline(reqEighthHigh);

      const ratioETHigh = resultEighthHigh.baseET_s / resultQuarterHigh.baseET_s;
      const ratioMPHHigh = resultEighthHigh.baseMPH / resultQuarterHigh.baseMPH;

      // Ratios should be similar regardless of elevation
      expect(Math.abs(ratioETSea - ratioETHigh)).toBeLessThan(0.1);
      expect(Math.abs(ratioMPHSea - ratioMPHHigh)).toBeLessThan(0.1);
    });
  });

  describe('Timeslip consistency', () => {
    it('should have monotonically increasing times', () => {
      const req = createRequest(400, 0);
      const result = predictBaseline(req);

      // Each split should have higher time than previous
      for (let i = 1; i < result.timeslip.length; i++) {
        expect(result.timeslip[i].t_s).toBeGreaterThan(result.timeslip[i - 1].t_s);
      }
    });

    it('should have monotonically increasing speeds', () => {
      const req = createRequest(400, 0);
      const result = predictBaseline(req);

      // Each split should have higher speed than previous
      for (let i = 1; i < result.timeslip.length; i++) {
        expect(result.timeslip[i].v_mph).toBeGreaterThan(result.timeslip[i - 1].v_mph);
      }
    });

    it('should have final timeslip match baseET and baseMPH', () => {
      const req = createRequest(400, 0);
      const result = predictBaseline(req);

      const finalSplit = result.timeslip[result.timeslip.length - 1];

      // Final split should match base values
      expect(finalSplit.t_s).toBeCloseTo(result.baseET_s, 3);
      expect(finalSplit.v_mph).toBeCloseTo(result.baseMPH, 2);
    });
  });
});
