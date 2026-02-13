/**
 * VB6-consistent display formatting utilities.
 *
 * Replicates the VB6 cValue.Formatted property behavior:
 *   Formatted = Format(Round(Value, 10^-DecimalPlaces), ValFmt)
 *
 * VB6's Round() uses banker's rounding (round-half-to-even).
 * VB6's Format(x, "#.000") always shows exactly N decimal places.
 *
 * These helpers are DISPLAY-ONLY — they do not change underlying physics values.
 *
 * VB6 source references:
 *   - Cvalue.CLS lines 419-423 (Formatted property)
 *   - Cvalue.CLS lines 334-341 (ValFmt property)
 *   - Cvalue.CLS lines 463-478 (RightAlign method)
 *   - ENGPERF.BAS lines 1729-2269 (SetAllValues — DecimalPlaces for each gc_ control)
 *   - CDETAILS.CLS lines 142-154 (Mech Details RightAlign calls)
 *   - CDETAILS.CLS lines 446-462 (Flow Details RightAlign calls)
 *   - FlowB.frm lines 2098-2131 (CalcFlowBench label formatting)
 */

// ── VB6 Banker's Rounding ────────────────────────────────────────────

/**
 * VB6-style banker's rounding (round-half-to-even).
 *
 * VB6's Round(value, places) rounds to `places` decimal places using
 * the "round half to even" rule: when the value is exactly at the
 * midpoint (.5), it rounds to the nearest even digit.
 *
 * Examples:
 *   vb6Round(2.5, 0)   → 2   (rounds to even)
 *   vb6Round(3.5, 0)   → 4   (rounds to even)
 *   vb6Round(2.45, 1)  → 2.4 (rounds to even)
 *   vb6Round(2.55, 1)  → 2.6 (rounds to even)
 *   vb6Round(2.35, 1)  → 2.4 (rounds to even)
 *   vb6Round(1.005, 2) → 1.0 (rounds to even)
 */
export function vb6Round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  // Check if we're exactly at the midpoint (within float tolerance)
  const truncated = Math.trunc(shifted);
  const remainder = Math.abs(shifted - truncated);
  // Use a small epsilon to detect "exactly .5" in floating point
  if (Math.abs(remainder - 0.5) < 1e-9) {
    // Banker's rounding: round to even
    if (truncated % 2 === 0) {
      return truncated / factor;
    } else {
      return (truncated + Math.sign(shifted)) / factor;
    }
  }
  return Math.round(shifted) / factor;
}

// ── VB6 Fixed-decimal formatting ─────────────────────────────────────

/**
 * VB6-style fixed-decimal display string.
 *
 * Equivalent to: Format(Round(Value, 10^-decimals), ValFmt)
 * where ValFmt = "#." + "0" * decimals (e.g. "#.000" for 3 decimals).
 *
 * Always shows exactly `decimals` decimal places.
 * Uses banker's rounding for the rounding step.
 *
 * For decimals=0, returns an integer string (no decimal point).
 */
export function vb6Fixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = vb6Round(value, decimals);
  return rounded.toFixed(decimals);
}

// ── Domain-specific VB6 display formatters ───────────────────────────
//
// Each function below maps to a specific VB6 gc_ control's DecimalPlaces
// setting from ENGPERF.BAS SetAllValues, or to a RightAlign call in
// CDETAILS.CLS. The suffix matches what VB6 shows in labels/columns.
//
// Flow Bench table (FlowB.frm CalcFlowBench):
//   gc_IntLift(i)  → 3 decimals  (lift)
//   gc_IntFlow(i)  → 1 decimal   (flow CFM)
//   gc_WSCSArea    → 3 decimals  (area sq in)
//   gc_FlowVel     → 1 decimal   (velocity ft/s)
//   gc_FlowFlux    → 1 decimal   (flux CFM/in²)
//   gc_FVIndex     → 1 decimal   (FV Index %)
//
// Flow Details table (CDETAILS.CLS CalcFlowDetails):
//   Angle          → 0 decimals (integer), 1 at AngMPS
//   Valve Lift     → 3 decimals
//   Flow Area      → 3 decimals
//   Piston Speed   → 0 decimals (integer fpm)
//   Flow Demand    → 0 decimals (integer CFM)
//   Flow Velocity  → 0 decimals (integer fps)
//   Test Pressure  → 0 decimals (integer inH₂O)
//
// Mech Details table (CDETAILS.CLS CalcMechDetails):
//   Angle          → 0 decimals (integer), 1 at AngMPS
//   Piston Depth   → 3 decimals (inches)
//   Piston Speed   → 0 decimals (integer fpm)
//   Piston Speed   → 0 decimals (integer fps)
//   Piston Accel   → 0 decimals (integer gs)

const DASH = '—';

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ── Flow Bench formatters ────────────────────────────────────────────

/** Flow Bench: Lift column — 3 decimals, e.g. "0.550" */
export function vb6Lift(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Flow Bench: Flow column — 1 decimal, e.g. "250.0" */
export function vb6Flow(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

/** Flow Bench: Area column — 3 decimals, e.g. "2.400" */
export function vb6Area3(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Flow Bench: Velocity column — 1 decimal, e.g. "64.0" */
export function vb6Vel1(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

/** Flow Bench: Flux column — 1 decimal, e.g. "104.2" */
export function vb6Flux(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

/** Flow Bench: FV Index column — 1 decimal, e.g. "72.5" */
export function vb6FVI(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

// ── Flow Details formatters ──────────────────────────────────────────

/** Flow Details: Angle column — 0 decimals (integer), e.g. "72" */
export function vb6AngleInt(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 0) : DASH;
}

/** Flow Details: Valve Lift — 3 decimals, e.g. "0.550" */
export function vb6Dim3(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Flow Details: Flow Area — 3 decimals, e.g. "2.400" */
export function vb6Area(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Flow Details: Piston Speed (fpm), Flow Demand (CFM), Velocity (fps), Test Pressure — 0 decimals */
export function vb6Int(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 0) : DASH;
}

// ── Mech Details formatters ──────────────────────────────────────────

/** Mech Details: Piston depth — 3 decimals, e.g. "1.740" */
export function vb6Depth(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Mech Details: Piston speed (fpm/fps) and accel (gs) — 0 decimals */
export function vb6Speed(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 0) : DASH;
}

// ── Summary / general formatters ─────────────────────────────────────

/** CS Area — 3 decimals, e.g. "2.400" (gc_CSArea.DecimalPlaces_In = 3) */
export function vb6CSArea(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}

/** Max Intake Flow — 1 decimal, e.g. "250.0" (gc_MaxInFlow.DecimalPlaces_In = 1) */
export function vb6MaxFlow(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

/** Test Pressure — 1 decimal, e.g. "28.0" (gc_DeltaP.DecimalPlaces_In = 1) */
export function vb6Pressure(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 1) : DASH;
}

/** HP/CID or TQ/CID — 2 decimals (gc_HPperCID/gc_TQperCID.DecimalPlaces_In = 2) */
export function vb6PerCID(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 2) : DASH;
}

/** Valve Diameter — 3 decimals (gc_ValveDia.DecimalPlaces_In = 3) */
export function vb6ValveDia(v: number | undefined): string {
  return isNum(v) ? vb6Fixed(v, 3) : DASH;
}
