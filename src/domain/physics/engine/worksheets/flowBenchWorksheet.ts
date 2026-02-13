/**
 * Flow Bench Worksheet — VB6 FlowB.frm port
 *
 * Implements the Intake Port Flowbench Data worksheet from VB6 Engine Pro.
 * This is a Pro-only feature that allows users to enter up to 10 lift/flow
 * data points and computes derived values (area, velocity, flux, FV index)
 * at each point.
 *
 * VB6 Source:
 *   - FlowB.frm (frmFlowB) — UI and event handlers
 *   - ENGPERF.BAS — CalcFlowBench, CalcWSCSArea, CalcFlowStuff, CalcVelStd
 *   - DECLARES.BAS — gc_IntLift(0..9), gc_IntFlow(0..9)
 *
 * Key VB6 semantics:
 *   - Up to 10 rows (index 0..9), lift values must be ascending, no gaps
 *   - Each row computes: area (CalcWSCSArea), flux, velocity, FV index
 *   - Bottom summary: values at max intake valve lift via TABY interpolation
 *   - Default data estimation when no flowbench data exists (Form_Load)
 *
 * Dependencies:
 *   - calcWSCSArea from intakeFlowWorksheet.ts (already ported)
 *   - calcVelStd from intakeFlowWorksheet.ts (already ported)
 *   - taby from vb6/dtaby.ts (0-indexed Lagrangian interpolation)
 */

import {
  calcWSCSArea,
  calcVelStd,
  type CSAreaInputs,
} from './intakeFlowWorksheet';
import { taby } from '../../vb6/dtaby';

// ── Constants ────────────────────────────────────────────────────────

/** Maximum number of flowbench data rows (VB6: gc_IntLift(0 To 9)) */
export const MAX_FLOW_BENCH_ROWS = 10;

// ── Types ────────────────────────────────────────────────────────────

/** A single flowbench data row (user-entered lift + flow, computed derived) */
export interface FlowBenchRow {
  /** Valve lift in inches (user input) */
  lift_in: number;
  /** Flow in CFM at test pressure (user input) */
  flow_cfm: number;
  /** Computed: cross-section area at this lift (sq in) */
  area_sqin: number;
  /** Computed: flow velocity (ft/sec) = flux * 2.4 */
  velocity_fps: number;
  /** Computed: flow flux (CFM/sq in) = flow / area */
  flowFlux: number;
  /** Computed: flow velocity index (%) = 100 * velocity / VSTD */
  fvIndex_pct: number;
}

/** Summary values computed at the maximum intake valve lift */
export interface FlowBenchSummary {
  /** Flow at max valve lift via TABY interpolation (CFM) */
  flow_cfm: number;
  /** CS Area at max valve lift (sq in) */
  csArea_sqin: number;
  /** Flow velocity at max lift (ft/sec) */
  velocity_fps: number;
  /** Flow flux at max lift (CFM/sq in) */
  flowFlux: number;
  /** Flow velocity index at max lift (%) */
  fvIndex_pct: number;
}

/** Complete flowbench worksheet result */
export interface FlowBenchResult {
  rows: FlowBenchRow[];
  summary: FlowBenchSummary;
}

/** Valve seat geometry needed for area calculations */
export interface FlowBenchSeatData {
  seatDia_in: number;
  seatPer: number;
  vsAngle_deg: number;
  vsWidth_in: number;
  stemDia_in: number;
}

/** Engine context needed by the flowbench */
export interface FlowBenchContext {
  valveDia_in: number;
  noInValves: number;
  deltaP_inH2O: number;
  maxValveLift_in: number;
}

// ── VB6 Default Flowbench Estimation ─────────────────────────────────

/**
 * Discharge coefficient table for default flowbench data estimation.
 * VB6 FlowB.frm Form_Load lines 1213-1229
 * Based on 1998 work for intake valve with 90% throat.
 * 17 points of (L/D, coefficient).
 */
