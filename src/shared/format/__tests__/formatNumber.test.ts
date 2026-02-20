import { describe, it, expect } from 'vitest';
import {
  formatFixed,
  formatHp,
  formatLb,
  formatIn,
  formatRpm,
  formatRatio,
  formatET,
  formatMph,
} from '../formatNumber';

describe('formatFixed', () => {
  it('formats to specified decimals', () => {
    expect(formatFixed(123.456789, 2)).toBe('123.46');
    expect(formatFixed(123.456789, 0)).toBe('123');
    expect(formatFixed(0, 3)).toBe('0.000');
  });

  it('returns "—" for non-finite values', () => {
    expect(formatFixed(NaN, 2)).toBe('—');
    expect(formatFixed(Infinity, 2)).toBe('—');
    expect(formatFixed(null, 2)).toBe('—');
    expect(formatFixed(undefined, 2)).toBe('—');
  });
});

describe('formatHp', () => {
  it('formats whole HP without decimals', () => {
    expect(formatHp(500)).toBe('500');
  });

  it('formats fractional HP to 1 decimal', () => {
    expect(formatHp(461.3456)).toBe('461.3');
  });

  it('handles edge cases', () => {
    expect(formatHp(null)).toBe('—');
    expect(formatHp(undefined)).toBe('—');
    expect(formatHp(NaN)).toBe('—');
  });
});

describe('formatLb', () => {
  it('formats weight as whole number', () => {
    expect(formatLb(2350)).toBe('2350');
    expect(formatLb(2350.7)).toBe('2351');
  });
});

describe('formatIn', () => {
  it('formats inches to 1 decimal', () => {
    expect(formatIn(32.8123456789012345)).toBe('32.8');
    expect(formatIn(28)).toBe('28.0');
  });

  it('does not show 15 decimals', () => {
    // This is the actual bug: raw floats like 32.812345678901234
    expect(formatIn(32.812345678901234)).toBe('32.8');
    expect(formatIn(26.300000000000001)).toBe('26.3');
  });
});

describe('formatRpm', () => {
  it('formats RPM as whole number', () => {
    expect(formatRpm(6500)).toBe('6500');
    expect(formatRpm(6543.7)).toBe('6544');
  });
});

describe('formatRatio', () => {
  it('formats ratio to 2 decimals', () => {
    expect(formatRatio(3.55)).toBe('3.55');
    expect(formatRatio(4.1)).toBe('4.10');
  });
});

describe('formatET', () => {
  it('formats ET to 2 decimals by default', () => {
    expect(formatET(9.8567)).toBe('9.86');
  });

  it('accepts custom decimals', () => {
    expect(formatET(9.8567, 3)).toBe('9.857');
  });
});

describe('formatMph', () => {
  it('formats MPH to 1 decimal by default', () => {
    expect(formatMph(138.456)).toBe('138.5');
  });

  it('accepts custom decimals', () => {
    expect(formatMph(138.456, 2)).toBe('138.46');
  });
});
