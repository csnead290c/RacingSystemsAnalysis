/**
 * Engine Constraint System — VB6 cValue semantics
 *
 * Ports: ECommon/Cvalue.CLS (Value, Formatted, ValFmt)
 *        ECommon/ENGPERF.BAS SetMinMax, SetStroke, SetRod, SetRefBore,
 *        SetNIV, SetValveDia, TestValveDia, CalcVelStd, SetFlowVel,
 *        SetFlowFlux, SetMaxInFlow, TestMaxInFlow, SetCSArea,
 *        SetCarbCFM, SetValveLift, SetSeatDia, SetStemDia, SetVSWidth
 *        ECommon/ENGPERF.BAS SetAllValues (baseline)
 *
 * All paths repo-relative from RSA project root.
 */

// ---------------------------------------------------------------------------
// FieldKey — constrained engine input fields
// ---------------------------------------------------------------------------

export type FieldKey =
  | 'bore' | 'stroke' | 'rod' | 'refBore' | 'noInValves' | 'valveDia'
  | 'maxInFlow' | 'deltaP' | 'csArea'
  | 'carbCFM' | 'valveLift' | 'seatDia' | 'stemDia' | 'vsWidth';

// ---------------------------------------------------------------------------
// FieldConstraint — cValue subset
// ---------------------------------------------------------------------------

export interface FieldConstraint {
  key: FieldKey;
  value: number;
  minVal: number;
  maxVal: number;
  decimalPlaces: number;
  allowDecimals: boolean;
  allowNegative: boolean;
  inches: boolean;
  allowMM: boolean;
  isCalc: boolean;
  isChanged: boolean;
  isError: boolean;
  statusMsg?: string;
}

// ---------------------------------------------------------------------------
// vb6Val — mimic VB6 Val() behavior (simplified, deterministic)
// ---------------------------------------------------------------------------

export function vb6Val(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // VB6 Val() parses leading numeric portion only
  const match = trimmed.match(/^[+-]?(\d+(\.\d*)?|\.\d+)/);
  if (!match) return 0;
  return parseFloat(match[0]);
}

// ---------------------------------------------------------------------------
// applyMinMax — VB6 SetMinMax (baseline rounding only)
// ---------------------------------------------------------------------------

export function applyMinMax(f: FieldConstraint): FieldConstraint {
  const next = { ...f };
  const factor = Math.pow(10, next.decimalPlaces);

  next.minVal = Math.round(next.minVal * factor) / factor;
  next.maxVal = Math.round(next.maxVal * factor) / factor;

  if (next.minVal > next.maxVal) {
    next.maxVal = next.minVal;
  }

  return next;
}

// ---------------------------------------------------------------------------
// valFmt — VB6 ValFmt
// ---------------------------------------------------------------------------

export function valFmt(f: FieldConstraint): string {
  let fmt = '0';
  if (f.allowDecimals && f.decimalPlaces > 0) {
    fmt = '#.' + '0'.repeat(f.decimalPlaces);
  }
  if (f.allowNegative) {
    fmt = fmt + ';-' + fmt;
  }
  return fmt;
}

// ---------------------------------------------------------------------------
// formatValue — VB6 Formatted
// ---------------------------------------------------------------------------

export function formatValue(f: FieldConstraint): string {
  const factor = Math.pow(10, f.decimalPlaces);
  const rounded = Math.round(f.value * factor) / factor;

  if (!f.allowDecimals || f.decimalPlaces <= 0) {
    return Math.round(rounded).toString();
  }

  return rounded.toFixed(f.decimalPlaces);
}

// ---------------------------------------------------------------------------
// setValue — VB6 Property Let Value semantics
// ---------------------------------------------------------------------------

export function setValue(f: FieldConstraint, newValue: number): FieldConstraint {
  const next = { ...f };
  next.isChanged = false;

  if (isNaN(newValue)) {
    newValue = 0;
  }

  if (newValue !== next.value) {
    next.isChanged = true;
    next.isError = false;

    if (newValue < next.minVal || newValue > next.maxVal) {
      next.isError = true;

      if (!next.isCalc) {
        newValue = newValue < next.minVal ? next.minVal : next.maxVal;
      }
    }

    next.value = newValue;
  }

  next.isCalc = false;
  return next;
}

