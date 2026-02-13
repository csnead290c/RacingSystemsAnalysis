/**
 * VB6-consistent chart axis scaling helpers.
 *
 * Ported from RSALIB.bas RoundUp/RoundDown and the axis-scaling logic in
 * FlowB.frm Graph2 and CDETAILS.CLS CalcFlowDetails.
 *
 * The VB6 graph control uses:
 *   - XAxisMin / XAxisMax / XAxisTicks
 *   - YAxisMin / YAxisMax / YAxisTicks
 * where ticks = number of grid *intervals* (not tick marks).
 *
 * We replicate the same rounding and step-selection so that axis ranges
 * match VB6 for identical data.
 */

// ── VB6 RoundUp / RoundDown ────────────────────────────────────────

/**
 * VB6 RSALIB.bas RoundUp: rounds `value` UP to the nearest `increment`.
 * For fractional increments (0.1, 0.01, 0.001) uses integer math to
 * avoid floating-point drift, matching VB6 exactly.
 */
export function vb6RoundUp(value: number, increment: number): number {
  // VB6: val = Round(Value, increment/10) / increment; if Int(val)<val then val=val+1
  const rounded = roundToIncrement(value, increment / 10);
  let v = rounded / increment;
  if (Math.floor(v) < v) v = v + 1;

  if (increment === 0.1) return Math.floor(v) / 10;
  if (increment === 0.01) return Math.floor(v) / 100;
  if (increment === 0.001) return Math.floor(v) / 1000;
  return increment * Math.floor(v);
}

/**
 * VB6 RSALIB.bas RoundDown: rounds `value` DOWN to the nearest `increment`.
 */
export function vb6RoundDown(value: number, increment: number): number {
  const rounded = roundToIncrement(value, increment / 10);
  const v = rounded / increment;

  if (increment === 0.1) return Math.floor(v) / 10;
  if (increment === 0.01) return Math.floor(v) / 100;
  if (increment === 0.001) return Math.floor(v) / 1000;
  return increment * Math.floor(v);
}

/** Mimics VB6 Round(value, inc) where inc is a power-of-10 fraction. */
function roundToIncrement(value: number, inc: number): number {
  if (inc <= 0) return value;
  const factor = 1 / inc;
  return Math.round(value * factor) / factor;
}

// ── VB6 step-selection tables ───────────────────────────────────────

/**
 * VB6 "Select Case DY" step table used for Flow CFM and Flow Demand axes.
 * Given a raw step (range / targetTicks), snaps to the next VB6 "nice" step.
 */
const FLOW_STEP_TABLE = [1, 2, 4, 5, 8, 10, 20, 40, 50, 80, 100, 200, 400, 500];

/**
 * VB6 step table for FV Index (%) axis — only two choices.
 */
const FVI_STEP_TABLE = [10, 20];

/**
 * VB6 step table for Flow Area (sq in) axis.
 */
const AREA_STEP_TABLE = [0.1, 0.2, 0.4, 0.5, 0.8, 1, 2, 4, 5];

/**
 * VB6 "bump up" table for Flow Area when data exceeds initial range.
 */
const AREA_BUMP_TABLE = [0.2, 0.4, 0.5, 0.8, 1, 2, 4, 5, 8];

/**
 * Snap a raw step value to the next value in a VB6 step table.
 * VB6 uses "Case Is <= X" so we find the first table entry >= rawStep.
 */
export function vb6SnapStep(rawStep: number, table: number[]): number {
  for (const s of table) {
    if (rawStep <= s) return s;
  }
  return table[table.length - 1];
}

// ── Tick array generator ────────────────────────────────────────────

/**
 * Generate an array of tick values from min to max (inclusive) at `step` intervals.
 * Rounds each tick to avoid floating-point noise.
 */
export function generateTicks(min: number, max: number, step: number): number[] {
  if (step <= 0 || max <= min) return [min];
  const ticks: number[] = [];
  const decimals = countDecimals(step);
  for (let v = min; v <= max + step * 0.001; v += step) {
    ticks.push(parseFloat(v.toFixed(decimals)));
  }
  return ticks;
}

