/**
 * Engine Unit Conversions — display-only helpers for SI equivalents.
 *
 * VB6 source: ENGINE.FRM LoadScreen (lines 2049-2064), PRINT.FRM/Print.bas
 *
 * These do NOT change simulation math — only convert for display.
 */

// ---------------------------------------------------------------------------
// Conversion factors (exact values matching VB6)
// ---------------------------------------------------------------------------

/** VB6: ZM3 = 2.54^3 = 16.387064; liters = CID * ZM3 / 1000 */
const CID_TO_LITERS = 0.016387064;

/** VB6: kW = HP / 1.34102 */
const HP_TO_KW = 1 / 1.34102;

/** VB6: Nm = lbft * 0.3048 * 4.44822 */
const LBFT_TO_NM = 0.3048 * 4.44822;

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/** Convert cubic inches to liters. VB6: CID * ZM3 / 1000 */
export function cidToLiters(cid: number): number {
  return cid * CID_TO_LITERS;
}

/** Convert horsepower to kilowatts. VB6: HP / 1.34102 */
export function hpToKw(hp: number): number {
  return hp * HP_TO_KW;
}

/** Convert lb-ft to Newton-meters. VB6: TQ * 0.3048 * 4.44822 */
export function lbftToNm(lbft: number): number {
  return lbft * LBFT_TO_NM;
}

/** Torque per cubic inch. VB6: gc_TQ.Value / CID */
export function tqPerCid(peakTQ: number, cid: number): number {
  if (!cid || cid === 0) return 0;
  return peakTQ / cid;
}

// ---------------------------------------------------------------------------
// Formatting helpers — match VB6 adaptive decimal rules
// ---------------------------------------------------------------------------

/**
 * Format liters — VB6 adaptive:
 *   CID >= 6.1 → "##.#0" (2 decimals, e.g. "6.60")
 *   CID <  6.1 → "#.#00" (3 decimals, e.g. "0.164")
 */
export function fmtLiters(cid: number): string {
  const L = cidToLiters(cid);
  if (isNaN(L)) return '—';
  return cid >= 6.1 ? L.toFixed(2) : L.toFixed(3);
}

/**
 * Format kW — VB6 adaptive:
 *   kW >= 100 → integer
 *   kW >= 10  → 1 decimal
 *   kW < 10   → 2 decimals
 */
export function fmtKw(hp: number): string {
  const kw = hpToKw(hp);
  if (isNaN(kw)) return '—';
  if (kw >= 100) return Math.round(kw).toString();
  if (kw >= 10) return kw.toFixed(1);
  return kw.toFixed(2);
}

/**
 * Format N·m — VB6 adaptive (same rules as kW):
 *   Nm >= 100 → integer
 *   Nm >= 10  → 1 decimal
 *   Nm < 10   → 2 decimals
 */
export function fmtNm(lbft: number): string {
  const nm = lbftToNm(lbft);
  if (isNaN(nm)) return '—';
  if (nm >= 100) return Math.round(nm).toString();
  if (nm >= 10) return nm.toFixed(1);
  return nm.toFixed(2);
}

/**
 * Format TQ/CID — VB6: DecimalPlaces_In = 2
 */
export function fmtTqPerCid(peakTQ: number, cid: number): string {
  if (!cid || isNaN(peakTQ) || isNaN(cid)) return '—';
  const val = tqPerCid(peakTQ, cid);
  if (isNaN(val) || !isFinite(val)) return '—';
  return val.toFixed(2);
}
