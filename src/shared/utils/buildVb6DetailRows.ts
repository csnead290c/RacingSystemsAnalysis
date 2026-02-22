/**
 * Build VB6-style Detailed Parameters rows from simulation traces.
 *
 * VB6 Quarter Pro's "Detailed Parameters" screen shows a reduced dataset:
 *   1. Standard distance checkpoints (60, 330, 660, 1000, 1320 for 1/4 mile)
 *   2. Gear-change events (row where gear increments)
 *   3. Finish row (closest trace row at or past the race length)
 *
 * Each row includes: time, distance, speed, rpm, gear, accel, and optional
 * hp / dragHp / slip fields when present in the trace.
 *
 * This is a *derived view* — no sim logic changes.
 */

export interface Vb6DetailRow {
  /** Row label for display (e.g. "60'" or "1→2" or "Finish") */
  label: string;
  /** Row category for styling */
  kind: 'checkpoint' | 'gear-change' | 'finish';
  t_s: number;
  s_ft: number;
  v_mph: number;
  a_g: number;
  rpm: number;
  gear: number;
  hp?: number;
  dragHp?: number;
  slip?: boolean;
}

export interface TracePoint {
  t_s: number;
  s_ft: number;
  v_mph: number;
  a_g: number;
  rpm: number;
  gear: number;
  hp?: number;
  dragHp?: number;
  slip?: boolean;
}

/**
 * Standard drag-racing distance checkpoints by race length (ft).
 * Matches VB6 Quarter Pro DistToPrint values.
 */
const DRAG_CHECKPOINTS: Record<number, number[]> = {
  660:  [60, 330, 660],
  1000: [60, 330, 660, 1000],
  1320: [60, 330, 660, 1000, 1320],
};

/**
 * Find the trace row closest to a target distance.
 * If the trace overshoots (common in VB6), picks the first row >= target
 * that is within 5 ft, otherwise the absolute closest.
 */
function findClosestByDistance(traces: TracePoint[], targetFt: number): TracePoint | null {
  if (traces.length === 0) return null;

  let bestIdx = 0;
  let bestDiff = Math.abs(traces[0].s_ft - targetFt);

  for (let i = 1; i < traces.length; i++) {
    const diff = Math.abs(traces[i].s_ft - targetFt);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return traces[bestIdx];
}

/**
 * Build VB6-style detail rows from a full simulation trace array.
 *
 * @param traces      Full trace array from the sim (ordered by time/distance)
 * @param raceLengthFt  Race length in feet (660, 1000, 1320, etc.)
 * @returns Reduced array of Vb6DetailRow, sorted by distance ascending.
 */
export function buildVb6DetailRows(
  traces: TracePoint[],
  raceLengthFt: number,
): Vb6DetailRow[] {
  if (!traces || traces.length === 0) return [];

  const rows: Vb6DetailRow[] = [];
  const usedDistances = new Set<number>();

  // 1. Distance checkpoints
  const checkpoints = DRAG_CHECKPOINTS[raceLengthFt] ?? [60, 330, 660, 1000, 1320].filter(d => d <= raceLengthFt);

  for (const dist of checkpoints) {
    const pt = findClosestByDistance(traces, dist);
    if (!pt) continue;

    // Avoid duplicating the finish checkpoint (handled separately)
    if (dist === raceLengthFt) continue;

    rows.push({
      label: `${dist}'`,
      kind: 'checkpoint',
      ...pickFields(pt),
    });
    usedDistances.add(Math.round(pt.s_ft));
  }

  // 2. Gear-change events
  for (let i = 1; i < traces.length; i++) {
    if (traces[i].gear !== traces[i - 1].gear && traces[i].gear > traces[i - 1].gear) {
      const roundedDist = Math.round(traces[i].s_ft);
      if (!usedDistances.has(roundedDist)) {
        rows.push({
          label: `${traces[i - 1].gear}→${traces[i].gear}`,
          kind: 'gear-change',
          ...pickFields(traces[i]),
        });
        usedDistances.add(roundedDist);
      }
    }
  }

  // 3. Finish row — closest trace row at or past raceLengthFt
  const finishPt = findClosestByDistance(traces, raceLengthFt);
  if (finishPt) {
    rows.push({
      label: 'Finish',
      kind: 'finish',
      ...pickFields(finishPt),
    });
  }

  // Sort by distance ascending
  rows.sort((a, b) => a.s_ft - b.s_ft);

  return rows;
}

function pickFields(pt: TracePoint): Omit<Vb6DetailRow, 'label' | 'kind'> {
  return {
    t_s: pt.t_s,
    s_ft: pt.s_ft,
    v_mph: pt.v_mph,
    a_g: pt.a_g,
    rpm: pt.rpm,
    gear: pt.gear,
    hp: pt.hp,
    dragHp: pt.dragHp,
    slip: pt.slip,
  };
}
