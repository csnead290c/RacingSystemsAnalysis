/**
 * Integration tests for run completion logic.
 * Tests completeRun with various anchor scenarios.
 */

import { describe, it, expect } from 'vitest';
import { completeRun, type Anchor } from '../domain/quarter/completion';
import { predictBaseline } from '../worker/pipeline';
import type { PredictRequest } from '../domain/quarter/types';

describe('Run Completion', () => {
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

  describe('Basic functionality', () => {
    it('should complete run from 1000\' anchor with mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93, // At expected fraction
        mph: baseline.baseMPH * 0.95, // Slightly slower than trap
      };

      const result = completeRun(req, [anchor]);

      // Should use blend method (has mph at 1000')
      expect(result.method).toBe('blend');
      
      // ET should be close to baseline but might be slightly different
      expect(result.et_s).toBeGreaterThan(baseline.baseET_s * 0.9);
      expect(result.et_s).toBeLessThan(baseline.baseET_s * 1.2);
      
      // Confidence should be 90 for 1000' with mph
      expect(result.confidence).toBe(90);
    });

    it('should complete run from 660\' anchor with mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s * 0.79,
        mph: baseline.baseMPH * 0.85,
      };

      const result = completeRun(req, [anchor]);

      // Should use blend method (has mph at 660')
      expect(result.method).toBe('blend');
      
      // Confidence should be 80 for 660' with mph
      expect(result.confidence).toBe(80);
      
      // ET should be reasonable
      expect(result.et_s).toBeGreaterThan(baseline.baseET_s * 0.9);
      expect(result.et_s).toBeLessThan(baseline.baseET_s * 1.2);
    });

    it('should use scale method when no mph provided', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93,
        // No mph
      };

      const result = completeRun(req, [anchor]);

      // Should use scale method (no mph)
      expect(result.method).toBe('scale');
      
      // Confidence should be 80 (90 - 10 for missing mph)
      expect(result.confidence).toBe(80);
    });

    it('should use scale method for 330\' anchor even with mph', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
        mph: 90, // mph provided but anchor < 660'
      };

      const result = completeRun(req, [anchor]);

      // Should use scale method (anchor < 660')
      expect(result.method).toBe('scale');
      
      // Confidence should be 60 for 330' with mph
      expect(result.confidence).toBe(60);
    });

    it('should use scale method for 60\' anchor', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 60,
        t_s: baseline.baseET_s * 0.16,
      };

      const result = completeRun(req, [anchor]);

      // Should use scale method
      expect(result.method).toBe('scale');
      
      // Confidence should be 30 (40 - 10 for missing mph)
      expect(result.confidence).toBe(30);
    });
  });

  describe('Baseline comparison', () => {
    it('should produce ET close to baseline when anchor is near expected', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93, // Exactly at expected fraction
        mph: baseline.baseMPH * 0.95,
      };

      const result = completeRun(req, [anchor]);

      // Should be reasonably close to baseline (within 10%)
      // Note: blend method combines scale and tail, so some variation is expected
      const diff = Math.abs(result.et_s - baseline.baseET_s);
      const percentDiff = (diff / baseline.baseET_s) * 100;
      
      expect(percentDiff).toBeLessThan(10);
    });

    it('should handle faster-than-expected run', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 0.98, // 2% faster than expected
        mph: baseline.baseMPH * 1.02, // 2% faster mph
      };

      const result = completeRun(req, [anchor]);

      // Should produce a reasonable ET (blend method balances scale and tail)
      expect(result.et_s).toBeGreaterThan(baseline.baseET_s * 0.9);
      expect(result.et_s).toBeLessThan(baseline.baseET_s * 1.1);
    });

    it('should handle slower-than-expected run', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 1.02, // 2% slower than expected
        mph: baseline.baseMPH * 0.98, // 2% slower mph
      };

      const result = completeRun(req, [anchor]);

      // Should produce a reasonable ET
      expect(result.et_s).toBeGreaterThan(baseline.baseET_s * 0.9);
      expect(result.et_s).toBeLessThan(baseline.baseET_s * 1.1);
    });
  });

  describe('EIGHTH mile support', () => {
    it('should work with EIGHTH mile race', () => {
      const req = createRequest('EIGHTH');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 330,
        t_s: baseline.baseET_s * 0.44,
        mph: baseline.baseMPH * 0.7,
      };

      const result = completeRun(req, [anchor]);

      // Should complete successfully
      expect(result.et_s).toBeGreaterThan(0);
      expect(result.method).toBe('scale'); // 330' < 660'
      expect(result.confidence).toBe(60);
    });

    it('should use blend method for 660\' anchor in EIGHTH mile', () => {
      const req = createRequest('EIGHTH');
      const baseline = predictBaseline(req);

      // 660' is the finish for EIGHTH mile
      const anchor: Anchor = {
        d_ft: 660,
        t_s: baseline.baseET_s,
        mph: baseline.baseMPH,
      };

      const result = completeRun(req, [anchor]);

      // At finish line, should return anchor time directly
      expect(result.et_s).toBe(baseline.baseET_s);
      expect(result.confidence).toBe(100);
    });
  });

  describe('Multiple anchors', () => {
    it('should pick the furthest anchor', () => {
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
  });

  describe('ET clamping', () => {
    it('should clamp ET to minimum 90% of baseline', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 0.5, // Unrealistically fast
        mph: baseline.baseMPH * 2,
      };

      const result = completeRun(req, [anchor]);

      // Should be clamped to 90% of baseline
      expect(result.et_s).toBeGreaterThanOrEqual(baseline.baseET_s * 0.9);
    });

    it('should clamp ET to maximum 120% of baseline', () => {
      const req = createRequest('QUARTER');
      const baseline = predictBaseline(req);

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: baseline.baseET_s * 0.93 * 1.5, // Unrealistically slow
        mph: baseline.baseMPH * 0.5,
      };

      const result = completeRun(req, [anchor]);

      // Should be clamped to 120% of baseline
      expect(result.et_s).toBeLessThanOrEqual(baseline.baseET_s * 1.2);
    });
  });

  describe('Error handling', () => {
    it('should throw on empty anchors array', () => {
      const req = createRequest('QUARTER');

      expect(() => completeRun(req, [])).toThrow('At least one anchor point is required');
    });

    it('should throw on invalid anchor distance', () => {
      const req = createRequest('QUARTER');

      const anchor: Anchor = {
        d_ft: 0,
        t_s: 5.0,
      };

      expect(() => completeRun(req, [anchor])).toThrow('Invalid anchor');
    });

    it('should throw on invalid anchor time', () => {
      const req = createRequest('QUARTER');

      const anchor: Anchor = {
        d_ft: 1000,
        t_s: 0,
      };

      expect(() => completeRun(req, [anchor])).toThrow('Invalid anchor');
    });

    it('should throw on unsupported anchor distance', () => {
      const req = createRequest('QUARTER');

      const anchor: Anchor = {
        d_ft: 500, // Not a standard split
        t_s: 5.0,
      };

      expect(() => completeRun(req, [anchor])).toThrow('Unsupported anchor distance');
    });
  });
});
