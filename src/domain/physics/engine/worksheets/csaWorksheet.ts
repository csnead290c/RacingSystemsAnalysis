/**
 * Cross-section Area Calculator Worksheet
 *
 * VB6 source of truth:
 *   - CSCalc.frm (frmCSCalc) — UI + event handlers
 *   - CSCalc.frm CalcCir/CalcEll/CalcRec/CalcAnn — calculation subs (lines 523-562)
 *   - ENGPERF.BAS SetAllValues lines 2076-2135 — field formatting/constraints
 *   - DECLARES.BAS — PI=3.141593
 *
 * Four independent calculators:
 *   1. Circular:    PI * (dia² - stem²) / 4
 *   2. Elliptical:  PI * (majorDia * minorDia - stem²) / 4
 *   3. Rectangular:  height * width - PI * stem² / 4 - cornerDia² * (1 - PI/4)
 *   4. Annular:     PI * (outer² - inner² - stem²) / 4
 *
 * All calculations assume inch inputs. VB6 supports mm toggle but TS UI is
 * inch-only. Negative results are clamped to 0 (VB6: If Work < 0 Then Work = 0).
 *
 * VB6 output round-trip: .Value = Work : .Value = val(.Formatted)
 * This means the result is set, formatted to DecimalPlaces_In=3, then re-parsed.
 * Effectively this rounds the output to 3 decimal places.
 */

const PI = 3.141593; // VB6 constant, NOT Math.PI

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CircularInputs {
  /** Port inside diameter in inches (VB6 gc_C(0)) */
  diameter: number;
  /** Valve stem diameter in inches (VB6 gc_C(1)) */
  stemDiameter: number;
}

export interface EllipticalInputs {
  /** Major diameter in inches (VB6 gc_E(0)) */
  majorDiameter: number;
  /** Minor diameter in inches (VB6 gc_E(1)) */
  minorDiameter: number;
  /** Valve stem diameter in inches (VB6 gc_E(2)) */
  stemDiameter: number;
}

export interface RectangularInputs {
  /** Port height in inches (VB6 gc_R(0)) */
  height: number;
  /** Port width in inches (VB6 gc_R(1)) */
  width: number;
  /** Corner diameter in inches (VB6 gc_R(2)) */
  cornerDiameter: number;
  /** Valve stem diameter in inches (VB6 gc_R(3)) */
  stemDiameter: number;
}

export interface AnnularInputs {
  /** Outer diameter in inches (VB6 gc_A(0)) */
  outerDiameter: number;
  /** Inner diameter in inches (VB6 gc_A(1)) */
  innerDiameter: number;
  /** Valve stem diameter in inches (VB6 gc_A(2)) */
  stemDiameter: number;
}

export interface CSAWorksheetState {
  circular: CircularInputs;
  elliptical: EllipticalInputs;
  rectangular: RectangularInputs;
  annular: AnnularInputs;
}

export interface CSAResults {
  circularArea: number;
  ellipticalArea: number;
  rectangularArea: number;
  annularArea: number;
}

// ---------------------------------------------------------------------------
// Defaults (VB6: all inputs start at 0 — no explicit defaults in SetAllValues)
// ---------------------------------------------------------------------------

export const CSA_DEFAULTS: CSAWorksheetState = {
  circular: { diameter: 0, stemDiameter: 0 },
  elliptical: { majorDiameter: 0, minorDiameter: 0, stemDiameter: 0 },
  rectangular: { height: 0, width: 0, cornerDiameter: 0, stemDiameter: 0 },
  annular: { outerDiameter: 0, innerDiameter: 0, stemDiameter: 0 },
};

// ---------------------------------------------------------------------------
// Parsing (VB6: val(txtX(i).Text) — blank/spaces → 0, non-numeric → 0)
// ---------------------------------------------------------------------------

export function parseCSAInput(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Formatting (VB6: DecimalPlaces_In = 3 for inputs, 3 for output area)
// ---------------------------------------------------------------------------

/** Format an input dimension to 3 decimal places (VB6 DecimalPlaces_In = 3) */
export function formatDimension(value: number): string {
  return value.toFixed(3);
}

/** Format an area result to 3 decimal places (VB6 DecimalPlaces_In = 3 for output) */
export function formatArea(value: number): string {
  return value.toFixed(3);
}

// ---------------------------------------------------------------------------
// VB6 output round-trip helper
// VB6 does: .Value = Work : .Value = val(.Formatted)
// This effectively rounds to 3 decimal places by formatting then re-parsing.
// ---------------------------------------------------------------------------

function roundTrip3(value: number): number {
  return Number(value.toFixed(3));
}

// ---------------------------------------------------------------------------
// Calculation functions — exact VB6 formula ports
// ---------------------------------------------------------------------------

/**
 * Circular area: PI * (dia² - stem²) / 4
 * VB6: CalcCir() — CSCalc.frm lines 523-531
 */
export function calcCircularArea(inputs: CircularInputs): number {
  const work = PI * (inputs.diameter ** 2 - inputs.stemDiameter ** 2) / 4;
  return roundTrip3(Math.max(work, 0));
}

/**
 * Elliptical area: PI * (majorDia * minorDia - stem²) / 4
 * VB6: CalcEll() — CSCalc.frm lines 533-541
 */
export function calcEllipticalArea(inputs: EllipticalInputs): number {
  const work = PI * (inputs.majorDiameter * inputs.minorDiameter - inputs.stemDiameter ** 2) / 4;
  return roundTrip3(Math.max(work, 0));
}

/**
 * Rectangular area: height * width - PI * stem² / 4 - cornerDia² * (1 - PI/4)
 * VB6: CalcRec() — CSCalc.frm lines 543-552
 *
 * Note: VB6 computes in two steps:
 *   Work = (R(0) * R(1)) - (PI * R(3)^2) / 4
 *   Work = Work - R(2)^2 * (1 - PI / 4)
 */
export function calcRectangularArea(inputs: RectangularInputs): number {
  let work = (inputs.height * inputs.width) - (PI * inputs.stemDiameter ** 2) / 4;
  work = work - inputs.cornerDiameter ** 2 * (1 - PI / 4);
  return roundTrip3(Math.max(work, 0));
}

/**
 * Annular area: PI * (outer² - inner² - stem²) / 4
 * VB6: CalcAnn() — CSCalc.frm lines 554-562
 */
export function calcAnnularArea(inputs: AnnularInputs): number {
  const work = PI * (inputs.outerDiameter ** 2 - inputs.innerDiameter ** 2 - inputs.stemDiameter ** 2) / 4;
  return roundTrip3(Math.max(work, 0));
}

/**
 * Compute all four areas at once.
 */
export function calcAllCSA(state: CSAWorksheetState): CSAResults {
  return {
    circularArea: calcCircularArea(state.circular),
    ellipticalArea: calcEllipticalArea(state.elliptical),
    rectangularArea: calcRectangularArea(state.rectangular),
    annularArea: calcAnnularArea(state.annular),
  };
}