// ---------------------------------------------------------------------------
// initAllFieldConstraints — baseline SetAllValues
// ---------------------------------------------------------------------------

export function initAllFieldConstraints(): Record<FieldKey, FieldConstraint> {
  const bore = applyMinMax({
    key: 'bore',
    value: 4.03,
    minVal: 1.25,   // VB6 SetAllValues: MinVal_In = 1.25
    maxVal: 6.0,    // VB6 SetAllValues: MaxVal_In = 6
    decimalPlaces: 2,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  const stroke = applyMinMax({
    key: 'stroke',
    value: 3.48,
    minVal: 0.5,
    maxVal: 10.0,
    decimalPlaces: 2,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  const rod = applyMinMax({
    key: 'rod',
    value: 5.85,
    minVal: 1.0,
    maxVal: 11.5,
    decimalPlaces: 2,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_RefBore — dynamic limits from SetRefBore (bore ±5%)
  const refBore = applyMinMax({
    key: 'refBore',
    value: 4.0,
    minVal: 1.0,    // broad baseline; recomputed dynamically
    maxVal: 7.0,
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_NoInValves — max dynamic from SetNIV (camType)
  const noInValves = applyMinMax({
    key: 'noInValves',
    value: 1,
    minVal: 1,
    maxVal: 3,      // broad baseline; recomputed from camType
    decimalPlaces: 0,
    allowDecimals: false,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_ValveDia — dynamic limits from SetValveDia (bore, niv)
  const valveDia = applyMinMax({
    key: 'valveDia',
    value: 2.05,
    minVal: 0.5,    // broad baseline; recomputed dynamically
    maxVal: 3.5,
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_MaxInFlow — dynamic limits from SetMaxInFlow
  const maxInFlow = applyMinMax({
    key: 'maxInFlow',
    value: 250,
    minVal: 10,     // broad baseline; recomputed from flow chain
    maxVal: 600,
    decimalPlaces: 1,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_DeltaP — static limits
  const deltaP = applyMinMax({
    key: 'deltaP',
    value: 28,
    minVal: 10,     // VB6 SetAllValues: MinVal_In = 10
    maxVal: 75,     // VB6 SetAllValues: MaxVal_In = 75
    decimalPlaces: 1,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_CSArea — internal (not user-editable in Engine Sim UI)
  // Dynamic limits from SetCSArea (maxInFlow, valveDia, niv, flowFlux)
  const csArea = applyMinMax({
    key: 'csArea',
    value: 0,       // computed; not a user input
    minVal: 0,
    maxVal: 10,     // broad baseline; recomputed dynamically
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: true,   // always calc’d, never user-entered
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_CarbCFM — dynamic limits from SetCarbCFM (bore, stroke, noCyl, manifold)
  const carbCFM = applyMinMax({
    key: 'carbCFM',
    value: 750,
    minVal: 10,     // broad baseline; recomputed dynamically
    maxVal: 2000,
    decimalPlaces: 0,
    allowDecimals: false,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_ValveLift — dynamic limits from SetValveLift (valveDia, camType)
  // DecimalPlaces_In = 3
  const valveLift = applyMinMax({
    key: 'valveLift',
    value: 0.5,
    minVal: 0.1,    // broad baseline; recomputed dynamically
    maxVal: 1.0,
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_SeatDia — dynamic limits from SetSeatDia (valveDia, seatPer)
  // DecimalPlaces_In = 3
  const seatDia = applyMinMax({
    key: 'seatDia',
    value: 1.8,
    minVal: 0.5,    // broad baseline; recomputed dynamically
    maxVal: 3.0,
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_StemDia — dynamic limits from SetStemDia (valveDia)
  // DecimalPlaces_In = 3
  const stemDia = applyMinMax({
    key: 'stemDia',
    value: 0.342,
    minVal: 0.1,    // broad baseline; min not explicitly set in VB6
    maxVal: 0.5,    // recomputed: 0.22 * valveDia
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: true,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  // VB6 SetAllValues: gc_VSWidth — dynamic limits from SetVSWidth (valveDia, seatDia, vsAngle)
  // DecimalPlaces_In = 3
  const vsWidth = applyMinMax({
    key: 'vsWidth',
    value: 0.08,
    minVal: 0,      // broad baseline; recomputed dynamically
    maxVal: 0.2,
    decimalPlaces: 3,
    allowDecimals: true,
    allowNegative: false,
    inches: true,
    allowMM: false,
    isCalc: false,
    isChanged: false,
    isError: false,
  });

  return {
    bore, stroke, rod, refBore, noInValves, valveDia,
    maxInFlow, deltaP, csArea,
    carbCFM, valveLift, seatDia, stemDia, vsWidth,
  };
}

export function updateField(
  map: Record<FieldKey, FieldConstraint>,
  key: FieldKey,
  next: FieldConstraint,
): Record<FieldKey, FieldConstraint> {
  return { ...map, [key]: next };
}

// ---------------------------------------------------------------------------
// Dynamic constraint computations — VB6 SetStroke / SetRod
// ---------------------------------------------------------------------------

/**
 * VB6 SetStroke (ENGPERF.BAS lines 1335-1372)
 *
 * Stroke limits depend on bore (bore/stroke ratio) and rod (rod/stroke ratio):
 *   bore/stroke ratio: 0.6 to 2.1  =>  stroke in [bore/2.1, bore/0.6]
 *   rod/stroke ratio:  1.25 to 4.0  =>  stroke in [rod/4, rod/1.25]
 * Final limits = intersection of both ranges.
 */
export function computeStrokeMinMax(args: { bore: number; rod: number }): { min: number; max: number } {
  const { bore, rod } = args;

  const minFromBore = bore / 2.1;
  const maxFromBore = bore / 0.6;
  const minFromRod = rod / 4.0;
  const maxFromRod = rod / 1.25;

  return {
    min: Math.max(minFromBore, minFromRod),
    max: Math.min(maxFromBore, maxFromRod),
  };
}

/**
 * VB6 SetRod (ENGPERF.BAS lines 1374-1393)
 *
 * Rod limits depend on stroke:
 *   min = stroke * 1.25
 *   max = min(stroke * 3.6, 11.5)
 */
export function computeRodMinMax(args: { stroke: number }): { min: number; max: number } {
  const { stroke } = args;
  return {
    min: stroke * 1.25,
    max: Math.min(stroke * 3.6, 11.5),
  };
}

/**
 * VB6 SetRefBore (ENGPERF.BAS lines 1470-1486)
 *
 * RefBore limits = bore ± 5%.
 */
export function computeRefBoreMinMax(args: { bore: number }): { min: number; max: number } {
  return {
    min: args.bore * 0.95,
    max: args.bore * 1.05,
  };
}

/**
 * VB6 SetNIV (ENGPERF.BAS lines 1453-1468)
 *
 * Max intake valves per cylinder depends on camType:
 *   camType 0 (OHC)              -> max 3
 *   camType 1 (Roller)           -> max 2
 *   camType 2..6 (all others)    -> max 1
 *
 * Mapping from TS camshaftType string to VB6 numeric camType:
 *   'overhead_cam'           -> 0  (OHC)
 *   'roller'                 -> 1  (Roller)
 *   'mushroom_tappet'        -> 2
 *   'high_rate_flat_tappet'  -> 3
 *   'normal_flat_tappet'     -> 4
 *   'hydraulic_roller'       -> 5
 *   'hydraulic_flat_tappet'  -> 6
 * Source: CAM_TYPE_MAP in src/pages/EngineSim.tsx
 */
export function computeNIVMax(args: { camType: number }): number {
  if (args.camType === 0) return 3;  // OHC
  if (args.camType === 1) return 2;  // Roller
  return 1;                          // all others
}

/**
 * VB6 SetValveDia (ENGPERF.BAS lines 1556-1571)
 *
 * Valve diameter limits from bore and number of intake valves:
 *   min = sqrt(0.16 * bore^2 / niv)
 *   max = sqrt(0.32 * bore^2 / niv)
 */
export function computeValveDiaMinMax(args: { bore: number; noInValves: number }): { min: number; max: number } {
  const { bore, noInValves } = args;
  const niv = Math.max(noInValves, 1); // guard against 0
  return {
    min: Math.sqrt(0.16 * bore * bore / niv),
    max: Math.sqrt(0.32 * bore * bore / niv),
  };
}

// ---------------------------------------------------------------------------
// VB6 flow chain constants (from DECLARES.BAS)
// ---------------------------------------------------------------------------

const PI = 3.141593;
const PSIA = 14.696;
const PSTD = 406.78;
const RHOair = 0.07634;
const GC = 32.174;

// VB6 gc_FVIndex baseline limits (from SetAllValues)
const FVINDEX_MIN = 50;
const FVINDEX_MAX = 101;

// ---------------------------------------------------------------------------
// VB6 flow chain compute functions
// ---------------------------------------------------------------------------

/**
 * VB6 YFactor (ENGPERF.BAS lines 657-661)
 * .618 Y factor slope coefficient from Crane: pg A-22 for K = 2 line
 * 1.044429 results in YFactor == 1 @ 28" H2O
 */
function yFactor(deltaP: number): number {
  return 1.044429 * (1 - 0.618 * deltaP / PSTD);
}

/**
 * VB6 CalcVelStd (ENGPERF.BAS lines 632-655)
 * Darcy formula: vel = sqrt((deltaP/PSTD) * 144 * PSIA * 2 * GC / RHOair)
 * Then VSTD = factor * vel / YFactor
 *   factor = 0.910944 for niv=1, 0.938341 for niv>1
 */
export function calcVelStd(deltaP: number, noInValves: number): number {
  const vel = Math.sqrt((deltaP / PSTD) * 144 * PSIA * 2 * GC / RHOair);
  const yf = yFactor(deltaP);
  if (noInValves === 1) {
    return 0.910944 * vel / yf;
  } else {
    return 0.938341 * vel / yf;
  }
}

/**
 * VB6 SetFlowVel + SetFlowFlux (ENGPERF.BAS lines 1631-1643)
 * FlowVel min/max = VSTD * FVIndex.min/max / 100
 * FlowFlux min/max = FlowVel.min/max / 2.4
 *
 * Returns FlowFlux min/max (the values SetMaxInFlow actually needs).
 */
function computeFlowFluxMinMax(vstd: number): { min: number; max: number } {
  const flowVelMin = vstd * FVINDEX_MIN / 100;
  const flowVelMax = vstd * FVINDEX_MAX / 100;
  return {
    min: flowVelMin / 2.4,
    max: flowVelMax / 2.4,
  };
}

/**
 * VB6 RoundDown/RoundUp helpers used by SetMaxInFlow.
 * RoundDown(x, r) = floor(x / r) * r
 * RoundUp(x, r) = ceil(x / r) * r
 */
function roundDown(x: number, r: number): number {
  return Math.floor(x / r) * r;
}
function roundUp(x: number, r: number): number {
  return Math.ceil(x / r) * r;
}

/**
 * VB6 SetMaxInFlow (ENGPERF.BAS lines 1421-1444)
 *
 * Const VSW = 0.925, VSTM = 0.022
 * area = niv * (PI/4) * vd^2 * (VSW^2 - VSTM)
 * min = RoundDown(area * FlowFlux.min, 1)
 * max = RoundUp(area * FlowFlux.max, 1)
 */
export function computeMaxInFlowMinMax(args: {
  valveDia: number;
  noInValves: number;
  deltaP: number;
}): { min: number; max: number } {
  const VSW = 0.925;
  const VSTM = 0.022;
  const { valveDia, noInValves, deltaP } = args;
  const niv = Math.max(noInValves, 1);

  const area = niv * (PI / 4) * valveDia * valveDia * (VSW * VSW - VSTM);
  const vstd = calcVelStd(deltaP, niv);
  const flux = computeFlowFluxMinMax(vstd);

  return {
    min: roundDown(area * flux.min, 1),
    max: roundUp(area * flux.max, 1),
  };
}

/**
 * VB6 SetCSArea (ENGPERF.BAS lines 1612-1629)
 *
 * Const VSW = 0.98, VSTM = 0.022
 * min = maxInFlow / FlowFlux.max
 * max = niv * (PI/4) * vd^2 * (VSW^2 - VSTM)
 * If max < min Then max = niv * (PI/4) * valveDia.MaxVal^2 * (VSW^2 - VSTM)
 * If max < min Then max = min
 */
export function computeCSAreaMinMax(args: {
  maxInFlow: number;
  valveDia: number;
  valveDiaMax: number;
  noInValves: number;
  deltaP: number;
}): { min: number; max: number } {
  const VSW_CSA = 0.98;
  const VSTM = 0.022;
  const { maxInFlow, valveDia, valveDiaMax, noInValves, deltaP } = args;
  const niv = Math.max(noInValves, 1);

  const vstd = calcVelStd(deltaP, niv);
  const flux = computeFlowFluxMinMax(vstd);

  const min = maxInFlow / flux.max;
  let max = niv * (PI / 4) * valveDia * valveDia * (VSW_CSA * VSW_CSA - VSTM);

  if (max < min) {
    max = niv * (PI / 4) * valveDiaMax * valveDiaMax * (VSW_CSA * VSW_CSA - VSTM);
    if (max < min) max = min;
  }

  return { min, max };
}

// ---------------------------------------------------------------------------
// VB6 CalcGulp (ENGPERF.BAS lines 532-581)
// Manifold gulp factor by manifold type and number of cylinders.
// manifoldType: 1=plenum, 2=IR, 3=dual_plane_divided, 4=dual_plane_slot
// ---------------------------------------------------------------------------

const GULP_PLENUM = [0, 2.5, 1.721, 1.384, 1.186, 1.052, 1.009, 1, 1, 1, 1, 1, 1]; // index=noCyl
const GULP_DIVIDED = [0, 2.5, 2.5, 2.008, 1.721, 1.526, 1.384, 1.274, 1.186, 1.113, 1.052, 1.028, 1.009];
const GULP_SLOT = [0, 2.5, 2.008, 1.721, 1.526, 1.384, 1.274, 1.186, 1.113, 1.052, 1.028, 1.009, 1.009];

export function calcGulp(manifoldType: number, noCyl: number): number {
  const c = Math.max(1, Math.min(12, Math.round(noCyl)));
  switch (manifoldType) {
    case 1: return GULP_PLENUM[c] ?? 1;
    case 2: return 2.5; // IR
    case 3: return GULP_DIVIDED[c] ?? 1.009;
    case 4: return GULP_SLOT[c] ?? 1.009;
    default: return 1;
  }
}

/**
 * VB6 SetCarbCFM (ENGPERF.BAS lines 1395-1419)
 *
 * cfd = noCyl * (PI * bore^2 / 4) * stroke / 1728
 * RPM = 6150 / (2 * stroke / 12)
 * Gulp = CalcGulp(manifold, noCyl)
 * max = 1.414 * Gulp * 1.3 * (RPM / 2) * cfd
 * round up to nearest 20 (if <=1000) or 100
 * min = 0.05 * max, rounded up to nearest 4 or 20
 */
export function computeCarbCFMMinMax(args: {
  bore: number; stroke: number; noCyl: number; manifoldType: number;
}): { min: number; max: number } {
  const { bore, stroke, noCyl, manifoldType } = args;
  const cfd = noCyl * (PI * bore * bore / 4) * stroke / 1728;
  const RPM = 6150 / (2 * stroke / 12);
  const gulp = calcGulp(manifoldType, noCyl);

  let maxVal = 1.414 * gulp * 1.3 * (RPM / 2) * cfd;
  const r1 = maxVal <= 1000 ? 20 : 100;
  maxVal = roundUp(maxVal, r1);

  let minVal = 0.05 * maxVal;
  minVal = roundUp(minVal, r1 / 5);

  return { min: minVal, max: maxVal };
}

/**
 * VB6 SetValveLift (ENGPERF.BAS lines 1580-1610)
 *
 * min = Round(valveDia * 0.19, 0.01)
 * max = Round(valveDia * 0.45, 0.01)
 * If camType == 0 (OHC) Then max = Round(valveDia * 0.5, 0.01)
 */
export function computeValveLiftMinMax(args: { valveDia: number; camType: number }): { min: number; max: number } {
  const { valveDia, camType } = args;
  const min = Math.round(valveDia * 0.19 * 100) / 100; // Round to 0.01
  let max = Math.round(valveDia * 0.45 * 100) / 100;
  if (camType === 0) max = Math.round(valveDia * 0.5 * 100) / 100;
  return { min, max };
}

/**
 * VB6 SetSeatDia (ENGPERF.BAS lines 1645-1661)
 *
 * min = (SeatPer.min / 100) * valveDia
 * max = (SeatPer.max / 100) * valveDia
 * VB6 gc_SeatPer: min=75, max=100 (from SetAllValues)
 */
export function computeSeatDiaMinMax(args: { valveDia: number }): { min: number; max: number } {
  const SEAT_PER_MIN = 75;
  const SEAT_PER_MAX = 100;
  return {
    min: (SEAT_PER_MIN / 100) * args.valveDia,
    max: (SEAT_PER_MAX / 100) * args.valveDia,
  };
}

/**
 * VB6 SetStemDia (ENGPERF.BAS lines 1663-1675)
 *
 * max = 0.22 * valveDia
 * min is not explicitly set by VB6 — keep existing minVal.
 */
export function computeStemDiaMax(args: { valveDia: number }): number {
  return 0.22 * args.valveDia;
}

/**
 * VB6 SetVSWidth (ENGPERF.BAS lines 1312-1333)
 *
 * vd = valveDia (inches), vsd = seatDia (inches)
 * max = 0.75 * ((vd - vsd) / 2) / cos(VSAngle.max * PI / 180)
 * if max <= 0.02 then max = 0.02
 * min = 0.01 * vd / cos(VSAngle.min * PI / 180)
 * if min >= max then min = max - 0.05
 * if min < 0 then min = 0
 * max = RoundDown(max, 0.01)
 * min = Round(min, 0.01)
 *
 * VB6 gc_VSAngle: min=30, max=60 (from SetAllValues)
 */
export function computeVSWidthMinMax(args: { valveDia: number; seatDia: number }): { min: number; max: number } {
  const VS_ANGLE_MIN = 30;
  const VS_ANGLE_MAX = 60;
  const { valveDia, seatDia } = args;

  let max = 0.75 * ((valveDia - seatDia) / 2) / Math.cos(VS_ANGLE_MAX * PI / 180);
  if (max <= 0.02) max = 0.02;

  let min = 0.01 * valveDia / Math.cos(VS_ANGLE_MIN * PI / 180);
  if (min >= max) min = max - 0.05;
  if (min < 0) min = 0;

  max = roundDown(max, 0.01);
  min = Math.round(min * 100) / 100; // VB6 Round(min, 0.01)

  return { min, max };
}

// ---------------------------------------------------------------------------
// Orchestration — per-field recompute mirroring VB6 handler call order
// ---------------------------------------------------------------------------

/** Shared: apply SetMaxInFlow limits */
function doSetMaxInFlow(m: Record<FieldKey, FieldConstraint>, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  return applyFieldLimits(m, 'maxInFlow', computeMaxInFlowMinMax({
    valveDia: m.valveDia.value, noInValves: m.noInValves.value, deltaP: m.deltaP.value,
  }), ck);
}

/** Shared: apply SetCSArea limits */
function doSetCSArea(m: Record<FieldKey, FieldConstraint>, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  return applyFieldLimits(m, 'csArea', computeCSAreaMinMax({
    maxInFlow: m.maxInFlow.value,
    valveDia: m.valveDia.value,
    valveDiaMax: m.valveDia.maxVal,
    noInValves: m.noInValves.value,
    deltaP: m.deltaP.value,
  }), ck);
}

/** Shared: apply SetValveLift limits */
function doSetValveLift(m: Record<FieldKey, FieldConstraint>, camType: number, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  return applyFieldLimits(m, 'valveLift', computeValveLiftMinMax({ valveDia: m.valveDia.value, camType }), ck);
}

/** Shared: apply SetSeatDia limits */
function doSetSeatDia(m: Record<FieldKey, FieldConstraint>, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  return applyFieldLimits(m, 'seatDia', computeSeatDiaMinMax({ valveDia: m.valveDia.value }), ck);
}

/** Shared: apply SetStemDia limits (max only; min unchanged) */
function doSetStemDia(m: Record<FieldKey, FieldConstraint>, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  const newMax = computeStemDiaMax({ valveDia: m.valveDia.value });
  return applyFieldLimits(m, 'stemDia', { min: m.stemDia.minVal, max: newMax }, ck);
}

/** Shared: apply SetVSWidth limits */
function doSetVSWidth(m: Record<FieldKey, FieldConstraint>, ck: FieldKey[]): Record<FieldKey, FieldConstraint> {
  return applyFieldLimits(m, 'vsWidth', computeVSWidthMinMax({ valveDia: m.valveDia.value, seatDia: m.seatDia.value }), ck);
}

/**
 * Per-field recompute: mirrors the EXACT VB6 handler call order for each committedKey.
 *
 * VB6 handler call sequences (from ENGINE.FRM):
 *
 * | committedKey | VB6 handler            | Call sequence                                                              |
 * |--------------|------------------------|----------------------------------------------------------------------------|
 * | bore         | txtBore_LostFocus      | SetCarbCFM, SetRefBore, SetStroke, SetValveDia, TestValveDia,              |
 * |              |                        | SetMaxInFlow, TestMaxInFlow, SetCSArea, SetVSWidth, CalcKCDGH              |
 * | stroke       | txtStroke_LostFocus    | SetCarbCFM, SetRod, CalcKCDGH                                             |
 * | rod          | txtRod_LostFocus       | SetStroke                                                                  |
 * | refBore      | txtRefBore_LostFocus   | (no setters)                                                               |
 * | noInValves   | txtNoInValves_LostFocus| SetValveDia, TestValveDia, SetMaxInFlow, TestMaxInFlow, SetCSArea, SetVSWidth|
 * | valveDia     | txtValveDia_LostFocus  | SetMaxInFlow, TestMaxInFlow, SetValveLift, SetSeatDia, SetStemDia,         |
 * |              |                        | SetCSArea, SetVSWidth                                                      |
 * | maxInFlow    | txtMaxInFlow_LostFocus | SetCSArea                                                                  |
 * | deltaP       | txtDeltaP_LostFocus    | SetCSArea, CalcVelStd(→SetFlowVel→SetFlowFlux→SetMaxInFlow), TestMaxInFlow |
 * | csArea       | (internal)             | (no setters)                                                               |
 * | carbCFM      | txtCarbCFM_LostFocus   | (no setters — just CalcEngPerf)                                            |
 * | valveLift    | (worksheet)            | (no setters)                                                               |
 * | seatDia      | (worksheet)            | (no setters)                                                               |
 * | stemDia      | (worksheet)            | (no setters)                                                               |
 * | vsWidth      | (worksheet)            | (no setters)                                                               |
 *
 * args.noCyl and args.manifoldType are needed for SetCarbCFM.
 */
export function recomputeOnCommit(
  map: Record<FieldKey, FieldConstraint>,
  args: { camType: number; committedKey: FieldKey; noCyl?: number; manifoldType?: number },
): { nextMap: Record<FieldKey, FieldConstraint>; changedKeys: FieldKey[] } {
  let m = { ...map };
  const ck: FieldKey[] = [];
  const noCyl = args.noCyl ?? 8;
  const manifoldType = args.manifoldType ?? 1;

  switch (args.committedKey) {
    case 'bore': {
      // VB6 txtBore_LostFocus: SetCarbCFM, SetRefBore, SetStroke, SetValveDia/Test,
      //   SetMaxInFlow/Test, SetCSArea, SetVSWidth, CalcKCDGH
      m = applyFieldLimits(m, 'carbCFM', computeCarbCFMMinMax({
        bore: m.bore.value, stroke: m.stroke.value, noCyl, manifoldType,
      }), ck);
      m = applyFieldLimits(m, 'refBore', computeRefBoreMinMax({ bore: m.bore.value }), ck);
      m = applyFieldLimits(m, 'stroke', computeStrokeMinMax({ bore: m.bore.value, rod: m.rod.value }), ck);
      m = applyFieldLimits(m, 'rod', computeRodMinMax({ stroke: m.stroke.value }), ck);
      m = applyFieldLimits(m, 'stroke', computeStrokeMinMax({ bore: m.bore.value, rod: m.rod.value }), ck);
      m = applyFieldLimits(m, 'valveDia', computeValveDiaMinMax({ bore: m.bore.value, noInValves: m.noInValves.value }), ck);
      m = doSetMaxInFlow(m, ck);
      m = doSetCSArea(m, ck);
      m = doSetVSWidth(m, ck);
      // CalcKCDGH — TODO: geometry recalc
      break;
    }

    case 'stroke': {
      // VB6 txtStroke_LostFocus: SetCarbCFM, SetRod, CalcKCDGH
      m = applyFieldLimits(m, 'carbCFM', computeCarbCFMMinMax({
        bore: m.bore.value, stroke: m.stroke.value, noCyl, manifoldType,
      }), ck);
      m = applyFieldLimits(m, 'rod', computeRodMinMax({ stroke: m.stroke.value }), ck);
      // CalcKCDGH — TODO
      break;
    }

    case 'rod': {
      // VB6 txtRod_LostFocus: SetStroke
      m = applyFieldLimits(m, 'stroke', computeStrokeMinMax({ bore: m.bore.value, rod: m.rod.value }), ck);
      break;
    }

    case 'refBore': {
      // VB6 txtRefBore_LostFocus: (no setters)
      break;
    }

    case 'noInValves': {
      // VB6 txtNoInValves_LostFocus: SetValveDia/Test, SetMaxInFlow/Test, SetCSArea, SetVSWidth
      m = applyFieldLimits(m, 'valveDia', computeValveDiaMinMax({ bore: m.bore.value, noInValves: m.noInValves.value }), ck);
      m = doSetMaxInFlow(m, ck);
      m = doSetCSArea(m, ck);
      m = doSetVSWidth(m, ck);
      break;
    }

    case 'valveDia': {
      // VB6 txtValveDia_LostFocus: SetMaxInFlow/Test, SetValveLift, SetSeatDia, SetStemDia,
      //   SetCSArea, SetVSWidth
      m = doSetMaxInFlow(m, ck);
      m = doSetValveLift(m, args.camType, ck);
      m = doSetSeatDia(m, ck);
      m = doSetStemDia(m, ck);
      m = doSetCSArea(m, ck);
      m = doSetVSWidth(m, ck);
      break;
    }

    case 'maxInFlow': {
      // VB6 txtMaxInFlow_LostFocus: SetCSArea
      m = doSetCSArea(m, ck);
      break;
    }

    case 'deltaP': {
      // VB6 txtDeltaP_LostFocus: SetCSArea, CalcVelStd(→SetFlowVel→SetFlowFlux→SetMaxInFlow),
      //   TestMaxInFlow
      m = doSetCSArea(m, ck);
      m = doSetMaxInFlow(m, ck);
      break;
    }

    case 'carbCFM':
    case 'csArea':
    case 'valveLift':
    case 'seatDia':
    case 'stemDia':
    case 'vsWidth': {
      // No downstream setters for these fields
      break;
    }
  }

  return { nextMap: m, changedKeys: ck };
}

/**
 * Recompute constraints when camshaftType changes (dropdown).
 *
 * VB6: cmbCamType_Click calls SetNIV, then downstream chain:
 *   SetNIV -> (if NIV clamped) SetValveDia/Test -> SetMaxInFlow/Test -> SetCSArea -> SetVSWidth
 *   Also: SetValveLift (depends on camType)
 */
export function recomputeOnCamTypeChange(
  map: Record<FieldKey, FieldConstraint>,
  args: { camType: number },
): { nextMap: Record<FieldKey, FieldConstraint>; changedKeys: FieldKey[] } {
  let m = { ...map };
  const ck: FieldKey[] = [];

  // SetNIV
  const nivMax = computeNIVMax({ camType: args.camType });
  m = applyFieldLimits(m, 'noInValves', { min: 1, max: nivMax }, ck);

  // SetValveDia + TestValveDia (NIV may have changed)
  m = applyFieldLimits(m, 'valveDia', computeValveDiaMinMax({ bore: m.bore.value, noInValves: m.noInValves.value }), ck);

  // SetMaxInFlow + TestMaxInFlow
  m = doSetMaxInFlow(m, ck);

  // SetValveLift (depends on camType)
  m = doSetValveLift(m, args.camType, ck);

  // SetCSArea
  m = doSetCSArea(m, ck);

  // SetVSWidth
  m = doSetVSWidth(m, ck);

  return { nextMap: m, changedKeys: ck };
}

// ---------------------------------------------------------------------------
// Internal: apply new min/max to a field and clamp if out of range
// ---------------------------------------------------------------------------

function applyFieldLimits(
  m: Record<FieldKey, FieldConstraint>,
  key: FieldKey,
  limits: { min: number; max: number },
  changedKeys: FieldKey[],
): Record<FieldKey, FieldConstraint> {
  const updated = applyMinMax({ ...m[key], minVal: limits.min, maxVal: limits.max });
  m = updateField(m, key, updated);

  if (m[key].value < m[key].minVal || m[key].value > m[key].maxVal) {
    const clamped = setValue(m[key], m[key].value);
    m = updateField(m, key, clamped);
    if (clamped.isError && !changedKeys.includes(key)) changedKeys.push(key);
  }

  return m;
}
