/**
 * Additional integration tests for run completion.
 * Tests method selection, confidence scoring, and accuracy.
 */

import { describe, it, expect } from 'vitest';
import { completeRun, type Anchor } from '../domain/quarter/completion';
import { predictBaseline } from '../worker/pipeline';
import type { PredictRequest } from '../domain/quarter/types';

describe('Run Completion Advanced Tests', () => {
  const createRequest = (raceLength: 'EIGHTH' | 'QUARTER' = 'QUARTER'): PredictRequest => ({
    vehicle: {
      id: 'test',
      name: 'Test Car',
      weightLb: 3000,
      tireDiaIn: 28,
      rearGear: 3.73,
      rolloutIn: 12,
      powerHP: 400,
      defaultRaceLength: raceLength,
    },
    env: {
      elevation: 0,
      temperatureF: 75,
      barometerInHg: 29.92,
      humidityPct: 50,
    },
    raceLength,
  });

  describe('1000\' anchor with MPH (QUARTER mile)', () => {
    it('should return ET within reasonable range of baseline', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93, // At expected fraction
        mph: baseline.baseMPH * 0.95,
      };

      const result = completeRun(req, [anchor]);

      // Should be within clamped range (90% to 120%)
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.90);
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.20);
      
      // Should be reasonably close to baseline
      const percentDiff = Math.abs(result.et_s - baseline.baseET_s) / baseline.baseET_s;
      expect(percentDiff).toBeLessThan(0.15); // Within 15%
    });

    it('should use tail or blend method when mph provided', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93,
        mph: baseline.baseMPH * 0.95,
      };

      const result = completeRun(req, [anchor]);

      // With MPH at 1000', should use blend method
      expect(result.method).toBe('blend');
    });

    it('should have high confidence with mph at 1000\'', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93,
        mph: baseline.baseMPH * 0.95,
      };

      const result = completeRun(req, [anchor]);

      // 1000' with MPH should give 90 confidence
      expect(result.confidence).toBe(90);
    });

    it('should handle faster-than-expected anchor', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 0.98, // 2% faster
        mph: baseline.baseMPH * 0.95 * 1.02, // 2% faster mph
      };

      const result = completeRun(req, [anchor]);

      // Should still be within reasonable range
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.90);
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.05);
    });

    it('should handle slower-than-expected anchor', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 1.02, // 2% slower
        mph: baseline.baseMPH * 0.95 * 0.98, // 2% slower mph
      };

      const result = completeRun(req, [anchor]);

      // Should still be within reasonable range
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.95);
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.20);
    });
  });

  describe('330\' anchor without MPH', () => {
    it('should use scale method without mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
        // No mph
      };

      const result = completeRun(req, [anchor]);

      // Without MPH, should use scale method
      expect(result.method).toBe('scale');
    });

    it('should have lower confidence than 1000\' case', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor330: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
      };

      const anchor1000: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93,
        mph: baseline.baseMPH * 0.95,
      };

      const result330 = completeRun(req, [anchor330]);
      const result1000 = completeRun(req, [anchor1000]);

      // 330' without MPH should have lower confidence than 1000' with MPH
      expect(result330.confidence).toBeLessThan(result1000.confidence);
    });

    it('should have confidence of 50 (60 - 10 for missing mph)', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
      };

      const result = completeRun(req, [anchor]);

      // 330' base is 60, minus 10 for no MPH = 50
      expect(result.confidence).toBe(50);
    });

    it('should still produce reasonable ET estimate', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
      };

      const result = completeRun(req, [anchor]);

      // Should be within clamped range
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.9);
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.2);
    });
  });

  describe('660\' anchor with MPH', () => {
    it('should use blend method at 660\' with mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
        mph: baseline.baseMPH * 0.85,
      };

      const result = completeRun(req, [anchor]);

      // 660' with MPH should use blend
      expect(result.method).toBe('blend');
    });

    it('should have confidence of 80 at 660\' with mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
        mph: baseline.baseMPH * 0.85,
      };

      const result = completeRun(req, [anchor]);

      expect(result.confidence).toBe(80);
    });

    it('should have lower confidence without mph at 660\'', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchorWithMph: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
        mph: baseline.baseMPH * 0.85,
      };

      const anchorWithoutMph: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
      };

      const resultWith = completeRun(req, [anchorWithMph]);
      const resultWithout = completeRun(req, [anchorWithoutMph]);

      // With MPH should have 10 points higher confidence
      expect(resultWith.confidence).toBe(resultWithout.confidence + 10);
    });
  });

  describe('60\' anchor', () => {
    it('should use scale method at 60\'', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 60,
        t_s: baseline.baseET_s * 0.16,
      };

      const result = completeRun(req, [anchor]);

      expect(result.method).toBe('scale');
    });

    it('should have lowest confidence at 60\'', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor60: Anchor = {
        d_ft: 60,
        t_s: baseline.baseET_s * 0.16,
      };

      const anchor330: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
      };

      const anchor660: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
      };

      const result60 = completeRun(req, [anchor60]);
      const result330 = completeRun(req, [anchor330]);
      const result660 = completeRun(req, [anchor660]);

      // 60' should have lowest confidence
      expect(result60.confidence).toBeLessThan(result330.confidence);
      expect(result60.confidence).toBeLessThan(result660.confidence);
    });
  });

  describe('EIGHTH mile completion', () => {
    it('should work with EIGHTH mile at 330\'', () => {
      const req = createRequest('EIGHTH');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
      };

      const result = completeRun(req, [anchor]);

      // Should complete successfully
      expect(result.et_s).toBeGreaterThan(0);
      expect(result.method).toBe('scale');
    });

    it('should handle 660\' anchor at finish line for EIGHTH', () => {
      const req = createRequest('EIGHTH');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s,
        mph: baseline.baseMPH,
      };

      const result = completeRun(req, [anchor]);

      // At finish line, should return anchor time
      expect(result.et_s).toBe(baseline.baseET_s);
      expect(result.confidence).toBe(100);
    });
  });

  describe('Method selection logic', () => {
    it('should prefer furthest anchor when multiple provided', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchors: Anchor[] = [
        { d_ft: 60, t_s: baseline.baseET_s * 0.16 },
        { d_ft: 330, t_s: baseline.baseET_s * 0.44 },
        { d_ft: 1000, t_s: baseline.baseET_s * 0.93, mph: baseline.baseMPH * 0.95 },
      ];

      const result = completeRun(req, anchors);

      // Should use 1000' anchor (furthest)
      expect(result.method).toBe('blend');
      expect(result.confidence).toBe(90);
    });

    it('should use scale for mph at 330\' (< 660\')', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
        mph: 90, // MPH provided but anchor < 660'
      };

      const result = completeRun(req, [anchor]);

      // Should still use scale (not tail) because anchor < 660'
      expect(result.method).toBe('scale');
    });
  });

  describe('ET clamping', () => {
    it('should clamp unrealistically fast ET to 90% of baseline', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 0.5, // Unrealistically fast
        mph: baseline.baseMPH * 2,
      };

      const result = completeRun(req, [anchor]);

      // Should be clamped to minimum 90% of baseline
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.9);
    });

    it('should clamp unrealistically slow ET to 120% of baseline', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 1.5, // Unrealistically slow
        mph: baseline.baseMPH * 0.5,
      };

      const result = completeRun(req, [anchor]);

      // Should be clamped to maximum 120% of baseline
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.2);
    });
  });
});