const DEFAULT_COEF_LQD = [
  0.05, 0.075, 0.1, 0.125, 0.15, 0.175, 0.2, 0.225, 0.25,
  0.275, 0.3, 0.325, 0.35, 0.375, 0.4, 0.425, 0.45,
];
const DEFAULT_COEF_Y = [
  1.145, 1.11, 1.069, 1.028, 0.958, 0.905, 0.866, 0.855, 0.895,
  0.934, 0.954, 0.962, 0.966, 0.969, 0.97, 0.971, 0.971,
];

/**
 * VB6 round-trip: .Value = val(.Formatted)
 * Rounds to N decimal places matching VB6 display precision.
 */
function roundTrip(value: number, dp: number): number {
  return Number(value.toFixed(dp));
}

/**
 * Estimate default flowbench data when none exists.
 * VB6 FlowB.frm Form_Load lines 1211-1298
 *
 * Generates up to 10 lift/flow pairs based on valve geometry and
 * discharge coefficient table, then scales to match maxInFlow.
 *
 * @param valveDia_in - Intake valve diameter (inches)
 * @param noInValves - Number of intake valves per cylinder
 * @param maxInFlow_cfm - Maximum intake flow (CFM) from main form
 * @param deltaP_inH2O - Flowbench test pressure (inches H2O)
 * @param seatData - Valve seat geometry
 * @param camType - Cam type (0-6) for max lift estimation
 * @param maxValveLift_in - Current max valve lift setting
 * @returns Object with data (array of {lift, flow} pairs) and adjustedMaxLift_in
 *          (the possibly-increased max valve lift, matching VB6 gc_ValveLift adjustment)
 */
export function estimateDefaultFlowbenchData(
  valveDia_in: number,
  noInValves: number,
  maxInFlow_cfm: number,
  deltaP_inH2O: number,
  seatData: FlowBenchSeatData,
  camType: number,
  maxValveLift_in: number,
): { data: { lift: number; flow: number }[]; adjustedMaxLift_in: number } {
  const vstd = calcVelStd(deltaP_inH2O, noInValves);

  // VB6 line 1231-1232: lift increment based on valve diameter
  const ivd = valveDia_in;
  const inc = ivd < 1.35 ? 0.05 : 0.1;

  // Build CSAreaInputs template for calcWSCSArea calls
  const csInputs: CSAreaInputs = {
    seatDia: seatData.seatDia_in,
    seatPer: seatData.seatPer,
    vsAngle: seatData.vsAngle_deg,
    vsWidth: seatData.vsWidth_in,
    stemDia: seatData.stemDia_in,
    valveLift: 0, // will be overridden per point
  };
  const ctx = { valveDia: valveDia_in, noInValves };

  // VB6 lines 1234-1249: generate raw lift/flow pairs
  const rawPoints: { lift: number; flow: number }[] = [];
  for (let i = 0; i < MAX_FLOW_BENCH_ROWS; i++) {
    const work = (i + 1) * inc;
    const lqd = work / ivd;

    if (lqd <= 0.4) {
      const lift = roundTrip(work, 2);

      // TABY interpolation of discharge coefficient
      const coef = taby(DEFAULT_COEF_LQD, DEFAULT_COEF_Y, 17, 2, lqd);

      // CalcWSCSArea at this lift
      const area = calcWSCSArea({ ...csInputs, valveLift: work }, ctx);

      // VB6 line 1242: flow = area * coef * VSTD / 2.4
      const flow = area * coef * vstd / 2.4;

      rawPoints.push({ lift, flow: roundTrip(flow, 0) });
    } else {
      break; // VB6 sets remaining to 0
    }
  }

  if (rawPoints.length === 0) return { data: [], adjustedMaxLift_in: maxValveLift_in };

  // VB6 lines 1266-1268: find flow at max valve lift via TABY
  const lifts = rawPoints.map(p => p.lift);
  const flows = rawPoints.map(p => p.flow);
  let flowAtMaxLift = taby(lifts, flows, rawPoints.length, 1, maxValveLift_in);

  // VB6 lines 1271-1290: adjust max valve lift if scaling is too large
  let adjustedMaxLift = maxValveLift_in;
  const scaling = maxInFlow_cfm / flowAtMaxLift;
  if (scaling > 1.1) {
    adjustedMaxLift = roundUp(scaling * maxValveLift_in, 0.05);

    // VB6 lines 1277-1287: clamp to cam-type-based max
    const liftRatioMax = getCamTypeLiftRatio(camType) + 0.01;
    if (adjustedMaxLift > liftRatioMax * ivd) {
      adjustedMaxLift = roundDown(liftRatioMax * ivd, 0.05);
    }

    flowAtMaxLift = taby(lifts, flows, rawPoints.length, 1, adjustedMaxLift);
  }

  // VB6 lines 1293-1298: scale all flow values to match maxInFlow
  const scaleFactor = maxInFlow_cfm / flowAtMaxLift;
  const data = rawPoints.map(p => ({
    lift: p.lift,
    flow: roundTrip(roundTrip(p.flow * scaleFactor, 0), 0),
  }));
  return { data, adjustedMaxLift_in: adjustedMaxLift };
}

