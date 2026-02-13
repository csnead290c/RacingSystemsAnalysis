/**
 * Tests for engineUnitConversions — SI display helpers.
 *
 * VB6 reference values from ENGINE.FRM LoadScreen and PRINT.FRM.
 */

import { describe, it, expect } from 'vitest';
import {
  cidToLiters,
  hpToKw,
  lbftToNm,
  tqPerCid,
  fmtLiters,
  fmtKw,
  fmtNm,
  fmtTqPerCid,
} from '../engineUnitConversions';

describe('cidToLiters', () => {
  it('converts BASECASE 350 CID correctly', () => {
    // 350 CID ≈ 5.736 L (well-known SBC 350)
    const L = cidToLiters(350);
    expect(L).toBeCloseTo(5.7355, 3);
  });

  it('converts 1 cubic inch', () => {
    expect(cidToLiters(1)).toBeCloseTo(0.016387, 4);
  });

  it('converts 0 CID to 0', () => {
    expect(cidToLiters(0)).toBe(0);
  });
});

describe('hpToKw', () => {
  it('converts 100 HP correctly', () => {
    // VB6: 100 / 1.34102 ≈ 74.57
    expect(hpToKw(100)).toBeCloseTo(74.57, 1);
  });

  it('converts 400 HP correctly', () => {
    // VB6: 400 / 1.34102 ≈ 298.28
    expect(hpToKw(400)).toBeCloseTo(298.28, 0);
  });

  it('converts 0 HP to 0', () => {
    expect(hpToKw(0)).toBe(0);
  });
});

describe('lbftToNm', () => {
  it('converts 100 lb-ft correctly', () => {
    // VB6: 100 * 0.3048 * 4.44822 ≈ 135.58
    expect(lbftToNm(100)).toBeCloseTo(135.58, 1);
  });

  it('converts 400 lb-ft correctly', () => {
    // VB6: 400 * 0.3048 * 4.44822 ≈ 542.33
    expect(lbftToNm(400)).toBeCloseTo(542.33, 0);
  });

  it('converts 0 lb-ft to 0', () => {
    expect(lbftToNm(0)).toBe(0);
  });
});

describe('tqPerCid', () => {
  it('computes TQ/CID for BASECASE-like values', () => {
    // 400 lb-ft / 350 CID ≈ 1.143
    expect(tqPerCid(400, 350)).toBeCloseTo(1.143, 3);
  });

  it('returns 0 for zero displacement', () => {
    expect(tqPerCid(400, 0)).toBe(0);
  });
});

describe('fmtLiters', () => {
  it('formats large displacement (CID >= 6.1) with 2 decimals', () => {
    // 350 CID → 5.74 L
    expect(fmtLiters(350)).toBe('5.74');
  });

  it('formats small displacement (CID < 6.1) with 3 decimals', () => {
    // 1 CID → 0.016 L
    expect(fmtLiters(1)).toBe('0.016');
  });

  it('handles NaN', () => {
    expect(fmtLiters(NaN)).toBe('—');
  });
});

describe('fmtKw', () => {
  it('formats >= 100 kW as integer', () => {
    // 400 HP → ~298 kW → "298"
    expect(fmtKw(400)).toBe('298');
  });

  it('formats 10-100 kW with 1 decimal', () => {
    // 20 HP → ~14.91 kW → "14.9"
    expect(fmtKw(20)).toBe('14.9');
  });

  it('formats < 10 kW with 2 decimals', () => {
    // 5 HP → ~3.73 kW → "3.73"
    expect(fmtKw(5)).toBe('3.73');
  });

  it('handles NaN', () => {
    expect(fmtKw(NaN)).toBe('—');
  });
});

describe('fmtNm', () => {
  it('formats >= 100 Nm as integer', () => {
    // 400 lb-ft → ~542 Nm → "542"
    expect(fmtNm(400)).toBe('542');
  });

  it('formats 10-100 Nm with 1 decimal', () => {
    // 50 lb-ft → ~67.79 Nm → "67.8"
    expect(fmtNm(50)).toBe('67.8');
  });

  it('formats < 10 Nm with 2 decimals', () => {
    // 5 lb-ft → ~6.78 Nm → "6.78"
    expect(fmtNm(5)).toBe('6.78');
  });

  it('handles NaN', () => {
    expect(fmtNm(NaN)).toBe('—');
  });
});

describe('fmtTqPerCid', () => {
  it('formats with 2 decimals', () => {
    expect(fmtTqPerCid(400, 350)).toBe('1.14');
  });

  it('handles zero displacement', () => {
    expect(fmtTqPerCid(400, 0)).toBe('—');
  });

  it('handles NaN torque', () => {
    expect(fmtTqPerCid(NaN, 350)).toBe('—');
  });
});
