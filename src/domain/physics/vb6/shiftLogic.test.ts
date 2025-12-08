import { describe, it, expect } from 'vitest';
import { shouldShift, updateShiftState, ShiftState, vb6ShiftDwell_s } from './shift';

describe('VB6 Shift Logic', () => {
  describe('shouldShift', () => {
    it('returns false when in highest gear', () => {
      const result = shouldShift(4, 5, 7000, [6500, 6500, 6500, 6500, 6500]);
      expect(result).toBe(false);
    });

    it('returns false when no shift RPM defined', () => {
      const result = shouldShift(0, 5, 7000, [0, 6500, 6500, 6500, 6500]);
      expect(result).toBe(false);
    });

    it('returns true when RPM is at shift point', () => {
      const result = shouldShift(0, 5, 6500, [6500, 6500, 6500, 6500, 6500]);
      expect(result).toBe(true);
    });

    it('returns true when RPM is within tolerance of shift point', () => {
      // Default tolerance is 10 RPM when first gear shift RPM <= 8000
      const result = shouldShift(0, 5, 6495, [6500, 6500, 6500, 6500, 6500]);
      expect(result).toBe(true);
    });

    it('uses higher tolerance for high-RPM engines', () => {
      // Tolerance is 20 RPM when first gear shift RPM > 8000
      const result = shouldShift(0, 5, 8485, [8500, 8500, 8500, 8500, 8500]);
      expect(result).toBe(true);
    });

    it('returns false when RPM is below shift point', () => {
      const result = shouldShift(0, 5, 6000, [6500, 6500, 6500, 6500, 6500]);
      expect(result).toBe(false);
    });
  });

  describe('updateShiftState', () => {
    it('transitions from NORMAL to TRIGGERED when shift conditions met', () => {
      const { newState, executeShift } = updateShiftState(ShiftState.NORMAL, true);
      expect(newState).toBe(ShiftState.TRIGGERED);
      expect(executeShift).toBe(false);
    });

    it('stays in NORMAL when shift conditions not met', () => {
      const { newState, executeShift } = updateShiftState(ShiftState.NORMAL, false);
      expect(newState).toBe(ShiftState.NORMAL);
      expect(executeShift).toBe(false);
    });

    it('transitions from TRIGGERED to EXECUTING and executes shift', () => {
      const { newState, executeShift } = updateShiftState(ShiftState.TRIGGERED, false);
      expect(newState).toBe(ShiftState.EXECUTING);
      expect(executeShift).toBe(true);
    });

    it('transitions from EXECUTING to NORMAL', () => {
      const { newState, executeShift } = updateShiftState(ShiftState.EXECUTING, false);
      expect(newState).toBe(ShiftState.NORMAL);
      expect(executeShift).toBe(false);
    });
  });

  describe('vb6ShiftDwell_s', () => {
    it('returns 0.2 seconds for clutch transmission', () => {
      expect(vb6ShiftDwell_s(true)).toBe(0.2);
    });

    it('returns 0.25 seconds for converter transmission', () => {
      expect(vb6ShiftDwell_s(false)).toBe(0.25);
    });
  });
});
