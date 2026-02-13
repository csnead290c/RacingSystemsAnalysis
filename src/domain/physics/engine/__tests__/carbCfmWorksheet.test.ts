/**
 * Unit tests for Throttle CFM @ 1.5" Hg Worksheet
 *
 * VB6 source: ENGPERF.BAS CalcCarb() lines 1077-1138
 * VB6 defaults: SetAllValues lines 2255-2261
 * VB6 constants: PI=3.141593, ZM=25.4
 */
import { describe, it, expect } from 'vitest';
import {
  calcCarbCfm,
  clampNumBoresPrimary,
  clampNumBoresSecondary,
  clampThrottleDia,
  clampVenturiDia,
  venturiDiaLimits,
  parseNumericInput,
  formatCfm,
  formatDia,
  CARB_WS_DEFAULTS,
  type CarbWorksheetInputs,
} from '../worksheets/carbCfmWorksheet';

const PI = 3.141593;

describe('carbCfmWorksheet', () => {
  // =========================================================================
  // 1. Default / baseline — VB6 BASECASE defaults
  // =========================================================================
  describe('defaults (VB6 BASECASE: 4 butterfly bores, tbDia=1.688, tvDia=1.375)', () => {
    it('computes a reasonable CFM for default inputs', () => {
      const result = calcCarbCfm(CARB_WS_DEFAULTS);
      // VB6 butterfly: 4 * 51 * 1.375^1.36 * 1.688^1.69
      // Manual: 1.375^1.36 ≈ 1.5427, 1.688^1.69 ≈ 2.5768
      // → 4 * 51 * 1.5427 * 2.5768 ≈ 811.0
      // Venturi limit: 123 * 4 * PI * 1.375^2 / 4 ≈ 730.3
      // Throttle limit: 91 * 4 * PI * 1.688^2 / 4 ≈ 814.0
      // Capped at venturi limit ≈ 730
      expect(result.cfmTotal).toBeGreaterThan(700);
      expect(result.cfmTotal).toBeLessThan(800);
      expect(result.cfmSecondary).toBe(0);
      expect(result.cfmPrimary).toBe(result.cfmTotal);
    });

    it('cfmAt3inHg equals cfmTotal * sqrt(2)', () => {
      const result = calcCarbCfm(CARB_WS_DEFAULTS);
      expect(result.cfmAt3inHg).toBeCloseTo(result.cfmTotal * Math.sqrt(3 / 1.5), 6);
    });
  });

  // =========================================================================
  // 2. Blank / zero inputs → 0
  // =========================================================================
  describe('blank/zero inputs', () => {
    it('returns 0 CFM when all diameters are 0', () => {
      const result = calcCarbCfm({
        numBoresPrimary: 4,
        throttleDiaPrimary: 0,
        venturiDiaPrimary: 0,
        numBoresSecondary: 0,
        throttleDiaSecondary: 0,
        venturiDiaSecondary: 0,
        throttleType: 'butterfly',
      });
      expect(result.cfmTotal).toBe(0);
      expect(result.cfmPrimary).toBe(0);
      expect(result.cfmSecondary).toBe(0);
    });

    it('returns 0 CFM when numBoresPrimary is 0 (clamped to 1 but dia=0)', () => {
      const result = calcCarbCfm({
        numBoresPrimary: 0, // clamped to 1
        throttleDiaPrimary: 0,
        venturiDiaPrimary: 0,
        numBoresSecondary: 0,
        throttleDiaSecondary: 0,
        venturiDiaSecondary: 0,
        throttleType: 'butterfly',
      });
      expect(result.cfmTotal).toBe(0);
    });
  });

  // =========================================================================
  // 3. Primary-only (secondary zeros)
  // =========================================================================
  describe('primary-only, no secondary', () => {
    it('secondary CFM is 0 when numBoresSecondary = 0', () => {
      const result = calcCarbCfm({
        numBoresPrimary: 2,
        throttleDiaPrimary: 2.0,
        venturiDiaPrimary: 1.5,
        numBoresSecondary: 0,
        throttleDiaSecondary: 0,
        venturiDiaSecondary: 0,
        throttleType: 'butterfly',
      });
      expect(result.cfmSecondary).toBe(0);
      expect(result.cfmPrimary).toBeGreaterThan(0);
      expect(result.cfmTotal).toBe(result.cfmPrimary);
    });
  });

  // =========================================================================
  // 4. Primary + secondary
  // =========================================================================
  describe('primary + secondary', () => {
    it('total = primary + secondary', () => {
      const inputs: CarbWorksheetInputs = {
        numBoresPrimary: 4,
        throttleDiaPrimary: 1.688,
        venturiDiaPrimary: 1.375,
        numBoresSecondary: 4,
        throttleDiaSecondary: 1.688,
        venturiDiaSecondary: 1.375,
        throttleType: 'butterfly',
      };
      const result = calcCarbCfm(inputs);
      expect(result.cfmSecondary).toBeGreaterThan(0);
      expect(result.cfmTotal).toBeCloseTo(result.cfmPrimary + result.cfmSecondary, 6);
      // With identical primary/secondary, secondary should equal primary
      expect(result.cfmSecondary).toBeCloseTo(result.cfmPrimary, 6);
    });

    it('secondary with different bore size adds correctly', () => {
      const inputs: CarbWorksheetInputs = {
        numBoresPrimary: 4,
        throttleDiaPrimary: 1.688,
        venturiDiaPrimary: 1.375,
        numBoresSecondary: 2,
        throttleDiaSecondary: 1.5,
        venturiDiaSecondary: 1.2,
        throttleType: 'butterfly',
      };
      const result = calcCarbCfm(inputs);
      expect(result.cfmTotal).toBeCloseTo(result.cfmPrimary + result.cfmSecondary, 6);
      expect(result.cfmSecondary).toBeGreaterThan(0);
      expect(result.cfmSecondary).not.toBeCloseTo(result.cfmPrimary, 0);
    });
  });

  // =========================================================================
  // 5. Throttle type differences (butterfly vs slide)
  // =========================================================================
  describe('butterfly vs slide', () => {
    const baseInputs: CarbWorksheetInputs = {
      numBoresPrimary: 4,
      throttleDiaPrimary: 1.688,
      venturiDiaPrimary: 1.375,
      numBoresSecondary: 0,
      throttleDiaSecondary: 0,
      venturiDiaSecondary: 0,
      throttleType: 'butterfly',
    };

    it('slide valve uses different formula than butterfly', () => {
      const butterfly = calcCarbCfm({ ...baseInputs, throttleType: 'butterfly' });
      const slide = calcCarbCfm({ ...baseInputs, throttleType: 'slide' });
      // Slide: 140 * N * PI * tvDia^2 / 4 vs butterfly empirical formula
      // They should produce different values
      expect(butterfly.cfmTotal).not.toBeCloseTo(slide.cfmTotal, 0);
    });

    it('slide valve formula: 140 * N * PI * tvDia^2 / 4 (capped by 125 throttle limit)', () => {
      // Manual calc for slide: 140 * 4 * PI * 1.375^2 / 4
      const expected = 140 * 4 * PI * 1.375 * 1.375 / 4;
      // Throttle limit: 125 * 4 * PI * 1.688^2 / 4
      const throttleLimit = 125 * 4 * PI * 1.688 * 1.688 / 4;
      const expectedCapped = Math.min(expected, throttleLimit);

      const result = calcCarbCfm({ ...baseInputs, throttleType: 'slide' });
      expect(result.cfmTotal).toBeCloseTo(expectedCapped, 2);
    });
  });

  // =========================================================================
  // 6. Clamping / rounding edge cases
  // =========================================================================
  describe('clamping and rounding', () => {
    it('clampNumBoresPrimary: below 1 → 1, above 12 → 12', () => {
      expect(clampNumBoresPrimary(0)).toBe(1);
      expect(clampNumBoresPrimary(-5)).toBe(1);
      expect(clampNumBoresPrimary(15)).toBe(12);
      expect(clampNumBoresPrimary(4.7)).toBe(5);
    });

    it('clampNumBoresSecondary: below 0 → 0, above 12 → 12', () => {
      expect(clampNumBoresSecondary(-1)).toBe(0);
      expect(clampNumBoresSecondary(0)).toBe(0);
      expect(clampNumBoresSecondary(13)).toBe(12);
    });

    it('clampThrottleDia: below 0 → 0, above 6 → 6, rounds to 3 places', () => {
      expect(clampThrottleDia(-1)).toBe(0);
      expect(clampThrottleDia(7)).toBe(6);
      expect(clampThrottleDia(1.68812)).toBe(1.688);
    });

    it('clampVenturiDia: clamped to [tbDia/2, tbDia]', () => {
      // tbDia = 2.0 → venturi min=1.0, max=2.0
      expect(clampVenturiDia(0.5, 2.0)).toBe(1.0);
      expect(clampVenturiDia(2.5, 2.0)).toBe(2.0);
      expect(clampVenturiDia(1.5, 2.0)).toBe(1.5);
    });

    it('venturiDiaLimits matches VB6 SetTVDia', () => {
      const limits = venturiDiaLimits(1.688);
      expect(limits.min).toBe(0.844);
      expect(limits.max).toBe(1.688);
    });

    it('VB6 rounding: result ≤ 100 rounds to 2 decimal places', () => {
      // Use very small bores to get CFM < 100
      const result = calcCarbCfm({
        numBoresPrimary: 1,
        throttleDiaPrimary: 0.5,
        venturiDiaPrimary: 0.4,
        numBoresSecondary: 0,
        throttleDiaSecondary: 0,
        venturiDiaSecondary: 0,
        throttleType: 'butterfly',
      });
      // Should be rounded to 2 decimal places
      const str = result.cfmTotal.toString();
      const parts = str.split('.');
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    });
  });

  // =========================================================================
  // 7. Known-good VB6 numeric example (BASECASE defaults)
  // =========================================================================
  describe('known VB6 numeric parity', () => {
    it('BASECASE butterfly: 4 bores, tbDia=1.688, tvDia=1.375 → ~730 CFM', () => {
      // VB6 CalcCarb butterfly path:
      // ZCarb = 4 * 51 * 1.375^1.36 * 1.688^1.69
      //   1.375^1.36 = exp(1.36 * ln(1.375)) ≈ 1.5427
      //   1.688^1.69 = exp(1.69 * ln(1.688)) ≈ 2.5768
      //   ZCarb ≈ 4 * 51 * 1.5427 * 2.5768 ≈ 811.0
      // ZCarbV (venturi limit) = 123 * 4 * PI * 1.375^2 / 4
      //   = 123 * 4 * 3.141593 * 1.890625 / 4 ≈ 730.3
      // ZCarbT (throttle limit) = 91 * 4 * PI * 1.688^2 / 4
      //   = 91 * 4 * 3.141593 * 2.849344 / 4 ≈ 814.0
      // ZCarb capped at venturi limit ≈ 730.3
      const result = calcCarbCfm(CARB_WS_DEFAULTS);

      // Exact venturi limit: 123 * 4 * PI * 1.375^2 / 4
      const expectedVenturiLimit = 123 * 4 * PI * 1.375 * 1.375 / 4;
      expect(result.cfmTotal).toBeCloseTo(expectedVenturiLimit, 4);
    });
  });

  // =========================================================================
  // 8. parseNumericInput (VB6 Val() semantics)
  // =========================================================================
  describe('parseNumericInput', () => {
    it('blank → 0', () => expect(parseNumericInput('')).toBe(0));
    it('whitespace → 0', () => expect(parseNumericInput('  ')).toBe(0));
    it('non-numeric → 0', () => expect(parseNumericInput('abc')).toBe(0));
    it('"1.688" → 1.688', () => expect(parseNumericInput('1.688')).toBe(1.688));
    it('" 4 " → 4', () => expect(parseNumericInput(' 4 ')).toBe(4));
  });

  // =========================================================================
  // 9. Formatting
  // =========================================================================
  describe('formatting', () => {
    it('formatCfm rounds to integer', () => {
      expect(formatCfm(730.345)).toBe('730');
      expect(formatCfm(0)).toBe('0');
    });
    it('formatDia shows 3 decimal places', () => {
      expect(formatDia(1.375)).toBe('1.375');
      expect(formatDia(0)).toBe('0.000');
    });
  });
});
