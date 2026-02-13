/**
 * Unit tests for Cross-section Area Calculator Worksheet
 *
 * VB6 source: CSCalc.frm CalcCir/CalcEll/CalcRec/CalcAnn (lines 523-562)
 * VB6 constants: PI=3.141593
 * VB6 formatting: DecimalPlaces_In=3 for all fields (inputs and output)
 */
import { describe, it, expect } from 'vitest';
import {
  calcCircularArea,
  calcEllipticalArea,
  calcRectangularArea,
  calcAnnularArea,
  calcAllCSA,
  parseCSAInput,
  formatDimension,
  formatArea,
  CSA_DEFAULTS,
} from '../worksheets/csaWorksheet';

const PI = 3.141593;

describe('csaWorksheet', () => {
  // =========================================================================
  // Circular area: PI * (dia² - stem²) / 4
  // =========================================================================
  describe('calcCircularArea', () => {
    it('returns 0 when diameter is 0', () => {
      expect(calcCircularArea({ diameter: 0, stemDiameter: 0 })).toBe(0);
    });

    it('computes area for a normal diameter with no stem', () => {
      // PI * 2² / 4 = PI = 3.141593 → rounded to 3 decimals = 3.142
      const result = calcCircularArea({ diameter: 2, stemDiameter: 0 });
      expect(result).toBeCloseTo(3.142, 3);
    });

    it('subtracts stem area from port area', () => {
      // PI * (2² - 0.5²) / 4 = PI * (4 - 0.25) / 4 = PI * 3.75 / 4
      // = 3.141593 * 3.75 / 4 = 2.94524... → 2.945
      const result = calcCircularArea({ diameter: 2, stemDiameter: 0.5 });
      expect(result).toBeCloseTo(2.945, 3);
    });

    it('clamps to 0 when stem is larger than diameter', () => {
      // PI * (1² - 2²) / 4 = PI * (1 - 4) / 4 = negative → 0
      expect(calcCircularArea({ diameter: 1, stemDiameter: 2 })).toBe(0);
    });

    it('handles decimal diameter values', () => {
      // PI * 1.5² / 4 = PI * 2.25 / 4 = 3.141593 * 2.25 / 4 = 1.76714...
      const result = calcCircularArea({ diameter: 1.5, stemDiameter: 0 });
      expect(result).toBeCloseTo(1.767, 3);
    });
  });

  // =========================================================================
  // Elliptical area: PI * (majorDia * minorDia - stem²) / 4
  // =========================================================================
  describe('calcEllipticalArea', () => {
    it('returns 0 when all inputs are 0', () => {
      expect(calcEllipticalArea({ majorDiameter: 0, minorDiameter: 0, stemDiameter: 0 })).toBe(0);
    });

    it('equals circular area when major = minor (symmetric case)', () => {
      const circular = calcCircularArea({ diameter: 2, stemDiameter: 0 });
      const elliptical = calcEllipticalArea({ majorDiameter: 2, minorDiameter: 2, stemDiameter: 0 });
      expect(elliptical).toBe(circular);
    });

    it('computes area for normal major/minor diameters', () => {
      // PI * (2.0 * 1.5 - 0) / 4 = PI * 3.0 / 4 = 2.35619...
      const result = calcEllipticalArea({ majorDiameter: 2.0, minorDiameter: 1.5, stemDiameter: 0 });
      expect(result).toBeCloseTo(2.356, 3);
    });

    it('subtracts stem area', () => {
      // PI * (2.0 * 1.5 - 0.3²) / 4 = PI * (3.0 - 0.09) / 4 = PI * 2.91 / 4
      const result = calcEllipticalArea({ majorDiameter: 2.0, minorDiameter: 1.5, stemDiameter: 0.3 });
      expect(result).toBeCloseTo(PI * 2.91 / 4, 3);
    });

    it('clamps to 0 when stem dominates', () => {
      expect(calcEllipticalArea({ majorDiameter: 0.5, minorDiameter: 0.5, stemDiameter: 2 })).toBe(0);
    });
  });

  // =========================================================================
  // Rectangular area: H*W - PI*stem²/4 - cornerDia²*(1 - PI/4)
  // =========================================================================
  describe('calcRectangularArea', () => {
    it('returns 0 when all inputs are 0', () => {
      expect(calcRectangularArea({ height: 0, width: 0, cornerDiameter: 0, stemDiameter: 0 })).toBe(0);
    });

    it('computes simple H*W with no stem or corner', () => {
      // 2 * 3 = 6.000
      const result = calcRectangularArea({ height: 2, width: 3, cornerDiameter: 0, stemDiameter: 0 });
      expect(result).toBe(6);
    });

    it('subtracts stem area', () => {
      // 2*3 - PI*0.5²/4 - 0 = 6 - PI*0.25/4 = 6 - 0.19635... = 5.80365...
      const result = calcRectangularArea({ height: 2, width: 3, cornerDiameter: 0, stemDiameter: 0.5 });
      expect(result).toBeCloseTo(5.804, 3);
    });

    it('subtracts corner diameter correction', () => {
      // 2*3 - 0 - 0.5²*(1 - PI/4) = 6 - 0.25*(1 - 0.785398...) = 6 - 0.25*0.214602 = 6 - 0.05365...
      const result = calcRectangularArea({ height: 2, width: 3, cornerDiameter: 0.5, stemDiameter: 0 });
      expect(result).toBeCloseTo(5.946, 3);
    });

    it('clamps to 0 when stem is too large', () => {
      // 1*1 - PI*5²/4 = 1 - 19.63... = negative → 0
      expect(calcRectangularArea({ height: 1, width: 1, cornerDiameter: 0, stemDiameter: 5 })).toBe(0);
    });
  });

  // =========================================================================
  // Annular area: PI * (outer² - inner² - stem²) / 4
  // =========================================================================
  describe('calcAnnularArea', () => {
    it('returns 0 when all inputs are 0', () => {
      expect(calcAnnularArea({ outerDiameter: 0, innerDiameter: 0, stemDiameter: 0 })).toBe(0);
    });

    it('computes area for normal outer/inner with no stem', () => {
      // PI * (2² - 1²) / 4 = PI * 3 / 4 = 2.35619...
      const result = calcAnnularArea({ outerDiameter: 2, innerDiameter: 1, stemDiameter: 0 });
      expect(result).toBeCloseTo(2.356, 3);
    });

    it('subtracts stem area', () => {
      // PI * (2² - 1² - 0.3²) / 4 = PI * (4 - 1 - 0.09) / 4 = PI * 2.91 / 4
      const result = calcAnnularArea({ outerDiameter: 2, innerDiameter: 1, stemDiameter: 0.3 });
      expect(result).toBeCloseTo(PI * 2.91 / 4, 3);
    });

    it('clamps to 0 when inner equals outer', () => {
      // PI * (2² - 2²) / 4 = 0
      expect(calcAnnularArea({ outerDiameter: 2, innerDiameter: 2, stemDiameter: 0 })).toBe(0);
    });

    it('clamps to 0 when inner > outer', () => {
      // PI * (1² - 2²) / 4 = PI * (1 - 4) / 4 = negative → 0
      expect(calcAnnularArea({ outerDiameter: 1, innerDiameter: 2, stemDiameter: 0 })).toBe(0);
    });
  });

  // =========================================================================
  // calcAllCSA — batch computation
  // =========================================================================
  describe('calcAllCSA', () => {
    it('returns all zeros for default state', () => {
      const results = calcAllCSA(CSA_DEFAULTS);
      expect(results.circularArea).toBe(0);
      expect(results.ellipticalArea).toBe(0);
      expect(results.rectangularArea).toBe(0);
      expect(results.annularArea).toBe(0);
    });
  });

  // =========================================================================
  // Parsing
  // =========================================================================
  describe('parseCSAInput', () => {
    it('blank → 0', () => {
      expect(parseCSAInput('')).toBe(0);
    });

    it('whitespace → 0', () => {
      expect(parseCSAInput('   ')).toBe(0);
    });

    it('non-numeric → 0', () => {
      expect(parseCSAInput('abc')).toBe(0);
    });

    it('"1.500" → 1.5', () => {
      expect(parseCSAInput('1.500')).toBe(1.5);
    });

    it('" 2.0 " → 2', () => {
      expect(parseCSAInput(' 2.0 ')).toBe(2);
    });
  });

  // =========================================================================
  // Formatting
  // =========================================================================
  describe('formatting', () => {
    it('formatDimension shows 3 decimal places', () => {
      expect(formatDimension(1.5)).toBe('1.500');
      expect(formatDimension(0)).toBe('0.000');
    });

    it('formatArea shows 3 decimal places', () => {
      expect(formatArea(3.14159)).toBe('3.142');
      expect(formatArea(0)).toBe('0.000');
    });
  });

  // =========================================================================
  // VB6 numeric parity checks
  // =========================================================================
  describe('VB6 numeric parity', () => {
    it('circular: dia=2.050, stem=0.371 matches VB6 CalcCir', () => {
      // PI * (2.050² - 0.371²) / 4 = PI * (4.2025 - 0.137641) / 4
      // = PI * 4.064859 / 4 = 3.141593 * 4.064859 / 4 = 3.192...
      const result = calcCircularArea({ diameter: 2.050, stemDiameter: 0.371 });
      const expected = Number((PI * (2.050 ** 2 - 0.371 ** 2) / 4).toFixed(3));
      expect(result).toBe(expected);
    });

    it('elliptical: major=2.1, minor=1.6, stem=0.371 matches VB6 CalcEll', () => {
      const result = calcEllipticalArea({ majorDiameter: 2.1, minorDiameter: 1.6, stemDiameter: 0.371 });
      const expected = Number((PI * (2.1 * 1.6 - 0.371 ** 2) / 4).toFixed(3));
      expect(result).toBe(expected);
    });

    it('rectangular: H=1.8, W=1.4, corner=0.5, stem=0.371 matches VB6 CalcRec', () => {
      const result = calcRectangularArea({ height: 1.8, width: 1.4, cornerDiameter: 0.5, stemDiameter: 0.371 });
      let expected = (1.8 * 1.4) - (PI * 0.371 ** 2) / 4;
      expected = expected - 0.5 ** 2 * (1 - PI / 4);
      expected = Number(expected.toFixed(3));
      expect(result).toBe(expected);
    });

    it('annular: outer=2.1, inner=1.8, stem=0.371 matches VB6 CalcAnn', () => {
      const result = calcAnnularArea({ outerDiameter: 2.1, innerDiameter: 1.8, stemDiameter: 0.371 });
      const expected = Number((PI * (2.1 ** 2 - 1.8 ** 2 - 0.371 ** 2) / 4).toFixed(3));
      expect(result).toBe(expected);
    });
  });
});
