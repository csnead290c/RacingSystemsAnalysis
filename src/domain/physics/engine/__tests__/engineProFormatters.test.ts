import { describe, it, expect } from 'vitest';
import {
  fmtAngle, fmtDim3, fmtDim2, fmtArea, fmtFPM, fmtFPS, fmtGs,
  fmtCFM, fmtCC, fmtCI, fmtInH2O, fmtPct, fmtCamDeg, fmtInt, fmtDimFrac,
} from '../engineProFormatters';

describe('engineProFormatters', () => {
  // ── guard: undefined / NaN / Infinity → "—" ──
  const DASH = '—';
  const badValues: [string, unknown][] = [
    ['undefined', undefined],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
  ];

  for (const [label, val] of badValues) {
    it(`fmtAngle returns dash for ${label}`, () => {
      expect(fmtAngle(val as number)).toBe(DASH);
    });
    it(`fmtDim3 returns dash for ${label}`, () => {
      expect(fmtDim3(val as number)).toBe(DASH);
    });
    it(`fmtCFM returns dash for ${label}`, () => {
      expect(fmtCFM(val as number)).toBe(DASH);
    });
    it(`fmtInt returns dash for ${label}`, () => {
      expect(fmtInt(val as number)).toBe(DASH);
    });
  }

  // ── normal values ──
  it('fmtAngle formats with 1 decimal + °', () => {
    expect(fmtAngle(72.345)).toBe('72.3°');
    expect(fmtAngle(0)).toBe('0.0°');
    expect(fmtAngle(180)).toBe('180.0°');
  });

  it('fmtDim3 formats with 3 decimals + in', () => {
    expect(fmtDim3(0.55)).toBe('0.550 in');
    expect(fmtDim3(2.05)).toBe('2.050 in');
  });

  it('fmtDim2 formats with 2 decimals + in', () => {
    expect(fmtDim2(1.6875)).toBe('1.69 in');
  });

  it('fmtArea formats with 2 decimals + sq in', () => {
    expect(fmtArea(2.4)).toBe('2.40 sq in');
    expect(fmtArea(0)).toBe('0.00 sq in');
  });

  it('fmtFPM rounds to integer + fpm', () => {
    expect(fmtFPM(3842.7)).toBe('3843 fpm');
    expect(fmtFPM(0)).toBe('0 fpm');
  });

  it('fmtFPS formats with 1 decimal + fps', () => {
    expect(fmtFPS(64.03)).toBe('64.0 fps');
  });

  it('fmtGs formats with 1 decimal + g', () => {
    expect(fmtGs(412.34)).toBe('412.3 g');
  });

  it('fmtCFM rounds to integer + CFM', () => {
    expect(fmtCFM(250.4)).toBe('250 CFM');
    expect(fmtCFM(749.6)).toBe('750 CFM');
  });

  it('fmtCC rounds to integer + cc', () => {
    expect(fmtCC(184.7)).toBe('185 cc');
  });

  it('fmtCI rounds to integer + ci', () => {
    expect(fmtCI(45.3)).toBe('45 ci');
  });

  it('fmtInH2O formats with 1 decimal + inH₂O', () => {
    expect(fmtInH2O(28)).toBe('28.0 inH₂O');
  });

  it('fmtPct formats with 1 decimal + %', () => {
    expect(fmtPct(72.456)).toBe('72.5%');
    expect(fmtPct(100)).toBe('100.0%');
  });

  it('fmtCamDeg rounds to integer + °', () => {
    expect(fmtCamDeg(264.4)).toBe('264°');
    expect(fmtCamDeg(264.6)).toBe('265°');
  });

  it('fmtInt rounds to integer, no suffix', () => {
    expect(fmtInt(6650.4)).toBe('6650');
    expect(fmtInt(0)).toBe('0');
  });

  it('fmtDimFrac shows fractional hint for 1/8" increments', () => {
    expect(fmtDimFrac(1.75)).toBe('1.750 in (1-3/4)');
    expect(fmtDimFrac(1.625)).toBe('1.625 in (1-5/8)');
    expect(fmtDimFrac(0.5)).toBe('0.500 in (1/2)');
    expect(fmtDimFrac(2.0)).toBe('2.000 in');
  });

  it('fmtDimFrac returns dash for undefined', () => {
    expect(fmtDimFrac(undefined)).toBe(DASH);
  });
});