function countDecimals(n: number): number {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

// ── High-level axis domain builders ─────────────────────────────────

export interface AxisDomain {
  min: number;
  max: number;
  step: number;
  ticks: number[];
  tickCount: number; // number of intervals (VB6 .YAxisTicks)
}

// ── Flow Bench: X axis (Lift) ───────────────────────────────────────

/**
 * VB6 FlowB.frm Graph2 X-axis: Lift in inches.
 *   min = 0
 *   max = RoundUp(lastLift, 0.1)
 *   ticks = (max-min) / 0.1, then double if 2/3/4/5
 */
export function flowBenchXAxis(lastLift: number): AxisDomain {
  const min = 0;
  const max = vb6RoundUp(lastLift, 0.1);
  let tickCount = Math.round((max - min) / 0.1);
  tickCount = doubleSmallTicks(tickCount);
  const step = (max - min) / tickCount;
  return { min, max, step, ticks: generateTicks(min, max, step), tickCount };
}

/**
 * VB6 doubles small tick counts: 2→4, 3→6, 4→8, 5→10.
 */
function doubleSmallTicks(n: number): number {
  if (n >= 2 && n <= 5) return n * 2;
  return n;
}

// ── Flow Bench: Left Y axis (Flow CFM) ─────────────────────────────

/**
 * VB6 FlowB.frm Graph2 left Y-axis: Intake Flow (CFM).
 *   min = 0
 *   max = maxFlow (last row)
 *   target 6 ticks, snap DY to FLOW_STEP_TABLE
 *   RoundUp max to DY, then adjust ticks ±1 for aesthetics
 *   final max = min + ticks * DY
 *
 * Returns { min, max, step, ticks, tickCount }.
 * Also returns tickCount (ysave) needed by the FVI axis.
 */
export function flowBenchFlowYAxis(maxFlow: number): AxisDomain {
  const min = 0;
  let yMax = maxFlow;
  let tickCount = 6;
  let dy = (yMax - min) / tickCount;
  dy = vb6SnapStep(dy, FLOW_STEP_TABLE);

  yMax = vb6RoundUp(yMax, dy);
  tickCount = tickCount - 1;
  // check if another tick is needed
  if (yMax > min + tickCount * dy) tickCount++;
  // drop one tick if graph has too much empty space
  if (min + tickCount * dy > yMax + dy) tickCount--;
  yMax = min + tickCount * dy;

  return { min, max: yMax, step: dy, ticks: generateTicks(min, yMax, dy), tickCount };
}

// ── Flow Bench: Right Y axis (FV Index %) ───────────────────────────

/**
 * VB6 FlowB.frm Graph2 right Y-axis: FV Index (%).
 *   min = min(fvi values), max = max(fvi values) — NOT starting at 0
 *   ticks = same count as left Y (ysave)
 *   DY snapped to [10, 20]
 *   min = RoundDown(min, DY)
 *   adjust positioning for aesthetics
 *   final max = min + ticks * DY
 */
export function flowBenchFviYAxis(fviValues: number[], leftTickCount: number): AxisDomain {
  if (fviValues.length === 0) {
    return { min: 0, max: 100, step: 20, ticks: generateTicks(0, 100, 20), tickCount: 5 };
  }
  let yMin = Math.min(...fviValues);
  let yMax = Math.max(...fviValues);
  const tickCount = leftTickCount;

  let dy = (yMax - yMin) / tickCount;
  dy = vb6SnapStep(dy, FVI_STEP_TABLE);

  yMin = vb6RoundDown(yMin, dy);

  // check if another tick is needed to keep data within dy/2 over upper grid
  if (yMax - dy / 2 > yMin + tickCount * dy) {
    yMin = yMin + dy; // shift axis up
  }

  // position graph in range to look better
  if (yMin + tickCount * dy > yMax + dy) {
    yMin = yMin - dy;
  }
  yMax = yMin + tickCount * dy;

  return { min: yMin, max: yMax, step: dy, ticks: generateTicks(yMin, yMax, dy), tickCount };
}

// ── Flow Details: X axis (Crank Angle) ──────────────────────────────

/**
 * VB6 CDETAILS.CLS X-axis: Crank Angle (deg ATDC).
 *   min = RoundDown(firstAngle, 45)
 *   max = RoundUp(lastAngle, 45)
 *   ticks = (max-min)/45, minus 1 if min<0, then double small counts
 */
export function flowDetailsXAxis(firstAngle: number, lastAngle: number): AxisDomain {
  const min = vb6RoundDown(firstAngle, 45);
  const max = vb6RoundUp(lastAngle, 45);
  let tickCount = Math.round((max - min) / 45);
  if (min < 0) tickCount--;
  tickCount = doubleSmallTicks(tickCount);
  const step = tickCount > 0 ? (max - min) / tickCount : 45;
  return { min, max, step, ticks: generateTicks(min, max, step), tickCount };
}

// ── Flow Details: Left Y axis (Flow Demand + Velocity, shared) ──────

/**
 * VB6 CDETAILS.CLS left Y-axis: shared by Flow Demand (CFM) and Velocity (fps).
 *   min = 0
 *   max = max(FlowDemand(6), all velocities computed as 2.4*demand/area)
 *   Same step table and tick logic as Flow Bench flow axis.
 *
 * In VB6, both Set 1 (demand) and Set 2 (velocity) share the same left axis.
 * The max is the larger of peak demand and peak velocity.
 */
export function flowDetailsLeftYAxis(maxDemandOrVelocity: number): AxisDomain {
  const min = 0;
  let yMax = maxDemandOrVelocity;
  let tickCount = 6;
  let dy = (yMax - min) / tickCount;
  dy = vb6SnapStep(dy, FLOW_STEP_TABLE);

  // VB6 CDETAILS.CLS lines 525-537: NO RoundUp here (unlike FlowB.frm).
  // Just adjust tick count for aesthetics, then compute final max.
  tickCount--;
  if (yMax > min + tickCount * dy) tickCount++;
  if (min + tickCount * dy > yMax + dy) tickCount--;
  yMax = min + tickCount * dy;

  return { min, max: yMax, step: dy, ticks: generateTicks(min, yMax, dy), tickCount };
}

// ── Flow Details: Right Y axis (Flow Area sq in) ────────────────────

/**
 * VB6 CDETAILS.CLS right Y-axis: Flow Area (sq in).
 *   min = 0
 *   max = FlowArea(7) — the peak area value
 *   ticks = same count as left Y (ysave)
 *   DY snapped to AREA_STEP_TABLE, bumped if data exceeds range
 */
export function flowDetailsAreaYAxis(maxArea: number, leftTickCount: number): AxisDomain {
  const min = 0;
  let yMax = maxArea;
  const tickCount = leftTickCount;

  let dy = tickCount > 0 ? (yMax - min) / tickCount : 0.5;
  dy = vb6SnapStep(dy, AREA_STEP_TABLE);

  // VB6: if data exceeds range, bump DY up one step
  if (yMax > min + tickCount * dy) {
    dy = vb6SnapStep(dy, AREA_BUMP_TABLE);
  }
  yMax = min + tickCount * dy;

  return { min, max: yMax, step: dy, ticks: generateTicks(min, yMax, dy), tickCount };
}

// ── VB6-style 5x linear interpolation (FlowB.frm Graph2 lines 2276-2300) ──

export interface DenseChartPoint {
  lift_in: number;
  flow_cfm: number;
  fvIndex_pct: number;
  isOriginal: boolean;
}

/**
 * Generate VB6-style dense linearly-interpolated dataset for Flow Bench chart.
 * VB6 generates 5 subdivisions between each pair of data points.
 * Total points = 1 (origin) + (N-1)*5 + 1 (last) = (N-1)*5 + 2
 * where N = number of input rows.
 */
export function flowBenchDenseInterpolation(
  rows: readonly { lift_in: number; flow_cfm: number; fvIndex_pct: number }[],
): DenseChartPoint[] {
  if (rows.length < 2) return rows.map(r => ({ ...r, isOriginal: true }));
  const X5 = 5;
  const dense: DenseChartPoint[] = [];
  // First point (origin)
  dense.push({ lift_in: 0, flow_cfm: 0, fvIndex_pct: rows[0].fvIndex_pct, isOriginal: false });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 1; j <= X5; j++) {
      const t = (j - 1) / X5;
      const lift = rows[i].lift_in + t * (rows[i + 1].lift_in - rows[i].lift_in);
      const flow = rows[i].flow_cfm + t * (rows[i + 1].flow_cfm - rows[i].flow_cfm);
      const fvi = rows[i].fvIndex_pct + t * (rows[i + 1].fvIndex_pct - rows[i].fvIndex_pct);
      dense.push({ lift_in: lift, flow_cfm: flow, fvIndex_pct: fvi, isOriginal: j === 1 });
    }
  }
  // Last point
  const last = rows[rows.length - 1];
  dense.push({ lift_in: last.lift_in, flow_cfm: last.flow_cfm, fvIndex_pct: last.fvIndex_pct, isOriginal: true });
  return dense;
}
