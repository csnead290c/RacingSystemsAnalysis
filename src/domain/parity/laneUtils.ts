/**
 * Lane normalization and ordering utilities for NHRA pair (L/R) and quad (1-4) formats.
 */

/** Canonical lane values */
export type CanonicalLane = 'L' | 'R' | '1' | '2' | '3' | '4';

/**
 * Normalize a raw lane string to canonical form.
 * Accepts: Left/Right/L/R (pair) and 1/2/3/4/Lane 1/etc (quad).
 * Returns canonical string or the original trimmed value if unrecognized.
 */
export function canonicalLane(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = raw.trim().toLowerCase().replace(/^lane\s*/i, '');
  if (s === 'l' || s === 'left') return 'L';
  if (s === 'r' || s === 'right') return 'R';
  if (s === '1') return '1';
  if (s === '2') return '2';
  if (s === '3') return '3';
  if (s === '4') return '4';
  return raw.trim();
}

/** Sort order for lanes within a group: L before R, 1<2<3<4 */
const LANE_ORDER: Record<string, number> = { L: 0, R: 1, '1': 0, '2': 1, '3': 2, '4': 3 };

export function laneSort(a: string, b: string): number {
  return (LANE_ORDER[a] ?? 99) - (LANE_ORDER[b] ?? 99);
}

/** Detect whether an array of lane values represents quad (lanes 1-4) or pair (L/R) */
export function isQuadEvent(lanes: string[]): boolean {
  return lanes.some(l => l === '1' || l === '2' || l === '3' || l === '4');
}
