/**
 * VB6 Trace Hook - Records simulation state at key program points for parity debugging.
 * 
 * DISABLED BY DEFAULT. Enable by setting VB6_TRACE_ENABLED = true.
 * 
 * Program Points:
 * - INIT_DONE: After vb6InitState() completes
 * - ROLLOUT_CROSSED: When rollout distance is reached
 * - STEP_END: After each simulation step
 * - SHIFT_TRIGGER: When shift is triggered
 * - SHIFT_COMPLETE: After shift completes
 * - PRINT_TIME: When time-based print is emitted
 * - PRINT_DIST: When distance-based print is emitted
 * - PRINT_SPEED: When speed-based print is emitted (Bonneville)
 */

// Global enable flag - set to true to enable tracing
export const VB6_TRACE_ENABLED = false;

// Trace point names
export type TracePointName = 
  | 'INIT_DONE'
  | 'ROLLOUT_CROSSED'
  | 'STEP_END'
  | 'SHIFT_TRIGGER'
  | 'SHIFT_COMPLETE'
  | 'PRINT_TIME'
  | 'PRINT_DIST'
  | 'PRINT_SPEED';

// Trace row structure
export interface TraceRow {
  stepIndex: number;
  pointName: TracePointName;
  time_s: number;
  dist_ft: number;
  vel_ftps: number;
  rpm: number;
  AGS_g: number;
  gear: number;
  // Init-specific intermediate variables (only populated for INIT_DONE)
  init?: {
    HP_launch: number;
    HP_corrected: number;
    TQ: number;
    force: number;
    Ags0_unclamped: number;
    CAXI: number;
    AX: number;
    CRTF: number;
    AMax: number;
    StaticRWT: number;
    DragForce: number;
    TireSlip: number;
    lossFactor: number;
  };
}

// Trace buffer
let traceBuffer: TraceRow[] = [];

/**
 * Clear the trace buffer
 */
export function clearTrace(): void {
  traceBuffer = [];
}

/**
 * Get the current trace buffer
 */
export function getTrace(): TraceRow[] {
  return traceBuffer;
}

/**
 * Record a trace row at a program point
 */
export function recordTracePoint(
  stepIndex: number,
  pointName: TracePointName,
  state: {
    time_s: number;
    dist_ft: number;
    vel_ftps: number;
    rpm: number;
    AGS_g: number;
    gear: number;
  },
  initData?: TraceRow['init']
): void {
  if (!VB6_TRACE_ENABLED) return;
  
  const row: TraceRow = {
    stepIndex,
    pointName,
    time_s: state.time_s,
    dist_ft: state.dist_ft,
    vel_ftps: state.vel_ftps,
    rpm: state.rpm,
    AGS_g: state.AGS_g,
    gear: state.gear,
  };
  
  if (initData) {
    row.init = initData;
  }
  
  traceBuffer.push(row);
}

/**
 * Export trace to JSONL format (one JSON object per line)
 */
export function traceToJSONL(): string {
  return traceBuffer.map(row => JSON.stringify(row)).join('\n');
}

/**
 * Export trace to CSV format
 */
export function traceToCSV(): string {
  const headers = [
    'stepIndex',
    'pointName',
    'time_s',
    'dist_ft',
    'vel_ftps',
    'rpm',
    'AGS_g',
    'gear',
    'init.HP_launch',
    'init.HP_corrected',
    'init.TQ',
    'init.force',
    'init.Ags0_unclamped',
    'init.CAXI',
    'init.AX',
    'init.CRTF',
    'init.AMax',
    'init.StaticRWT',
    'init.DragForce',
    'init.TireSlip',
    'init.lossFactor',
  ];
  
  const rows = traceBuffer.map(row => [
    row.stepIndex,
    row.pointName,
    row.time_s,
    row.dist_ft,
    row.vel_ftps,
    row.rpm,
    row.AGS_g,
    row.gear,
    row.init?.HP_launch ?? '',
    row.init?.HP_corrected ?? '',
    row.init?.TQ ?? '',
    row.init?.force ?? '',
    row.init?.Ags0_unclamped ?? '',
    row.init?.CAXI ?? '',
    row.init?.AX ?? '',
    row.init?.CRTF ?? '',
    row.init?.AMax ?? '',
    row.init?.StaticRWT ?? '',
    row.init?.DragForce ?? '',
    row.init?.TireSlip ?? '',
    row.init?.lossFactor ?? '',
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Print trace summary to console
 */
export function printTraceSummary(): void {
  if (!VB6_TRACE_ENABLED) {
    console.log('[VB6 Trace] Tracing is disabled');
    return;
  }
  
  console.log(`[VB6 Trace] ${traceBuffer.length} rows recorded`);
  
  // Count by point name
  const counts: Record<string, number> = {};
  for (const row of traceBuffer) {
    counts[row.pointName] = (counts[row.pointName] ?? 0) + 1;
  }
  
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count}`);
  }
}
