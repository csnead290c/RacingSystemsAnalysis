/**
 * Tests for VB6 QUARTER Jr range validation and auto-clamping
 */

import { describe, it, expect } from 'vitest';
import {
  QUARTER_JR_LIMITS,
  clampToVB6Limit,
  validateAndClamp,
  getClampWarning,
} from '../quarterJrLimits';

describe('QUARTER Jr VB6 Range Limits', () => {
  describe('clampToVB6Limit', () => {
    it('should clamp weight below minimum', () => {
      const result = clampToVB6Limit(1000, 'weight');
      expect(result.value).toBe(1200);
      expect(result.clamped).toBe(true);
      expect(result.limit.fieldName).toBe('Weight');
    });

    it('should clamp weight above maximum', () => {
      const result = clampToVB6Limit(5000, 'weight');
      expect(result.value).toBe(4000);
      expect(result.clamped).toBe(true);
    });

    it('should not clamp weight within range', () => {
      const result = clampToVB6Limit(2500, 'weight');
      expect(result.value).toBe(2500);
      expect(result.clamped).toBe(false);
    });

    it('should clamp elevation below minimum', () => {
      const result = clampToVB6Limit(-100, 'elevation');
      expect(result.value).toBe(0);
      expect(result.clamped).toBe(true);
    });

    it('should clamp elevation above maximum', () => {
      const result = clampToVB6Limit(7000, 'elevation');
      expect(result.value).toBe(6000);
      expect(result.clamped).toBe(true);
    });

    it('should clamp barometer below minimum', () => {
      const result = clampToVB6Limit(28.5, 'barometer');
      expect(result.value).toBe(29.0);
      expect(result.clamped).toBe(true);
    });

    it('should clamp temperature above maximum', () => {
      const result = clampToVB6Limit(120, 'temperature');
      expect(result.value).toBe(110);
      expect(result.clamped).toBe(true);
    });

    it('should clamp RPM @ Peak HP below minimum', () => {
      const result = clampToVB6Limit(1500, 'rpmAtPeakHP');
      expect(result.value).toBe(2000);
      expect(result.clamped).toBe(true);
    });

    it('should clamp Peak HP above maximum', () => {
      const result = clampToVB6Limit(7000, 'peakHP');
      expect(result.value).toBe(6000);
      expect(result.clamped).toBe(true);
    });

    it('should clamp tire diameter within range', () => {
      const result = clampToVB6Limit(30, 'tireDiameter');
      expect(result.value).toBe(30);
      expect(result.clamped).toBe(false);
    });

    it('should clamp final drive ratio below minimum', () => {
      const result = clampToVB6Limit(2.5, 'finalDriveRatio');
      expect(result.value).toBe(3.07);
      expect(result.clamped).toBe(true);
    });

    it('should clamp traction index above maximum', () => {
      const result = clampToVB6Limit(15, 'tractionIndex');
      expect(result.value).toBe(12);
      expect(result.clamped).toBe(true);
    });
  });

  describe('validateAndClamp', () => {
    it('should return undefined for undefined input', () => {
      expect(validateAndClamp(undefined, 'weight')).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      expect(validateAndClamp(null, 'weight')).toBeUndefined();
    });

    it('should return undefined for NaN input', () => {
      expect(validateAndClamp(NaN, 'weight')).toBeUndefined();
    });

    it('should return clamped value for out-of-range input', () => {
      expect(validateAndClamp(10000, 'weight')).toBe(4000);
      expect(validateAndClamp(500, 'weight')).toBe(1200);
    });

    it('should return original value for in-range input', () => {
      expect(validateAndClamp(2500, 'weight')).toBe(2500);
    });
  });

  describe('getClampWarning', () => {
    it('should return null for values within range', () => {
      expect(getClampWarning(2500, 'weight')).toBeNull();
    });

    it('should return warning for value below minimum', () => {
      const warning = getClampWarning(1000, 'weight');
      expect(warning).toContain('Weight');
      expect(warning).toContain('below');
      expect(warning).toContain('1200');
    });

    it('should return warning for value above maximum', () => {
      const warning = getClampWarning(5000, 'weight');
      expect(warning).toContain('Weight');
      expect(warning).toContain('above');
      expect(warning).toContain('4000');
    });

    it('should include unit in warning', () => {
      const warning = getClampWarning(5000, 'weight');
      expect(warning).toContain('lbs');
    });
  });

  describe('VB6 Manual Range Compliance', () => {
    it('should have correct elevation range (0-6000 ft)', () => {
      expect(QUARTER_JR_LIMITS.elevation.min).toBe(0);
      expect(QUARTER_JR_LIMITS.elevation.max).toBe(6000);
    });

    it('should have correct barometer range (29.0-31.0 in Hg)', () => {
      expect(QUARTER_JR_LIMITS.barometer.min).toBe(29.0);
      expect(QUARTER_JR_LIMITS.barometer.max).toBe(31.0);
    });

    it('should have correct temperature range (40-110 °F)', () => {
      expect(QUARTER_JR_LIMITS.temperature.min).toBe(40);
      expect(QUARTER_JR_LIMITS.temperature.max).toBe(110);
    });

    it('should have correct weight range (1200-4000 lbs)', () => {
      expect(QUARTER_JR_LIMITS.weight.min).toBe(1200);
      expect(QUARTER_JR_LIMITS.weight.max).toBe(4000);
    });

    it('should have correct rollout range (0-14 inches)', () => {
      expect(QUARTER_JR_LIMITS.rollout.min).toBe(0.0);
      expect(QUARTER_JR_LIMITS.rollout.max).toBe(14);
    });

    it('should have correct displacement range (77-632 CID)', () => {
      expect(QUARTER_JR_LIMITS.displacement.min).toBe(77);
      expect(QUARTER_JR_LIMITS.displacement.max).toBe(632);
    });

    it('should have correct Peak HP range (100-6000 HP)', () => {
      expect(QUARTER_JR_LIMITS.peakHP.min).toBe(100);
      expect(QUARTER_JR_LIMITS.peakHP.max).toBe(6000);
    });

    it('should have correct clutch slip RPM range (2000-7000 RPM)', () => {
      expect(QUARTER_JR_LIMITS.clutchSlipRPM.min).toBe(2000);
      expect(QUARTER_JR_LIMITS.clutchSlipRPM.max).toBe(7000);
    });

    it('should have correct converter stall RPM range (2000-7500 RPM)', () => {
      expect(QUARTER_JR_LIMITS.converterStallRPM.min).toBe(2000);
      expect(QUARTER_JR_LIMITS.converterStallRPM.max).toBe(7500);
    });

    it('should have correct tire diameter range (24-37 inches)', () => {
      expect(QUARTER_JR_LIMITS.tireDiameter.min).toBe(24);
      expect(QUARTER_JR_LIMITS.tireDiameter.max).toBe(37);
    });

    it('should have correct traction index range (1-12)', () => {
      expect(QUARTER_JR_LIMITS.tractionIndex.min).toBe(1);
      expect(QUARTER_JR_LIMITS.tractionIndex.max).toBe(12);
    });
  });
});
