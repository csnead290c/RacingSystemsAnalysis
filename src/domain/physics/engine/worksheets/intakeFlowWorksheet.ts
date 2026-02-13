/**
 * Intake Flow Worksheet — combines two VB6 sub-forms:
 *
 *   1. CSAREA.FRM (frmCSArea) — "Minimum Cross-section Area Worksheet"
 *      Inputs: seatDia, seatPer, vsAngle, vsWidth, stemDia, valveLift
 *      Output: wsCSArea (valve seat throat area)
 *      Calc:   CalcWSCSArea (ENGPERF.BAS lines 1262-1310)
 *
 *   2. MAXFLOW.FRM (frmMaxFlow) — "Intake Port Flow Worksheet"
 *      Inputs: csArea, flowVel, flowFlux, fvIndex
 *      Output: maxInFlow (maximum intake port flow CFM)
 *      Calc:   CalcFlowStuff (ENGPERF.BAS lines 1161-1176)
 *
 * Supporting routines (ENGPERF.BAS):
 *   - EstSeatDia (lines 1223-1253): back-calculate seatDia from csArea
 *   - CalcSeatPer (lines 1203-1221): seatPer = 100 * seatDia / valveDia
 *   - CalcSeatDia (lines 1178-1201): seatDia = valveDia * seatPer / 100
 *   - SetVSWidth (lines 1312-1333): dynamic vsWidth min/max
 *   - CalcVelStd (lines 632-655): VSTD from Darcy formula
 *
 * Constants (DECLARES.BAS):
 *   PI=3.141593, PSIA=14.696, PSTD=406.78, RHOair=0.07634, GC=32.174
 *
 * All calculations assume inch inputs. VB6 supports mm toggle for seatDia
 * and stemDia; TS is inch-only. Documented in VB6_UI_COVERAGE.md.
 */

const PI = 3.141593; // VB6 constant, NOT Math.PI
const PSIA = 14.696;
const PSTD = 406.78;
const RHOair = 0.07634;
const GC = 32.174;

// ---------------------------------------------------------------------------
// Constraint constants (from SetAllValues)
// ---------------------------------------------------------------------------

/** gc_SeatPer: min=75, max=100 (DecimalPlaces_In=1) */
export const SEAT_PER_MIN = 75;
export const SEAT_PER_MAX = 100;

/** gc_VSAngle: min=30, max=60 (DecimalPlaces_In=1) */
export const VS_ANGLE_MIN = 30;
export const VS_ANGLE_MAX = 60;

/** gc_FVIndex: min=50, max=101 (DecimalPlaces_In=1) */
export const FV_INDEX_MIN = 50;
export const FV_INDEX_MAX = 101;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Inputs for the Minimum Cross-section Area sub-worksheet (CSAREA.FRM) */
export interface CSAreaInputs {
  /** Valve seat throat diameter in inches (VB6 gc_SeatDia, DecimalPlaces_In=3) */
  seatDia: number;
  /** Valve seat throat percentage (VB6 gc_SeatPer, min=75 max=100, DecimalPlaces_In=1) */
  seatPer: number;
  /** Valve seat angle in degrees (VB6 gc_VSAngle, min=30 max=60, DecimalPlaces_In=1) */
  vsAngle: number;
  /** Valve seat width in inches (VB6 gc_VSWidth, DecimalPlaces_In=3) */
  vsWidth: number;
  /** Valve stem diameter in inches (VB6 gc_StemDia, DecimalPlaces_In=3) */
  stemDia: number;
  /** Maximum intake valve lift in inches (VB6 gc_ValveLift, DecimalPlaces_In=3) */
  valveLift: number;
}

/** Inputs for the Intake Port Flow sub-worksheet (MAXFLOW.FRM) */
export interface FlowInputs {
  /** Minimum cross-section area in sq inches (VB6 gc_CSArea, DecimalPlaces_In=3) */
  csArea: number;
  /** Intake flow velocity in ft/sec (VB6 gc_FlowVel, DecimalPlaces_In=1) */
  flowVel: number;
  /** Intake flow flux in CFM/sq in (VB6 gc_FlowFlux, DecimalPlaces_In=1) */
  flowFlux: number;
  /** Flow velocity index in % (VB6 gc_FVIndex, min=50 max=101, DecimalPlaces_In=1) */
  fvIndex: number;
}

