/**
 * Throttle CFM @ 1.5" Hg Worksheet
 *
 * VB6 source of truth:
 *   - CARBCFM.FRM (frmCarb) — UI + event handlers
 *   - ENGPERF.BAS CalcCarb() lines 1077-1138 — calculation
 *   - ENGPERF.BAS SetTVDia/SetTVDiaS lines 1520-1554 — venturi limits
 *   - ENGPERF.BAS SetAllValues lines 1926-1974 — field defaults/constraints
 *   - DECLARES.BAS — PI=3.141593, ZM=25.4, ZM2=ZM^2
 *
 * All calculations assume inch inputs (TS UI is inch-only; VB6 mm paths
 * are not ported since the TS UI does not support mm toggle).
 */

const PI = 3.141593; // VB6 constant, NOT Math.PI

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThrottleType = 'butterfly' | 'slide';

export interface CarbWorksheetInputs {
  /** Primary number of throttle bores (VB6 gc_NoTB, min=1 max=12, default=4) */
  numBoresPrimary: number;
  /** Primary throttle bore diameter in inches (VB6 gc_TBDia, min=0 max=6, default=1.688) */
  throttleDiaPrimary: number;
  /** Primary venturi diameter in inches (VB6 gc_TVDia, min=tbDia/2 max=tbDia, default=1.375) */
  venturiDiaPrimary: number;

  /** Secondary number of throttle bores (VB6 gc_NoTBS, min=0 max=12, default=0) */
  numBoresSecondary: number;
  /** Secondary throttle bore diameter in inches (VB6 gc_TBDiaS, min=0 max=6, default=0) */
  throttleDiaSecondary: number;
  /** Secondary venturi diameter in inches (VB6 gc_TVDiaS, min=tbDiaS/2 max=tbDiaS, default=0) */
  venturiDiaSecondary: number;

  /** Throttle plate style (VB6 gc_TBType: True=butterfly, False=slide) */
  throttleType: ThrottleType;
}

export interface CarbWorksheetResult {
  /** CFM @ 1.5" Hg for primary bores */
  cfmPrimary: number;
  /** CFM @ 1.5" Hg for secondary bores (0 if no secondaries) */
  cfmSecondary: number;
  /** Total CFM @ 1.5" Hg */
  cfmTotal: number;
  /** Tooltip: CFM @ 3.0" Hg = cfmTotal * sqrt(3/1.5) */
  cfmAt3inHg: number;
}

// ---------------------------------------------------------------------------
// Defaults (VB6 SetAllValues lines 2255-2261)
// ---------------------------------------------------------------------------

export const CARB_WS_DEFAULTS: CarbWorksheetInputs = {
  numBoresPrimary: 4,
  throttleDiaPrimary: 1.688,
  venturiDiaPrimary: 1.375,
  numBoresSecondary: 0,
  throttleDiaSecondary: 0,
  venturiDiaSecondary: 0,
  throttleType: 'butterfly',
};

// ---------------------------------------------------------------------------
// Validation / clamping  (VB6 cValue semantics)
// ---------------------------------------------------------------------------

/** VB6 gc_NoTB: integer, min=1, max=12 */
export function clampNumBoresPrimary(v: number): number {
  const n = Math.round(v);
  if (n < 1) return 1;
  if (n > 12) return 12;
  return n;
}

/** VB6 gc_NoTBS: integer, min=0, max=12 */
export function clampNumBoresSecondary(v: number): number {
  const n = Math.round(v);
  if (n < 0) return 0;
  if (n > 12) return 12;
  return n;
}

/** VB6 gc_TBDia / gc_TBDiaS: decimal 3 places, min=0, max=6 */
export function clampThrottleDia(v: number): number {
  if (v < 0) return 0;
  if (v > 6) return 6;
  return roundTo(v, 3);
}

/**
 * VB6 SetTVDia: venturi min = tbDia/2, max = tbDia (ENGPERF.BAS:1520-1536)
 * Decimal 3 places.
 */
export function clampVenturiDia(v: number, throttleDia: number): number {
  const min = roundTo(throttleDia / 2, 3);
  const max = roundTo(throttleDia, 3);
  let clamped = v;
  if (clamped < min) clamped = min;
  if (clamped > max) clamped = max;
  return roundTo(clamped, 3);
}

/**
 * Compute venturi dia limits from throttle bore dia.
 * VB6 SetTVDia (ENGPERF.BAS:1520-1536): min = tbDia/2, max = tbDia
 */
export function venturiDiaLimits(throttleDia: number): { min: number; max: number } {
  return {
    min: roundTo(throttleDia / 2, 3),
    max: roundTo(throttleDia, 3),
  };
}

// ---------------------------------------------------------------------------
// Core calculation — VB6 CalcCarb (ENGPERF.BAS:1077-1138)
// ---------------------------------------------------------------------------

