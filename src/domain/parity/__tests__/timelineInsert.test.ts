/**
 * Tests for the timeline insert logic for driver combo assignments.
 * Mirrors the PHP parity_timelineInsertCombo() function exactly.
 *
 * Semantics: start-inclusive, end-exclusive.
 *   effectiveFrom = inclusive start
 *   effectiveTo   = exclusive end (null = open/unbounded)
 */
import { describe, it, expect } from 'vitest';
import { timelineInsertCombo, type ComboAssignment } from '../timelineInsert';

const DRIVER = 'SMITH, JOHN';
const CLASS = 'TF';
const COMBO_A = 10;
const COMBO_B = 20;
const COMBO_C = 30;

function makeAssignment(
  id: number,
  comboId: number,
  from: string,
  to: string | null = null,
): ComboAssignment {
  return {
    id,
    driverName: DRIVER,
    classIndex: CLASS,
    engineComboId: comboId,
    effectiveFrom: from,
    effectiveTo: to,
  };
}

/** Helper: get assignments for our test driver sorted by effectiveFrom */
function sorted(assignments: ComboAssignment[]): ComboAssignment[] {
  return assignments
    .filter(a => a.driverName === DRIVER && a.classIndex === CLASS)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

describe('timelineInsertCombo', () => {
  // ─── Case 1: No existing assignments → create normally (open-ended) ───
  it('creates a new open-ended assignment when none exist', () => {
    const assignments: ComboAssignment[] = [];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_A, '2025-03-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 0, replaced: 0, skipped: 0 });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].engineComboId).toBe(COMBO_A);
    expect(assignments[0].effectiveFrom).toBe('2025-03-01T00:00:00Z');
    expect(assignments[0].effectiveTo).toBeNull();
  });

  // ─── Case 2: Existing open assignment → close it, insert new open-ended ───
  it('closes an existing open assignment and inserts a new one', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', null),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-06-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 1, replaced: 0, skipped: 0 });
    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(2);
    // First assignment is now closed at the new effective date
    expect(timeline[0].engineComboId).toBe(COMBO_A);
    expect(timeline[0].effectiveFrom).toBe('2025-01-01T00:00:00Z');
    expect(timeline[0].effectiveTo).toBe('2025-06-01T00:00:00Z');
    // New assignment is open-ended
    expect(timeline[1].engineComboId).toBe(COMBO_B);
    expect(timeline[1].effectiveFrom).toBe('2025-06-01T00:00:00Z');
    expect(timeline[1].effectiveTo).toBeNull();
  });

  // ─── Case 3: Exact match, different combo → replace ───
  it('replaces an assignment starting at the exact same effective date', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-03-01T00:00:00Z', '2025-09-01T00:00:00Z'),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-03-01T00:00:00Z');

    expect(result).toEqual({ created: 0, closed: 0, replaced: 1, skipped: 0 });
    expect(assignments).toHaveLength(1);
    // Combo updated, effectiveTo preserved
    expect(assignments[0].engineComboId).toBe(COMBO_B);
    expect(assignments[0].effectiveTo).toBe('2025-09-01T00:00:00Z');
  });

  // ─── Case 4: Exact match, same combo → skip ───
  it('skips when the exact same combo is already assigned at the effective date', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-03-01T00:00:00Z', null),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_A, '2025-03-01T00:00:00Z');

    expect(result).toEqual({ created: 0, closed: 0, replaced: 0, skipped: 1 });
    expect(assignments).toHaveLength(1);
  });

  // ─── Case 5: Active assignment with same combo → skip ───
  it('skips when the active assignment already has the same combo', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', null),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_A, '2025-06-01T00:00:00Z');

    expect(result).toEqual({ created: 0, closed: 0, replaced: 0, skipped: 1 });
    expect(assignments).toHaveLength(1);
    // Assignment unchanged
    expect(assignments[0].effectiveTo).toBeNull();
  });

  // ─── Case 6: Insert between two existing assignments → bounded by next ───
  it('inserts between two assignments, bounded by the next one', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', '2025-06-01T00:00:00Z'),
      makeAssignment(2, COMBO_C, '2025-06-01T00:00:00Z', null),
    ];
    // Insert at March 1, between the two assignments
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-03-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 1, replaced: 0, skipped: 0 });
    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(3);
    // First: closed at March 1
    expect(timeline[0].engineComboId).toBe(COMBO_A);
    expect(timeline[0].effectiveFrom).toBe('2025-01-01T00:00:00Z');
    expect(timeline[0].effectiveTo).toBe('2025-03-01T00:00:00Z');
    // New: bounded by next assignment (June 1)
    expect(timeline[1].engineComboId).toBe(COMBO_B);
    expect(timeline[1].effectiveFrom).toBe('2025-03-01T00:00:00Z');
    expect(timeline[1].effectiveTo).toBe('2025-06-01T00:00:00Z');
    // Third: unchanged
    expect(timeline[2].engineComboId).toBe(COMBO_C);
    expect(timeline[2].effectiveFrom).toBe('2025-06-01T00:00:00Z');
    expect(timeline[2].effectiveTo).toBeNull();
  });

  // ─── Case 7: Insert before all existing → bounded by first existing ───
  it('inserts before all existing assignments, bounded by the first', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-06-01T00:00:00Z', null),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-01-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 0, replaced: 0, skipped: 0 });
    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(2);
    // New assignment bounded by existing
    expect(timeline[0].engineComboId).toBe(COMBO_B);
    expect(timeline[0].effectiveFrom).toBe('2025-01-01T00:00:00Z');
    expect(timeline[0].effectiveTo).toBe('2025-06-01T00:00:00Z');
    // Existing unchanged
    expect(timeline[1].engineComboId).toBe(COMBO_A);
    expect(timeline[1].effectiveFrom).toBe('2025-06-01T00:00:00Z');
    expect(timeline[1].effectiveTo).toBeNull();
  });

  // ─── Case 8: Insert after all existing → open-ended ───
  it('appends after all existing assignments as open-ended', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', '2025-06-01T00:00:00Z'),
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-09-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 0, replaced: 0, skipped: 0 });
    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(2);
    // Existing unchanged (already closed)
    expect(timeline[0].effectiveTo).toBe('2025-06-01T00:00:00Z');
    // New open-ended
    expect(timeline[1].engineComboId).toBe(COMBO_B);
    expect(timeline[1].effectiveFrom).toBe('2025-09-01T00:00:00Z');
    expect(timeline[1].effectiveTo).toBeNull();
  });

  // ─── Case 9: Multiple assignments, insert in the middle of an open one ───
  it('handles complex timeline with 3 existing assignments', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', '2025-04-01T00:00:00Z'),
      makeAssignment(2, COMBO_B, '2025-04-01T00:00:00Z', '2025-08-01T00:00:00Z'),
      makeAssignment(3, COMBO_C, '2025-08-01T00:00:00Z', null),
    ];
    // Insert at May 1 (during assignment 2)
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_A, '2025-05-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 1, replaced: 0, skipped: 0 });
    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(4);
    // Assignment 1: unchanged
    expect(timeline[0].effectiveTo).toBe('2025-04-01T00:00:00Z');
    // Assignment 2: closed at May 1
    expect(timeline[1].engineComboId).toBe(COMBO_B);
    expect(timeline[1].effectiveTo).toBe('2025-05-01T00:00:00Z');
    // New: bounded by assignment 3 (Aug 1)
    expect(timeline[2].engineComboId).toBe(COMBO_A);
    expect(timeline[2].effectiveFrom).toBe('2025-05-01T00:00:00Z');
    expect(timeline[2].effectiveTo).toBe('2025-08-01T00:00:00Z');
    // Assignment 3: unchanged
    expect(timeline[3].effectiveTo).toBeNull();
  });

  // ─── Case 10: Different driver/class doesn't interfere ───
  it('does not affect assignments for a different driver', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', null),
      { id: 2, driverName: 'OTHER, DRIVER', classIndex: CLASS, engineComboId: COMBO_B, effectiveFrom: '2025-01-01T00:00:00Z', effectiveTo: null },
    ];
    const result = timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-06-01T00:00:00Z');

    expect(result).toEqual({ created: 1, closed: 1, replaced: 0, skipped: 0 });
    // Other driver's assignment unchanged
    const other = assignments.find(a => a.driverName === 'OTHER, DRIVER');
    expect(other?.effectiveTo).toBeNull();
    expect(other?.engineComboId).toBe(COMBO_B);
  });

  // ─── Case 11: No-gap guarantee — timeline is contiguous ───
  it('produces a contiguous timeline with no gaps', () => {
    const assignments: ComboAssignment[] = [
      makeAssignment(1, COMBO_A, '2025-01-01T00:00:00Z', null),
    ];

    // Insert B at June
    timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_B, '2025-06-01T00:00:00Z');
    // Insert C at March (in between)
    timelineInsertCombo(assignments, DRIVER, CLASS, COMBO_C, '2025-03-01T00:00:00Z');

    const timeline = sorted(assignments);
    expect(timeline).toHaveLength(3);

    // Verify contiguous: each assignment's effectiveTo === next assignment's effectiveFrom
    for (let i = 0; i < timeline.length - 1; i++) {
      expect(timeline[i].effectiveTo).toBe(timeline[i + 1].effectiveFrom);
    }
    // Last is open-ended
    expect(timeline[timeline.length - 1].effectiveTo).toBeNull();
  });
});
