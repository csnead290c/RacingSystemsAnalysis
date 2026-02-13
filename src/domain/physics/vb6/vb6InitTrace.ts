/**
 * VB6 INIT Trace Logger
 * 
 * Logs float32 values at each INIT sub-step for line-by-line VB6 parity verification.
 * 
 * DISABLED BY DEFAULT. Enable at runtime via setInitTraceEnabled(true).
 * 
 * Maps to VB6 TIMESLIP.FRM lines 1003-1057:
 * - HP/TQ calculation (lines 1010-1014)
 * - DragForce calculation (lines 1016-1019)
 * - force calculation (line 1020)
 * - Ags0 calculation (lines 1023-1027)
 * - AMAX calculation (lines 1046-1054)
 * - Ags0 clamping (lines 1055-1056)
 */

// Runtime enable flag - disabled by default
let initTraceEnabled = false;

// Pluggable sink for JSONL output (default: buffer only, no console)
type InitTraceSink = (line: string) => void;
let initTraceSink: InitTraceSink | null = null;

/**
 * Enable or disable INIT tracing at runtime
 */
export function setInitTraceEnabled(enabled: boolean): void {
  initTraceEnabled = enabled;
}

/**
 * Check if INIT tracing is enabled
 */
export function isInitTraceEnabled(): boolean {
  return initTraceEnabled;
}

/**
 * Set a custom sink for JSONL output.
 * When set, each recordInitStep call will pass the JSONL line to this sink.
 * Pass null to disable the sink (buffer-only mode).
 */
export function setInitTraceSink(sink: InitTraceSink | null): void {
  initTraceSink = sink;
}

// INIT trace step names (in order of VB6 execution)
export type InitTraceStep =
  | 'LAUNCH_RPM'
  | 'HP_LAUNCH_RAW'      // After TABY lookup
  | 'HP_CORRECTED'       // After HPTQMult / hpc
  | 'Z6_COMPUTED'        // Z6 = (60 / (2 * PI)) * 550
  | 'TQ_PRE_MULT'        // TQ = Z6 * HP / RPM
  | 'TQ_POST_MULT'       // TQ = TQ * TorqueMult * TGR * TGEff
  | 'WIND_FPS'           // WindFPS at launch (Vel=0)
  | 'Q_LAUNCH'           // q = Sgn(WindFPS) * rho * |WindFPS|^2 / (2*gc)
  | 'DRAG_FORCE'         // DragForce = CMU * Weight + DragCoef * RefArea * q
  | 'TIRE_SLIP_INIT'     // Initial tire slip factor
  | 'FORCE'              // force = TQ * GR * Eff / (TireSlip * TireDia / 24) - DragForce
  | 'LOSS_FACTOR'        // 0.96 for converter, 0.88 for clutch
  | 'AGS0_UNCLAMPED'     // Ags0 = lossFactor * force / Weight
  | 'STATIC_RWT'         // StaticRWT = DownForce - StaticFWt
  | 'CAXI'               // CAXI = (1 - (TractionIndex - 1) * 0.01) / (TrackTempEffect ^ 0.25)
  | 'AX'                 // AX constant (10.8 for Quarter, 9.7 for Bonneville)
  | 'CRTF'               // CRTF = CAXI * AX * TireDia * (TireWidth + 1) * (...)
  | 'AMAX'               // AMAX = (CRTF - DragForce) / Weight
  | 'AGS0_FINAL'         // After clamping to AMAX/AMin
  | 'SLIP_FLAG';         // True if traction limited

// INIT trace row structure
export interface InitTraceRow {
  step: InitTraceStep;
  value: number;         // The float32 value at this step
  valueHex: string;      // Hex representation for exact comparison
  vb6Line?: string;      // VB6 line reference (e.g., "1010")
}

// INIT trace buffer
let initTraceBuffer: InitTraceRow[] = [];

/**
 * Clear the INIT trace buffer
 */
export function clearInitTrace(): void {
  initTraceBuffer = [];
}

/**
 * Get the current INIT trace buffer
 */
export function getInitTrace(): InitTraceRow[] {
  return initTraceBuffer;
}

/**
 * Convert float32 to hex string for exact comparison
 */
function float32ToHex(value: number): string {
  const f32 = Math.fround(value);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, f32, false); // big-endian
  return '0x' + view.getUint32(0, false).toString(16).padStart(8, '0');
}

/**
 * Record an INIT trace step
 */
export function recordInitStep(step: InitTraceStep, value: number, vb6Line?: string): void {
  if (!initTraceEnabled) return;
  
  const f32Value = Math.fround(value);
  const row: InitTraceRow = {
    step,
    value: f32Value,
    valueHex: float32ToHex(f32Value),
    vb6Line,
  };
  initTraceBuffer.push(row);
  
  // If sink is set, emit JSONL line immediately
  if (initTraceSink) {
    initTraceSink(JSON.stringify(row));
  }
}

/**
 * Export INIT trace to JSONL format
 */
export function initTraceToJSONL(): string {
  return initTraceBuffer.map(row => JSON.stringify(row)).join('\n');
}

/**
 * Export INIT trace to human-readable format
 */
export function initTraceToReadable(): string {
  const lines: string[] = ['=== VB6 INIT TRACE ==='];
  for (const row of initTraceBuffer) {
    const vb6Ref = row.vb6Line ? ` (VB6:${row.vb6Line})` : '';
    lines.push(`${row.step.padEnd(20)} = ${row.value.toFixed(8)} [${row.valueHex}]${vb6Ref}`);
  }
  lines.push('======================');
  return lines.join('\n');
}

/**
 * Print INIT trace to console
 */
export function printInitTrace(): void {
  if (!initTraceEnabled) {
    console.log('[VB6 INIT Trace] Tracing is disabled');
    return;
  }
  console.log(initTraceToReadable());
}
