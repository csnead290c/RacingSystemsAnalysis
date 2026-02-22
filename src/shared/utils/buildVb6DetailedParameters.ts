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
 */
export function fromPrintedRows(rows: VB6PrintedRow[]): DetailedParamRow[] {
  return rows.map(r => ({
    type: r.type,
    reason: r.reason,
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

function fmtRow(type: DetailedParamRow['type'], reason: string, pt: TracePoint): DetailedParamRow {
  return {
    type,
    reason,
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
    rows.push(fmtRow('staged', 'STAGED', traces[0]));
  }

  // Distance checkpoints
  const checkpoints = DRAG_CHECKPOINTS[raceLengthFt]
    ?? [60, 330, 660, 1000, 1320].filter(d => d <= raceLengthFt);

  for (const dist of checkpoints) {
    const pt = findClosest(traces, dist);
    if (!pt) continue;
    const rounded = Math.round(pt.s_ft);
    if (usedDists.has(rounded)) continue;
    rows.push(fmtRow('distance', `DIST@${dist}`, pt));
    usedDists.add(rounded);
  }

  // Gear changes
  for (let i = 1; i < traces.length; i++) {
    if (traces[i].gear !== traces[i - 1].gear && traces[i].gear > traces[i - 1].gear) {
      const rounded = Math.round(traces[i].s_ft);
      if (!usedDists.has(rounded)) {
        rows.push(fmtRow('shift', `SHIFT@${traces[i].gear}`, traces[i]));
        usedDists.add(rounded);
      }
    }
  }

  // Sort by time
  rows.sort((a, b) => a.time_s - b.time_s);
  return rows;
}

// ---- CSV export ----

export function buildCSV(rows: DetailedParamRow[]): string {
  const hdr = ['Time_s', 'Dist_ft', 'MPH', 'Accel_g', 'RPM', 'Gear', 'Slip', 'Type'];
  const lines = rows.map(r =>
    [r.time, r.dist, r.mph, r.accel, r.rpm, r.gear, r.slip, r.type].join(',')
  );
  return [hdr.join(','), ...lines].join('\n');
}
