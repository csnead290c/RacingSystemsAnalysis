/**
 * Build VB6-exact Detailed Parameters from simulation results.
 *
 * PRIMARY path: use `printedRows` from VB6Exact simulation (authoritative).
 * FALLBACK path: derive approximate rows from `traces[]` for non-VB6 models.
 *
 * See docs/VB6_DETAILED_PARAMETERS.md for the full VB6 spec.
 */

import type { VB6PrintedRow } from '../../domain/physics/vb6/vb6PrintedRow';

// ---- Public types ----

/**
 * A single row in the Detailed Parameters table.
 * Columns match VB6 AddListLine output exactly.
 */
export interface DetailedParamRow {
  /** Row type for styling */
  type: 'staged' | 'rollout' | 'distance' | 'time' | 'shift' | 'speed';
  /** Reason tag for debugging */
  reason: string;
  /** Human-readable label for the Event column */
  label: string;

  // Formatted strings (VB6-exact when from printedRows)
  time: string;
  dist: string;
  mph: string;
  accel: string;
  rpm: string;
  gear: string;
  slip: string;

  // Numeric values for sorting / CSV export
  time_s: number;
  dist_ft: number;
  mph_num: number;
  accel_g: number;
  rpm_num: number;
  gear_num: number;
}

// ---- Primary: from VB6 printedRows ----

/**
 * Convert VB6PrintedRow[] (authoritative sim output) to DetailedParamRow[].
 * No re-derivation — uses the exact formatted values from the sim.
 *
 * Shift labeling: VB6 emits shift rows in pairs:
 *   1. Shift trigger (old gear) — labeled "Pre N–M shift"
 *   2. Shift complete (new gear) — labeled "Post N–M shift"
 * We detect pairs by looking at consecutive shift rows where
 * the second row's gear = first row's gear + 1.
 */
export function fromPrintedRows(rows: VB6PrintedRow[]): DetailedParamRow[] {
  const result: DetailedParamRow[] = rows.map(r => ({
    type: r.type,
    reason: r.reason,
    label: '',  // filled in below
    time: r.formatted.time.trim(),
    dist: r.formatted.dist.trim(),
    mph: r.formatted.mph.trim(),
    accel: r.formatted.accel.trim(),
    rpm: r.formatted.rpm.trim(),
    gear: r.formatted.gear.trim(),
    slip: r.formatted.slip,
    time_s: r.quantized.time_s,
    dist_ft: r.quantized.dist_ft,
    mph_num: r.quantized.mph,
    accel_g: r.quantized.accel_g,
    rpm_num: r.quantized.rpm,
    gear_num: r.quantized.gear,
  }));

  // Assign labels
  for (let i = 0; i < result.length; i++) {
    const row = result[i];
    switch (row.type) {
      case 'staged':   row.label = 'Staged'; break;
      case 'rollout':  row.label = 'Rollout'; break;
      case 'distance': row.label = `${row.dist} ft`; break;
      case 'time':     row.label = `t=${row.time}s`; break;
      case 'speed':    row.label = speedLabel(row); break;
      case 'shift':    row.label = shiftLabel(result, i); break;
      default:         row.label = row.reason; break;
    }
  }

  return result;
}

/** Map speed-match rows to canonical target labels (e.g., "0–60 mph"). */
function speedLabel(row: DetailedParamRow): string {
  // reason tag is e.g. "SPEED@60" or "SPEED@100"
  const m = row.reason.match(/^SPEED@(\d+)/);
  if (m) return `0\u2013${m[1]} mph`;
  // Fallback: round to nearest 10 mph target
  const rounded = Math.round(row.mph_num / 10) * 10;
  if (rounded > 0) return `0\u2013${rounded} mph`;
  return `${row.mph} mph`;
}

/**
 * Determine "Pre N–M shift" or "Post N–M shift" label for a shift row.
 * VB6 emits pairs: trigger row (old gear) then complete row (new gear).
 * Non-shift rows (distance, time) can appear between the pair members.
 */