/**
 * VB6 cam type to max lift/diameter ratio.
 * FlowB.frm lines 1253-1260 and 1277-1284
 */
export function getCamTypeLiftRatio(camType: number): number {
  switch (camType) {
    case 0: return 0.38;  // Overhead Cam
    case 1: return 0.38;  // Roller
    case 2: return 0.33;  // Mushroom Tappet
    case 3: return 0.31;  // High Rate Flat Tappet
    case 4: return 0.31;  // Normal Flat Tappet
    case 5: return 0.29;  // Hydraulic Roller
    default: return 0.26; // Hydraulic Flat Tappet
  }
}

/** VB6 RoundUp: round up to nearest increment */
function roundUp(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

/** VB6 RoundDown: round down to nearest increment */
function roundDown(value: number, increment: number): number {
  return Math.floor(value / increment) * increment;
}

// ── Per-Row Calculation ──────────────────────────────────────────────

/**
 * Calculate derived values for a single flowbench row.
 * VB6 FlowB.frm CalcFlowBench(i) lines 2098-2131
 *
 * @param lift_in - Valve lift at this row (inches)
 * @param flow_cfm - Flow at this row (CFM)
 * @param seatData - Valve seat geometry
 * @param ctx - Engine context (valveDia, noInValves, deltaP)
 * @returns Complete FlowBenchRow with derived values
 */
export function calcFlowBenchRow(
  lift_in: number,
  flow_cfm: number,
  seatData: FlowBenchSeatData,
  ctx: FlowBenchContext,
): FlowBenchRow {
  if (lift_in <= 0 || flow_cfm <= 0) {
    return {
      lift_in, flow_cfm,
      area_sqin: 0, velocity_fps: 0, flowFlux: 0, fvIndex_pct: 0,
    };
  }

  const vstd = calcVelStd(ctx.deltaP_inH2O, ctx.noInValves);

  // CalcWSCSArea at this lift
  const csInputs: CSAreaInputs = {
    seatDia: seatData.seatDia_in,
    seatPer: seatData.seatPer,
    vsAngle: seatData.vsAngle_deg,
    vsWidth: seatData.vsWidth_in,
    stemDia: seatData.stemDia_in,
    valveLift: lift_in,
  };
  const area = calcWSCSArea(csInputs, {
    valveDia: ctx.valveDia_in,
    noInValves: ctx.noInValves,
  });

  if (area <= 0) {
    return {
      lift_in, flow_cfm,
      area_sqin: 0, velocity_fps: 0, flowFlux: 0, fvIndex_pct: 0,
    };
  }

  // VB6 CalcFlowBench lines 2106-2112
  const flux = roundTrip(flow_cfm / area, 1);
  const vel = roundTrip(flux * 2.4, 1);
  const fvi = vstd > 0 ? roundTrip(100 * vel / vstd, 1) : 0;

  return {
    lift_in,
    flow_cfm,
    area_sqin: area,
    velocity_fps: vel,
    flowFlux: flux,
    fvIndex_pct: fvi,
  };
}

// ── Full Worksheet Calculation ───────────────────────────────────────

/**
 * Calculate the complete flowbench worksheet.
 * Computes derived values for all rows and the summary at max valve lift.
 *
 * @param liftPoints - Array of lift values (inches), up to 10
 * @param flowPoints - Array of flow values (CFM), same length as liftPoints
 * @param seatData - Valve seat geometry
 * @param ctx - Engine context
 * @returns Complete FlowBenchResult with rows and summary
 */
export function calcFlowBenchWorksheet(
  liftPoints: number[],
  flowPoints: number[],
  seatData: FlowBenchSeatData,
  ctx: FlowBenchContext,
): FlowBenchResult {
  // Calculate each row
  const rows: FlowBenchRow[] = [];
  const validLifts: number[] = [];
  const validFlows: number[] = [];

  const count = Math.min(liftPoints.length, flowPoints.length, MAX_FLOW_BENCH_ROWS);
  for (let i = 0; i < count; i++) {
    if (liftPoints[i] <= 0) break; // VB6: stop at first zero lift
    const row = calcFlowBenchRow(liftPoints[i], flowPoints[i], seatData, ctx);
    rows.push(row);
    validLifts.push(liftPoints[i]);
    validFlows.push(flowPoints[i]);
  }

  // Summary at max valve lift
  let summary: FlowBenchSummary = {
    flow_cfm: 0, csArea_sqin: 0, velocity_fps: 0, flowFlux: 0, fvIndex_pct: 0,
  };

  if (validLifts.length > 0 && ctx.maxValveLift_in > 0) {
    const vstd = calcVelStd(ctx.deltaP_inH2O, ctx.noInValves);

    // TABY interpolation for flow at max valve lift
    const flowAtMaxLift = taby(validLifts, validFlows, validLifts.length, 1, ctx.maxValveLift_in);

    // CalcCSArea at max valve lift
    const csInputs: CSAreaInputs = {
      seatDia: seatData.seatDia_in,
      seatPer: seatData.seatPer,
      vsAngle: seatData.vsAngle_deg,
      vsWidth: seatData.vsWidth_in,
      stemDia: seatData.stemDia_in,
      valveLift: ctx.maxValveLift_in,
    };
    const csArea = calcWSCSArea(csInputs, {
      valveDia: ctx.valveDia_in,
      noInValves: ctx.noInValves,
    });

    if (csArea > 0) {
      const flux = roundTrip(flowAtMaxLift / csArea, 1);
      const vel = roundTrip(flux * 2.4, 1);
      const fvi = vstd > 0 ? roundTrip(100 * vel / vstd, 1) : 0;

      summary = {
        flow_cfm: roundTrip(flowAtMaxLift, 0),
        csArea_sqin: csArea,
        velocity_fps: vel,
        flowFlux: flux,
        fvIndex_pct: fvi,
      };
    }
  }

  return { rows, summary };
}

// ── Validation ───────────────────────────────────────────────────────

/**
 * Validate that lift values are in ascending order with no gaps.
 * VB6 FlowB.frm txtIntLift_LostFocus lines 1630-1733
 */
export function validateLiftOrder(lifts: number[]): { valid: boolean; error?: string } {
  for (let i = 1; i < lifts.length; i++) {
    if (lifts[i] <= 0) break;
    if (lifts[i] <= lifts[i - 1]) {
      return { valid: false, error: `Lift values must be in ascending order (row ${i + 1})` };
    }
  }
  // Check for gaps
  let foundZero = false;
  for (let i = 0; i < lifts.length; i++) {
    if (lifts[i] <= 0) {
      foundZero = true;
    } else if (foundZero) {
      return { valid: false, error: `Blank rows are not allowed (row ${i + 1})` };
    }
  }
  return { valid: true };
}

/**
 * Find the last valid row index (0-based).
 * VB6 FlowB.frm FindLastRow lines 2313-2323
 */
export function findLastRow(lifts: number[]): number {
  let lastRow = -1;
  for (let i = 0; i < lifts.length; i++) {
    if (lifts[i] > 0) {
      lastRow = i;
    } else {
      break;
    }
  }
  return lastRow;
}

// ── Config Hydration Helpers ────────────────────────────────────────

/** Result of checking whether a config has valid saved flowbench data. */
export interface FlowBenchDataCheck {
  valid: boolean;
  /** Human-readable reason when invalid (for DEV diagnostics). */
  reason?: string;
}

/**
 * Detect whether a config object contains valid, user-entered flowbench data
 * that should be hydrated into the UI instead of generating defaults.
 *
 * Requirements (matching VB6 gc_IntLift/gc_IntFlow semantics):
 *   - Both arrays present and same length
 *   - At least 2 data points (VB6 requires ≥2 for TABY interpolation)
 *   - At most MAX_FLOW_BENCH_ROWS (10)
 *   - All active lifts > 0 and monotonically increasing
 *   - All active flows > 0
 *   - No all-zero placeholder arrays
 */
export function hasValidFlowBenchData(
  lifts: number[] | undefined,
  flows: number[] | undefined,
): FlowBenchDataCheck {
  if (!lifts || !flows) return { valid: false, reason: 'missing arrays' };
  if (lifts.length !== flows.length) return { valid: false, reason: `length mismatch: lifts=${lifts.length} flows=${flows.length}` };
  if (lifts.length < 2) return { valid: false, reason: `too few points: ${lifts.length}` };
  if (lifts.length > MAX_FLOW_BENCH_ROWS) return { valid: false, reason: `too many points: ${lifts.length}` };

  // Count active (non-zero) points
  let activeCount = 0;
  for (let i = 0; i < lifts.length; i++) {
    if (lifts[i] <= 0) break;
    activeCount++;
    if (flows[i] <= 0) return { valid: false, reason: `flow[${i}] <= 0` };
    if (i > 0 && lifts[i] <= lifts[i - 1]) return { valid: false, reason: `lifts not ascending at index ${i}` };
  }

  if (activeCount < 2) return { valid: false, reason: `only ${activeCount} active points` };
  return { valid: true };
}

/** Hydrated flowbench state ready to be applied to React state setters. */
export interface FlowBenchHydration {
  fbLifts: number[];
  fbFlows: number[];
  fbLiftTxt: string[];
  fbFlowTxt: string[];
}

/**
 * Build UI state arrays from saved config flowbench data.
 * Caller must have already validated with hasValidFlowBenchData().
 *
 * @param lifts  - config.flowBenchLifts_in (validated)
 * @param flows  - config.flowBenchFlows_cfm (validated)
 * @param formatLift - formatter for lift display text (e.g. vb6Lift)
 */
export function hydrateFlowBenchFromConfig(
  lifts: number[],
  flows: number[],
  formatLift: (v: number) => string,
): FlowBenchHydration {
  const lTxt = Array<string>(MAX_FLOW_BENCH_ROWS).fill('');
  const fTxt = Array<string>(MAX_FLOW_BENCH_ROWS).fill('');
  for (let i = 0; i < lifts.length && i < MAX_FLOW_BENCH_ROWS; i++) {
    if (lifts[i] <= 0) break;
    lTxt[i] = formatLift(lifts[i]);
    fTxt[i] = String(flows[i]);
  }
  return {
    fbLifts: lifts.slice(0, MAX_FLOW_BENCH_ROWS),
    fbFlows: flows.slice(0, MAX_FLOW_BENCH_ROWS),
    fbLiftTxt: lTxt,
    fbFlowTxt: fTxt,
  };
}

/**
 * Normalize flowbench arrays for persistent storage.
 *
 * Canonical stored form: **active-only** — trailing zeros are trimmed.
 * On load, `hasValidFlowBenchData` accepts both full-length (with trailing
 * zeros) and active-only forms, so this is forward- and backward-compatible.
 *
 * Returns `{ lifts, flows }` trimmed to active points, or `undefined` for
 * both if there are fewer than 2 active points (nothing worth persisting).
 */
export function normalizeFlowBenchForStorage(
  lifts: number[] | undefined,
  flows: number[] | undefined,
): { lifts: number[]; flows: number[] } | undefined {
  if (!lifts || !flows) return undefined;

  // Find last active index (lift > 0)
  let lastActive = -1;
  for (let i = 0; i < lifts.length && i < MAX_FLOW_BENCH_ROWS; i++) {
    if (lifts[i] > 0) lastActive = i;
    else break;
  }

  if (lastActive < 1) return undefined; // need ≥2 active points

  const trimmedLifts = lifts.slice(0, lastActive + 1);
  const trimmedFlows = flows.slice(0, lastActive + 1);
  return { lifts: trimmedLifts, flows: trimmedFlows };
}
