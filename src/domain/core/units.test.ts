import { describe, it, expect } from 'vitest';
import { mphToFps, fpsToMph, lbToSlug, inHgToPsi, clamp, round } from './units';

describe('units module', () => {
  it('exports all conversion functions', () => {
    expect(typeof mphToFps).toBe('function');
    expect(typeof fpsToMph).toBe('function');
    expect(typeof lbToSlug).toBe('function');
    expect(typeof inHgToPsi).toBe('function');
    expect(typeof clamp).toBe('function');
    expect(typeof round).toBe('function');
  });

  it('performs basic conversions without errors', () => {
    expect(mphToFps(60)).toBeCloseTo(88, 0);
    expect(fpsToMph(88)).toBeCloseTo(60, 0);
    expect(lbToSlug(32.174)).toBeCloseTo(1, 3);
    expect(inHgToPsi(29.92)).toBeCloseTo(14.7, 1);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(round(3.14159, 2)).toBe(3.14);
  });
});
