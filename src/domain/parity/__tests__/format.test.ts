import { describe, it, expect } from 'vitest';
import {
  formatET, formatMPH, formatBaro, formatHPC,
  formatTemp, formatRH, formatDA, formatRT,
  formatMetric, formatDelta, isMphMetric, isIncrementalMph,
} from '../format';

describe('parity format helpers', () => {
  describe('formatET', () => {
    it('formats to 3 decimals', () => expect(formatET(5.7863)).toBe('5.786'));
    it('pads short values', () => expect(formatET(5.7)).toBe('5.700'));
    it('returns dash for null', () => expect(formatET(null)).toBe('—'));
    it('returns dash for undefined', () => expect(formatET(undefined)).toBe('—'));
  });

  describe('formatMPH', () => {
    it('formats to 2 decimals', () => expect(formatMPH(252.516)).toBe('252.52'));
    it('pads short values', () => expect(formatMPH(250)).toBe('250.00'));
    it('returns dash for null', () => expect(formatMPH(null)).toBe('—'));
  });

  describe('formatBaro', () => {
    it('formats to 2 decimals', () => expect(formatBaro(29.923)).toBe('29.92'));
    it('returns dash for null', () => expect(formatBaro(null)).toBe('—'));
  });

  describe('formatHPC', () => {
    it('formats to 3 decimals', () => expect(formatHPC(1.0794)).toBe('1.079'));
    it('pads short values', () => expect(formatHPC(1)).toBe('1.000'));
    it('returns dash for null', () => expect(formatHPC(null)).toBe('—'));
  });

  describe('formatTemp', () => {
    it('formats to 1 decimal', () => expect(formatTemp(75.64)).toBe('75.6'));
    it('returns dash for null', () => expect(formatTemp(null)).toBe('—'));
  });

  describe('formatRH', () => {
    it('formats to 1 decimal', () => expect(formatRH(42.75)).toBe('42.8'));
    it('returns dash for null', () => expect(formatRH(null)).toBe('—'));
  });

  describe('formatDA', () => {
    it('formats as integer', () => expect(formatDA(3720.4)).toBe('3720'));
    it('rounds half up', () => expect(formatDA(3720.5)).toBe('3721'));
    it('returns dash for null', () => expect(formatDA(null)).toBe('—'));
  });

  describe('formatRT', () => {
    it('formats to 3 decimals', () => expect(formatRT(0.0567)).toBe('0.057'));
    it('returns dash for null', () => expect(formatRT(null)).toBe('—'));
  });

  describe('formatMetric', () => {
    it('uses 3 decimals for ET metric', () => expect(formatMetric(5.786, 'et_1320')).toBe('5.786'));
    it('uses 2 decimals for MPH metric', () => expect(formatMetric(252.52, 'mph_1320')).toBe('252.52'));
    it('uses 3 decimals for t60 metric', () => expect(formatMetric(0.928, 't60')).toBe('0.928'));
    it('returns dash for null', () => expect(formatMetric(null, 'et_1320')).toBe('—'));
  });

  describe('formatDelta', () => {
    it('adds + sign for positive ET delta', () => expect(formatDelta(0.015, 'et_1320')).toBe('+0.015'));
    it('no + for negative ET delta', () => expect(formatDelta(-0.035, 'et_1320')).toBe('-0.035'));
    it('adds + sign for positive MPH delta', () => expect(formatDelta(0.67, 'mph_1320')).toBe('+0.67'));
    it('zero ET delta', () => expect(formatDelta(0, 'et_1320')).toBe('0.000'));
    it('returns dash for null', () => expect(formatDelta(null, 'et_1320')).toBe('—'));
  });

  describe('isMphMetric', () => {
    it('detects mph_1320', () => expect(isMphMetric('mph_1320')).toBe(true));
    it('detects mph_660', () => expect(isMphMetric('mph_660')).toBe(true));
    it('rejects et_1320', () => expect(isMphMetric('et_1320')).toBe(false));
    it('rejects t60', () => expect(isMphMetric('t60')).toBe(false));
  });

  describe('isIncrementalMph', () => {
    it('detects 660 MPH', () => expect(isIncrementalMph('660 MPH')).toBe(true));
    it('detects 1320 mph', () => expect(isIncrementalMph('1320 mph')).toBe(true));
    it('rejects 60 ft', () => expect(isIncrementalMph('60 ft')).toBe(false));
    it('rejects 1320 ft', () => expect(isIncrementalMph('1320 ft')).toBe(false));
  });
});
