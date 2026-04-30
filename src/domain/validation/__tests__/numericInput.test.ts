/**
 * Tests for VB6 QUARTER Jr numeric input semantics
 * - 5-digit maximum
 * - Excess digits ignored
 * - No scientific notation
 */

import { describe, it, expect } from 'vitest';
import {
  parseVB6NumericInput,
  formatVB6NumericInput,
  isValidVB6NumericInput,
  getIntegerDigitCount,
  exceedsVB6DigitLimit,
} from '../numericInput';

describe('VB6 Numeric Input Semantics', () => {
  describe('parseVB6NumericInput', () => {
    it('should parse valid integers', () => {
      expect(parseVB6NumericInput('123')).toBe(123);
      expect(parseVB6NumericInput('12345')).toBe(12345);
    });

    it('should parse valid decimals', () => {
      expect(parseVB6NumericInput('123.45')).toBe(123.45);
      expect(parseVB6NumericInput('0.5')).toBe(0.5);
    });

    it('should truncate to 5 integer digits (VB6 behavior)', () => {
      expect(parseVB6NumericInput('123456')).toBe(12345);
      expect(parseVB6NumericInput('1234567890')).toBe(12345);
    });

    it('should preserve decimal digits beyond 5 integer digits', () => {
      expect(parseVB6NumericInput('12345.678')).toBe(12345.678);
    });

    it('should reject scientific notation', () => {
      expect(parseVB6NumericInput('1e5')).toBeUndefined();
      expect(parseVB6NumericInput('1.5e3')).toBeUndefined();
      expect(parseVB6NumericInput('1E5')).toBeUndefined();
    });

    it('should reject non-numeric characters', () => {
      expect(parseVB6NumericInput('abc')).toBeUndefined();
      expect(parseVB6NumericInput('12a34')).toBeUndefined();
      expect(parseVB6NumericInput('12 34')).toBeUndefined();
    });

    it('should handle empty input', () => {
      expect(parseVB6NumericInput('')).toBeUndefined();
      expect(parseVB6NumericInput('   ')).toBeUndefined();
    });

    it('should handle negative numbers when allowed', () => {
      expect(parseVB6NumericInput('-123', true)).toBe(-123);
      expect(parseVB6NumericInput('-12345', true)).toBe(-12345);
    });

    it('should reject negative numbers when not allowed', () => {
      expect(parseVB6NumericInput('-123', false)).toBeUndefined();
      expect(parseVB6NumericInput('-123')).toBeUndefined(); // default is false
    });

    it('should truncate negative numbers to 5 digits', () => {
      expect(parseVB6NumericInput('-123456', true)).toBe(-12345);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(parseVB6NumericInput('  123  ')).toBe(123);
      expect(parseVB6NumericInput('  123.45  ')).toBe(123.45);
    });

    it('should handle decimal point only', () => {
      expect(parseVB6NumericInput('.')).toBeUndefined();
      expect(parseVB6NumericInput('.5')).toBe(0.5);
      expect(parseVB6NumericInput('5.')).toBe(5);
    });
  });

  describe('formatVB6NumericInput', () => {
    it('should format numbers within 5 digits normally', () => {
      expect(formatVB6NumericInput(123)).toBe('123');
      expect(formatVB6NumericInput(12345)).toBe('12345');
      expect(formatVB6NumericInput(123.45)).toBe('123.45');
    });

    it('should truncate numbers exceeding 5 integer digits', () => {
      expect(formatVB6NumericInput(123456)).toBe('12345');
      expect(formatVB6NumericInput(1234567)).toBe('12345');
    });

    it('should handle negative numbers', () => {
      expect(formatVB6NumericInput(-123)).toBe('-123');
      expect(formatVB6NumericInput(-123456)).toBe('-12345');
    });

    it('should handle undefined/null/NaN', () => {
      expect(formatVB6NumericInput(undefined)).toBe('');
      expect(formatVB6NumericInput(null)).toBe('');
      expect(formatVB6NumericInput(NaN)).toBe('');
    });
  });

  describe('isValidVB6NumericInput', () => {
    it('should validate correct inputs', () => {
      expect(isValidVB6NumericInput('123')).toBe(true);
      expect(isValidVB6NumericInput('12345')).toBe(true);
      expect(isValidVB6NumericInput('123.45')).toBe(true);
    });

    it('should accept inputs that will be truncated', () => {
      expect(isValidVB6NumericInput('123456')).toBe(true); // will be truncated to 12345
    });

    it('should reject invalid inputs', () => {
      expect(isValidVB6NumericInput('abc')).toBe(false);
      expect(isValidVB6NumericInput('1e5')).toBe(false);
      expect(isValidVB6NumericInput('12a34')).toBe(false);
    });
  });

  describe('getIntegerDigitCount', () => {
    it('should count integer digits correctly', () => {
      expect(getIntegerDigitCount(123)).toBe(3);
      expect(getIntegerDigitCount(12345)).toBe(5);
      expect(getIntegerDigitCount(123.45)).toBe(3);
      expect(getIntegerDigitCount(0.5)).toBe(1); // "0" is one digit
    });

    it('should handle negative numbers', () => {
      expect(getIntegerDigitCount(-123)).toBe(3);
      expect(getIntegerDigitCount(-12345)).toBe(5);
    });

    it('should handle edge cases', () => {
      expect(getIntegerDigitCount(0)).toBe(1);
      expect(getIntegerDigitCount(NaN)).toBe(0);
      expect(getIntegerDigitCount(Infinity)).toBe(0);
    });
  });

  describe('exceedsVB6DigitLimit', () => {
    it('should detect numbers exceeding 5 digits', () => {
      expect(exceedsVB6DigitLimit(123456)).toBe(true);
      expect(exceedsVB6DigitLimit(1234567)).toBe(true);
    });

    it('should accept numbers within 5 digits', () => {
      expect(exceedsVB6DigitLimit(12345)).toBe(false);
      expect(exceedsVB6DigitLimit(123)).toBe(false);
      expect(exceedsVB6DigitLimit(123.456)).toBe(false); // only 3 integer digits
    });
  });

  describe('VB6 Manual Compliance', () => {
    it('should enforce 5-digit maximum per VB6 manual page 4-1', () => {
      // "A maximum of five digits may be input for the numeric variables"
      const result = parseVB6NumericInput('123456789');
      expect(result).toBe(12345);
    });

    it('should ignore excess digits per VB6 manual page 4-1', () => {
      // "If more than five digits are entered, the excess will be ignored"
      const input = '9876543210';
      const result = parseVB6NumericInput(input);
      expect(result).toBe(98765);
    });

    it('should reject non-numeric inputs per VB6 manual page 4-1', () => {
      // "Only numeric inputs are allowed"
      expect(parseVB6NumericInput('12a34')).toBeUndefined();
      expect(parseVB6NumericInput('abc')).toBeUndefined();
    });
  });
});