function shiftLabel(rows: DetailedParamRow[], idx: number): string {
  const row = rows[idx];

  // Search forward for a post-shift partner (next shift row with gear = this.gear + 1)
  for (let j = idx + 1; j < rows.length; j++) {
    if (rows[j].type === 'shift') {
      if (rows[j].gear_num === row.gear_num + 1) {
        return `Pre ${row.gear_num}\u2013${rows[j].gear_num} shift`;
      }
      break;  // found a shift row but it's not a partner
    }
  }
  // Search backward for a pre-shift partner (prev shift row with gear = this.gear - 1)
  for (let j = idx - 1; j >= 0; j--) {
    if (rows[j].type === 'shift') {
      if (row.gear_num === rows[j].gear_num + 1) {
        return `Post ${rows[j].gear_num}\u2013${row.gear_num} shift`;
      }
      break;  // found a shift row but it's not a partner
    }
  }
  // Standalone shift (shouldn't happen with VB6 data, but fallback)
  return `Shift\u2192${row.gear}`;
}

// ---- Fallback: from traces ----

interface TracePoint {
  t_s: number;
  s_ft: number;
  v_mph: number;
  a_g: number;
  rpm: number;
  gear: number;
}

const DRAG_CHECKPOINTS: Record<number, number[]> = {
  660:  [60, 330, 660],
  1000: [60, 330, 660, 1000],
  1320: [60, 330, 660, 1000, 1320],
};

function findClosest(traces: TracePoint[], targetFt: number): TracePoint | null {
  if (traces.length === 0) return null;
  let best = 0;
  let bestDiff = Math.abs(traces[0].s_ft - targetFt);
  for (let i = 1; i < traces.length; i++) {
    const diff = Math.abs(traces[i].s_ft - targetFt);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return traces[best];
}

function fmtRow(type: DetailedParamRow['type'], reason: string, label: string, pt: TracePoint): DetailedParamRow {
  return {
    type,
    reason,
    label,
    time: pt.t_s.toFixed(2),
    dist: Math.round(pt.s_ft).toString(),
    mph: pt.v_mph.toFixed(1),
    accel: pt.a_g.toFixed(2),
    rpm: Math.round(pt.rpm).toLocaleString('en-US'),
    gear: pt.gear.toString(),
    slip: '',
    time_s: pt.t_s,
    dist_ft: pt.s_ft,
    mph_num: pt.v_mph,
    accel_g: pt.a_g,
    rpm_num: pt.rpm,
    gear_num: pt.gear,
  };
}

/**
 * Derive approximate VB6-style rows from raw trace data.
 * Used when printedRows is not available (non-VB6 models).
 */
export function fromTraces(traces: TracePoint[], raceLengthFt: number): DetailedParamRow[] {
  if (!traces || traces.length === 0) return [];

  const rows: DetailedParamRow[] = [];
  const usedDists = new Set<number>();

  // Staged row
  if (traces.length > 0) {
    rows.push(fmtRow('staged', 'STAGED', 'Staged', traces[0]));
  }

  // Distance checkpoints
  const checkpoints = DRAG_CHECKPOINTS[raceLengthFt]
    ?? [60, 330, 660, 1000, 1320].filter(d => d <= raceLengthFt);

  for (const dist of checkpoints) {
    const pt = findClosest(traces, dist);
    if (!pt) continue;
    const rounded = Math.round(pt.s_ft);
    if (usedDists.has(rounded)) continue;
    rows.push(fmtRow('distance', `DIST@${dist}`, `${Math.round(pt.s_ft)} ft`, pt));
    usedDists.add(rounded);
  }

  // Gear changes
  for (let i = 1; i < traces.length; i++) {
    if (traces[i].gear !== traces[i - 1].gear && traces[i].gear > traces[i - 1].gear) {
      const rounded = Math.round(traces[i].s_ft);
      if (!usedDists.has(rounded)) {
        rows.push(fmtRow('shift', `SHIFT@${traces[i].gear}`, `Shift\u2192${traces[i].gear}`, traces[i]));
        usedDists.add(rounded);
      }
    }
  }

  // Sort by time
  rows.sort((a, b) => a.time_s - b.time_s);
  return rows;
}