/** Engine context values needed by the worksheet (read from main form state) */
export interface EngineContext {
  /** Intake valve diameter in inches (VB6 gc_ValveDia) */
  valveDia: number;
  /** Number of intake valves per cylinder (VB6 gc_NoInValves) */
  noInValves: number;
  /** Flowbench test pressure in inches H2O (VB6 gc_DeltaP) */
  deltaP: number;
  /** Maximum intake port flow in CFM (VB6 gc_MaxInFlow) */
  maxInFlow: number;
}

/** Combined worksheet state */
export interface IntakeFlowWorksheetState {
  csAreaInputs: CSAreaInputs;
  flowInputs: FlowInputs;
}

/** Outputs from the CS Area sub-worksheet */
export interface CSAreaResult {
  /** Calculated minimum cross-section area in sq inches (VB6 gc_WSCSArea) */
  wsCSArea: number;
}

/** Outputs from the Flow sub-worksheet */
export interface FlowResult {
  /** Flow flux in CFM/sq in (VB6 gc_FlowFlux) */
  flowFlux: number;
  /** Flow velocity in ft/sec (VB6 gc_FlowVel) */
  flowVel: number;
  /** Flow velocity index in % (VB6 gc_FVIndex) */
  fvIndex: number;
  /** Maximum intake port flow in CFM (VB6 gc_MaxInFlow) */
  maxInFlow: number;
}

// ---------------------------------------------------------------------------
// Defaults (VB6 SetAllValues lines 2263-2268)
// ---------------------------------------------------------------------------

export const CS_AREA_DEFAULTS: CSAreaInputs = {
  seatDia: 1.794,
  seatPer: 87.5,     // computed: 100 * 1.794 / 2.05 ≈ 87.5
  vsAngle: 45,
  vsWidth: 0.08,
  stemDia: 0.344,
  valveLift: 0.55,
};

export const FLOW_DEFAULTS: FlowInputs = {
  csArea: 2.4,
  flowVel: 0,     // computed from CalcFlowStuff
  flowFlux: 0,    // computed from CalcFlowStuff
  fvIndex: 0,     // computed from CalcFlowStuff
};

// ---------------------------------------------------------------------------
// Parsing (VB6: val(txtX.Text) — blank/spaces → 0, non-numeric → 0)
// ---------------------------------------------------------------------------

