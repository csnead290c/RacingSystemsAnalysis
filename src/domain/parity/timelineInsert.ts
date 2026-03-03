/**
 * Timeline Insert logic for driver combo assignments.
 *
 * This is a pure TypeScript implementation that mirrors the PHP
 * parity_timelineInsertCombo() function exactly. It can be used for:
 * - Unit testing the timeline algorithm
 * - Client-side preview of timeline changes
 * - Documentation of the expected behavior
 *
 * Semantics: start-inclusive, end-exclusive.
 *   effective_from = inclusive start
 *   effective_to   = exclusive end (null = open/unbounded)
 *
 * Given (driverName, classIndex, engineComboId, effectiveFrom):
 * 1) If an assignment starts exactly at effectiveFrom → replace it (update combo).
 * 2) If an assignment is active at effectiveFrom (started before, ends after or is open)
 *    → close it at effectiveFrom.
 * 3) Find the next assignment that starts after effectiveFrom → new assignment ends there.
 *    If none, new assignment is open-ended (null).
 * 4) Insert the new assignment with [effectiveFrom, nextStart) or [effectiveFrom, null).
 */

export interface ComboAssignment {
  id: number;
  driverName: string;
  classIndex: string;
  engineComboId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface TimelineInsertResult {
  created: number;
  closed: number;
  replaced: number;
  skipped: number;
}

/**
 * Simulate a timeline insert on an in-memory array of assignments.
 * Mutates the assignments array in place (matching the DB behavior).
 * Returns the same result shape as the PHP function.
 */
export function timelineInsertCombo(
  assignments: ComboAssignment[],
  driverName: string,
  classIndex: string,
  engineComboId: number,
  effectiveFrom: string,
): TimelineInsertResult {
  const result: TimelineInsertResult = { created: 0, closed: 0, replaced: 0, skipped: 0 };

  // Filter to this driver+class
  const mine = assignments.filter(
    a => a.driverName === driverName && a.classIndex === classIndex,
  );

  // 1) Exact match: assignment starting exactly at effectiveFrom
  const exact = mine.find(a => a.effectiveFrom === effectiveFrom);
  if (exact) {
    if (exact.engineComboId === engineComboId) {
      result.skipped = 1;
      return result;
    }
    // Replace: update the combo (preserves effectiveTo)
    exact.engineComboId = engineComboId;
    result.replaced = 1;
    return result;
  }

  // 2) Find the assignment active at effectiveFrom
  const active = mine
    .filter(
      a =>
        a.effectiveFrom < effectiveFrom &&
        (a.effectiveTo === null || a.effectiveTo > effectiveFrom),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;

  if (active && active.engineComboId === engineComboId) {
    result.skipped = 1;
    return result;
  }

  // Close active assignment at effectiveFrom
  if (active) {
    active.effectiveTo = effectiveFrom;
    result.closed = 1;
  }

  // 3) Find next assignment after effectiveFrom
  const nextAssignment = mine
    .filter(a => a.effectiveFrom > effectiveFrom)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0] ?? null;
  const newEnd = nextAssignment ? nextAssignment.effectiveFrom : null;

  // 4) Insert new assignment
  const newId = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
  assignments.push({
    id: newId,
    driverName,
    classIndex,
    engineComboId,
    effectiveFrom,
    effectiveTo: newEnd,
  });
  result.created = 1;

  return result;
}