/**
 * Calculate CFM for one set of bores (primary or secondary).
 * All inputs in inches.
 *
 * Butterfly (gc_TBType = True):
 *   ZCarb = numBores * 51 * venturiDia^1.36 * throttleDia^1.69
 *   capped by venturi area limit: 123 * numBores * PI * venturiDia^2 / 4
 *   capped by throttle area limit: 91 * numBores * PI * throttleDia^2 / 4
 *
 * Slide (gc_TBType = False):
 *   ZCarb = 140 * numBores * PI * venturiDia^2 / 4
 *   capped by throttle area limit: 125 * numBores * PI * throttleDia^2 / 4
 */
function calcBoreSetCfm(
  numBores: number,
  venturiDia: number,
  throttleDia: number,
  throttleType: ThrottleType,
): number {
  if (numBores <= 0 || venturiDia <= 0 || throttleDia <= 0) return 0;

  let cfm: number;

  if (throttleType === 'butterfly') {
    // VB6: ZCarb = gc_NoTB.Value * 51 * gc_TVDia.Value ^ 1.36 * gc_TBDia.Value ^ 1.69
    cfm = numBores * 51 * Math.pow(venturiDia, 1.36) * Math.pow(throttleDia, 1.69);

    // VB6: ZCarbV = 123 * gc_NoTB.Value * PI * gc_TVDia.Value ^ 2 / 4
    const venturiLimit = 123 * numBores * PI * venturiDia * venturiDia / 4;
    if (cfm > venturiLimit) cfm = venturiLimit;

    // VB6: ZCarbT = 91 * gc_NoTB.Value * PI * gc_TBDia.Value ^ 2 / 4
    const throttleLimit = 91 * numBores * PI * throttleDia * throttleDia / 4;
    if (cfm > throttleLimit) cfm = throttleLimit;
  } else {
    // Slide valve
    // VB6: ZCarb = 140 * gc_NoTB.Value * PI * gc_TVDia.Value ^ 2 / 4
    cfm = 140 * numBores * PI * venturiDia * venturiDia / 4;

    // VB6: ZCarbT = 125 * gc_NoTB.Value * PI * gc_TBDia.Value ^ 2 / 4
    const throttleLimit = 125 * numBores * PI * throttleDia * throttleDia / 4;
    if (cfm > throttleLimit) cfm = throttleLimit;
  }

  return cfm;
}

/**
 * Full worksheet calculation — VB6 CalcCarb (ENGPERF.BAS:1077-1138).
 *
 * Inputs are clamped internally. Returns primary, secondary, and total CFM.
 * Rounding matches VB6: if result > 100, Round(x, 10) ≈ no rounding;
 * if ≤ 100, Round(x, 2).
 */
export function calcCarbCfm(inputs: CarbWorksheetInputs): CarbWorksheetResult {
  const nP = clampNumBoresPrimary(inputs.numBoresPrimary);
  const tbP = clampThrottleDia(inputs.throttleDiaPrimary);
  const tvP = clampVenturiDia(inputs.venturiDiaPrimary, tbP);

  const nS = clampNumBoresSecondary(inputs.numBoresSecondary);
  const tbS = clampThrottleDia(inputs.throttleDiaSecondary);
  const tvS = nS > 0 ? clampVenturiDia(inputs.venturiDiaSecondary, tbS) : 0;

  const cfmPrimary = calcBoreSetCfm(nP, tvP, tbP, inputs.throttleType);
  const cfmSecondary = nS > 0
    ? calcBoreSetCfm(nS, tvS, tbS, inputs.throttleType)
    : 0;

  const rawTotal = cfmPrimary + cfmSecondary;

  // VB6 rounding: Round(ZCarb, 10) if > 100, else Round(ZCarb, 2)
  // Round(x, 10) on a Single is effectively a no-op.
  const cfmTotal = rawTotal > 100
    ? rawTotal
    : roundTo(rawTotal, 2);

  // VB6 LoadScreen tooltip: CFM @ 3.0" Hg = cfmTotal * sqrt(3/1.5)
  const cfmAt3inHg = cfmTotal * Math.sqrt(3 / 1.5);

  return {
    cfmPrimary,
    cfmSecondary,
    cfmTotal,
    cfmAt3inHg,
  };
}

// ---------------------------------------------------------------------------
// Formatting — match VB6 display precision
// ---------------------------------------------------------------------------

/**
 * Format CFM for display.
 * VB6 gc_WSCarbCFM.Formatted — integer display (no decimal places configured).
 * VB6 tooltip uses Format(ZCFM, "0") for the 3.0" Hg value.
 */
export function formatCfm(cfm: number): string {
  return Math.round(cfm).toString();
}

/**
 * Format diameter for display (3 decimal places, matching VB6 DecimalPlaces_In=3).
 */
export function formatDia(v: number): string {
  return v.toFixed(3);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundTo(v: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
}

/**
 * Parse a raw text input to a number, VB6 Val() semantics:
 * blank/non-numeric → 0.
 */
export function parseNumericInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const n = parseFloat(trimmed);
  return isNaN(n) ? 0 : n;
}