export function parseWSInput(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format to N decimal places (VB6 round-trip: .Value = val(.Formatted)) */
function roundTrip(value: number, dp: number): number {
  return Number(value.toFixed(dp));
}

/** Format dimension: 3 decimal places (seatDia, vsWidth, stemDia, valveLift, csArea, wsCSArea) */
export function formatDim3(value: number): string {
  return value.toFixed(3);
}

/** Format percentage/angle/velocity: 1 decimal place (seatPer, vsAngle, flowVel, flowFlux, fvIndex, maxInFlow) */
export function formatDec1(value: number): string {
  return value.toFixed(1);
}

// ---------------------------------------------------------------------------
// Clamping helpers
// ---------------------------------------------------------------------------

export function clampSeatPer(value: number): number {
  return Math.max(SEAT_PER_MIN, Math.min(SEAT_PER_MAX, value));
}

export function clampVSAngle(value: number): number {
  return Math.max(VS_ANGLE_MIN, Math.min(VS_ANGLE_MAX, value));
}

export function clampFVIndex(value: number): number {
  return Math.max(FV_INDEX_MIN, Math.min(FV_INDEX_MAX, value));
}

// ---------------------------------------------------------------------------
// VB6 CalcVelStd (ENGPERF.BAS lines 632-655)
// Darcy formula for standard velocity
// ---------------------------------------------------------------------------

function yFactor(deltaP: number): number {
  // .618 Y factor slope coefficient from Crane: pg A-22 for K = 2 line
  // 1.044429 results in YFactor == 1 @ 28" H2O
  return 1.044429 * (1 - 0.618 * deltaP / PSTD);
}

export function calcVelStd(deltaP: number, noInValves: number): number {
  const vel = Math.sqrt((deltaP / PSTD) * 144 * PSIA * 2 * GC / RHOair);
  const yf = yFactor(deltaP);
  if (noInValves === 1) {
    // constant results in VSTD = 319.2 (133 cfm/in^2) @ 28" H2O
    return 0.910944 * vel / yf;
  } else {
    // constant results in VSTD = 328.8 (137 cfm/in^2) @ 28" H2O
    return 0.938341 * vel / yf;
  }
}

// ---------------------------------------------------------------------------
// VB6 CalcWSCSArea (ENGPERF.BAS lines 1262-1310)
// Three flow regimes: low-lift seat, moderate-lift curtain, high-lift throat
// ---------------------------------------------------------------------------

export function calcWSCSArea(
  inputs: CSAreaInputs,
  ctx: Pick<EngineContext, 'valveDia' | 'noInValves'>,
): number {
  const vd = ctx.valveDia;   // valve diameter (inches)
  const vsd = inputs.seatDia; // seat throat diameter (inches)
  const vstmd = inputs.stemDia; // stem diameter (inches)
  const vl = inputs.valveLift;
  const niv = ctx.noInValves;

  // calculate trig functions for valve seat angle
  const vsa = inputs.vsAngle * PI / 180;
  const sinb = Math.sin(vsa);
  const cosb = Math.cos(vsa);
  const tanb = Math.tan(vsa);

  // convert input valve seat width to Heywood definition for calculations
  const w = inputs.vsWidth * cosb;

  // very low lift - where valve seat really controls
  const a1 = niv * PI * (vl * cosb) * (vd - 2 * w + vl * sinb * cosb);

  // valve curtain area - moderate valve lift
  let h = Math.sqrt((vl - w * tanb) ** 2 + w ** 2);
  if (vl === 0) h = 0;
  const a2 = niv * PI * (vd - w) * h;

  // valve throat area - high valve lift
  const a3 = niv * PI * (vsd ** 2 - vstmd ** 2) / 4;

  // now choose the controlling flow area
  let work: number;
  if (vl < w / (sinb * cosb)) {
    work = a1;
  } else {
    work = a2;
    if (a3 < work) work = a3;
  }

  // VB6 round-trip: .Value = work : .Value = val(.Formatted)
  // gc_WSCSArea DecimalPlaces_In = 3
  return roundTrip(Math.max(work, 0), 3);
}

// ---------------------------------------------------------------------------
// VB6 CalcFlowStuff (ENGPERF.BAS lines 1161-1176)
// Computes flowFlux, flowVel, fvIndex from maxInFlow and csArea
// ---------------------------------------------------------------------------

export function calcFlowStuff(
  maxInFlow: number,
  csArea: number,
  vstd: number,
): FlowResult {
  if (csArea <= 0) {
    return { flowFlux: 0, flowVel: 0, fvIndex: 0, maxInFlow };
  }

  // VB6: gc_FlowFlux.Value = FlowVal / gc_CSArea.Value
  const flowFlux = roundTrip(maxInFlow / csArea, 1);

  // VB6: gc_FlowVel.Value = 2.4 * (FlowVal / gc_CSArea.Value)
  const flowVel = roundTrip(2.4 * (maxInFlow / csArea), 1);

  // VB6: gc_FVIndex.Value = 100 * (2.4 * FlowVal / gc_CSArea.Value) / VSTD
  const fvIndex = vstd > 0 ? roundTrip(100 * (2.4 * maxInFlow / csArea) / vstd, 1) : 0;

  return { flowFlux, flowVel, fvIndex, maxInFlow };
}

// ---------------------------------------------------------------------------
// VB6 CalcSeatPer (ENGPERF.BAS lines 1203-1221)
// seatPer = 100 * seatDia / valveDia (inch-only path)
// ---------------------------------------------------------------------------

export function calcSeatPer(seatDia: number, valveDia: number): number {
  if (valveDia <= 0) return 0;
  return roundTrip(100 * seatDia / valveDia, 1);
}

// ---------------------------------------------------------------------------
// VB6 CalcSeatDia (ENGPERF.BAS lines 1178-1201)
// seatDia = valveDia * seatPer / 100 (inch-only path)
// ---------------------------------------------------------------------------

export function calcSeatDia(seatPer: number, valveDia: number): number {
  if (seatPer === 0) return 0;
  return roundTrip(valveDia * seatPer / 100, 3);
}

// ---------------------------------------------------------------------------
// VB6 EstSeatDia (ENGPERF.BAS lines 1223-1253)
// Back-calculate seatDia from csArea:
//   vsd = sqrt(4 * csArea / noInValves / PI + stemDia^2)
// ---------------------------------------------------------------------------

export function estSeatDia(
  csArea: number,
  noInValves: number,
  stemDia: number,
): number {
  const niv = Math.max(noInValves, 1);
  const vsd = Math.sqrt(4 * csArea / niv / PI + stemDia ** 2);
  return roundTrip(Math.max(vsd, 0), 3);
}

// ---------------------------------------------------------------------------
// VB6 SetVSWidth (ENGPERF.BAS lines 1312-1333) — dynamic min/max
// ---------------------------------------------------------------------------

export function computeVSWidthLimits(
  valveDia: number,
  seatDia: number,
): { min: number; max: number } {
  // max = 0.75 * ((vd - vsd) / 2) / cos(VSAngle.max * PI / 180)
  let max = 0.75 * ((valveDia - seatDia) / 2) / Math.cos(VS_ANGLE_MAX * PI / 180);
  if (max <= 0.02) max = 0.02;

  // min = 0.01 * vd / cos(VSAngle.min * PI / 180)
  let min = 0.01 * valveDia / Math.cos(VS_ANGLE_MIN * PI / 180);
  if (min >= max) min = max - 0.05;
  if (min < 0) min = 0;

  return { min: roundTrip(min, 3), max: roundTrip(max, 3) };
}

// ---------------------------------------------------------------------------
// VB6 CalcFromFlowVel / CalcFromFlowFlux / CalcFromFVIndex (MAXFLOW.FRM)
// These allow the user to edit flowVel, flowFlux, or fvIndex and have the
// others recompute. Each also calls SetVals to recompute maxInFlow.
// ---------------------------------------------------------------------------

/**
 * VB6 CalcFromFlowVel (MAXFLOW.FRM lines 394-402)
 * Given flowVel, compute fvIndex and flowFlux, then maxInFlow.
 */
export function calcFromFlowVel(
  flowVel: number,
  csArea: number,
  vstd: number,
): FlowResult {
  const fvIndex = vstd > 0 ? roundTrip(100 * flowVel / vstd, 1) : 0;
  const flowFlux = roundTrip(flowVel / 2.4, 1);
  const maxInFlow = roundTrip(csArea * flowFlux, 1);
  return { flowFlux, flowVel: roundTrip(flowVel, 1), fvIndex, maxInFlow };
}

/**
 * VB6 CalcFromFlowFlux (MAXFLOW.FRM lines 404-412)
 * Given flowFlux, compute flowVel and fvIndex, then maxInFlow.
 */
export function calcFromFlowFlux(
  flowFlux: number,
  csArea: number,
  vstd: number,
): FlowResult {
  const flowVel = roundTrip(flowFlux * 2.4, 1);
  const fvIndex = vstd > 0 ? roundTrip(100 * flowVel / vstd, 1) : 0;
  const maxInFlow = roundTrip(csArea * flowFlux, 1);
  return { flowFlux: roundTrip(flowFlux, 1), flowVel, fvIndex, maxInFlow };
}

/**
 * VB6 CalcFromFVIndex (MAXFLOW.FRM lines 414-422)
 * Given fvIndex, compute flowVel and flowFlux, then maxInFlow.
 */
export function calcFromFVIndex(
  fvIndex: number,
  csArea: number,
  vstd: number,
): FlowResult {
  const flowVel = roundTrip(vstd * fvIndex / 100, 1);
  const flowFlux = roundTrip(flowVel / 2.4, 1);
  const maxInFlow = roundTrip(csArea * flowFlux, 1);
  return { flowFlux, flowVel, fvIndex: roundTrip(fvIndex, 1), maxInFlow };
}
