/**
 * Step Trace for VB6 Parity Debugging
 * 
 * Captures step-by-step simulation data and finds the first divergence
 * between two traces (e.g., VB6 vs TypeScript).
 */

/**
 * A single step row from simulation.
 */
export interface StepRow {
  step: number;
  t_s: number;
  gear: number;
  rpm: number;
  v_fps: number;
  x_ft: number;
  ax_ftps2: number;
  hp: number;
  clutchSlip?: number;
  rho?: number;
  dragHP?: number;
  rollHP?: number;
}

/**
 * A complete step trace from a simulation run.
 */
export interface StepTrace {
  name: string;
  rows: StepRow[];
  et_s: number;
  mph: number;
}

/**
 * Result of comparing two step traces.
 */
export interface TraceDiff {
  /** Index of first differing step, or null if identical */
  index: number | null;
  /** Keys that differ at the first mismatch */
  keys: string[];
  /** Row from trace A at mismatch */
  rowA?: StepRow;
  /** Row from trace B at mismatch */
  rowB?: StepRow;
  /** Summary message */
  message: string;
}

/**
 * Keys to compare in step rows.
 */
const COMPARE_KEYS: (keyof StepRow)[] = [
  'gear', 'rpm', 'v_fps', 'x_ft', 'ax_ftps2', 'hp',
];

/**
 * Find the first step where two traces differ.
 * 
 * @param a - First trace (e.g., VB6 reference)
 * @param b - Second trace (e.g., TypeScript simulation)
 * @param eps - Tolerance for floating-point comparison (0 for exact)
 * @returns TraceDiff with first mismatch info, or null if identical
 */
export function firstDiff(a: StepTrace, b: StepTrace, eps = 0): TraceDiff {
  const n = Math.min(a.rows.length, b.rows.length);
  
  for (let i = 0; i < n; i++) {
    const rowA = a.rows[i];
    const rowB = b.rows[i];
    const badKeys: string[] = [];
    
    for (const key of COMPARE_KEYS) {
      const va = rowA[key] ?? 0;
      const vb = rowB[key] ?? 0;
      
      if (typeof va === 'number' && typeof vb === 'number') {
        if (Math.abs(va - vb) > eps) {
          badKeys.push(key);
        }
      } else if (va !== vb) {
        badKeys.push(key);
      }
    }
    
    if (badKeys.length > 0) {
      return {
        index: i,
        keys: badKeys,
        rowA,
        rowB,
        message: `First diff at step ${i}: ${badKeys.join(', ')}`,
      };
    }
  }
  
  // Check if lengths differ
  if (a.rows.length !== b.rows.length) {
    return {
      index: n,
      keys: ['length'],
      message: `Traces differ in length: ${a.rows.length} vs ${b.rows.length}`,
    };
  }
  
  // Check final results
  const etDiff = Math.abs(a.et_s - b.et_s);
  const mphDiff = Math.abs(a.mph - b.mph);
  
  if (etDiff > eps || mphDiff > eps) {
    return {
      index: null,
      keys: etDiff > eps && mphDiff > eps ? ['et_s', 'mph'] : etDiff > eps ? ['et_s'] : ['mph'],
      message: `Final results differ: ET ${a.et_s} vs ${b.et_s}, MPH ${a.mph} vs ${b.mph}`,
    };
  }
  
  return {
    index: null,
    keys: [],
    message: 'Traces are identical',
  };
}

/**
 * Format a step row for display.
 */
export function formatRow(row: StepRow): string {
  return `step=${row.step} t=${row.t_s.toFixed(4)}s gear=${row.gear} rpm=${row.rpm.toFixed(0)} ` +
    `v=${row.v_fps.toFixed(3)}fps x=${row.x_ft.toFixed(3)}ft ax=${row.ax_ftps2.toFixed(3)}ft/s² hp=${row.hp.toFixed(1)}`;
}

/**
 * Format a trace diff for display.
 */
export function formatDiff(diff: TraceDiff, a?: StepTrace, b?: StepTrace): string {
  const lines: string[] = [diff.message];
  
  if (diff.index !== null && diff.rowA && diff.rowB) {
    lines.push('');
    lines.push(`Trace A (${a?.name ?? 'A'}): ${formatRow(diff.rowA)}`);
    lines.push(`Trace B (${b?.name ?? 'B'}): ${formatRow(diff.rowB)}`);
    lines.push('');
    lines.push('Differences:');
    
    for (const key of diff.keys) {
      const va = (diff.rowA as any)[key];
      const vb = (diff.rowB as any)[key];
      const delta = typeof va === 'number' && typeof vb === 'number' ? vb - va : 'N/A';
      lines.push(`  ${key}: ${va} vs ${vb} (delta: ${delta})`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Export trace to CSV format.
 */
export function traceToCSV(trace: StepTrace): string {
  const headers = ['step', 't_s', 'gear', 'rpm', 'v_fps', 'x_ft', 'ax_ftps2', 'hp', 'clutchSlip', 'rho', 'dragHP', 'rollHP'];
  const lines: string[] = [headers.join(',')];
  
  for (const row of trace.rows) {
    const values = headers.map(h => {
      const v = (row as any)[h];
      return v !== undefined ? String(v) : '';
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * Compare two CSV trace files and find first diff.
 * Useful for comparing VB6 exported data with TS simulation.
 */
export function parseTraceCSV(csv: string, name: string): StepTrace {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return { name, rows: [], et_s: 0, mph: 0 };
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: StepRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};
    
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      const v = values[j]?.trim();
      
      if (v !== undefined && v !== '') {
        row[h] = parseFloat(v);
      }
    }
    
    if (row.step !== undefined) {
      rows.push(row as StepRow);
    }
  }
  
  // Extract final ET/MPH from last row or metadata
  const lastRow = rows[rows.length - 1];
  const et_s = lastRow?.t_s ?? 0;
  const mph = lastRow ? lastRow.v_fps * 3600 / 5280 : 0;
  
  return { name, rows, et_s, mph };
}
