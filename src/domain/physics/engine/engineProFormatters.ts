/**
 * Formatting helpers for Engine Pro detail panels.
 *
 * Rules (matching VB6 display conventions):
 *  - Angles: 1 decimal place, suffix "°"
 *  - Dimensions (inches): 3 decimal places, suffix " in"
 *  - Areas (sq in): 2 decimal places, suffix " sq in"
 *  - Speeds (fpm): integer, suffix " fpm"
 *  - Speeds (fps): 1 decimal place, suffix " fps"
 *  - Acceleration (g): 1 decimal place, suffix " g"
 *  - CFM: integer, suffix " CFM"
 *  - Volumes (cc): integer, suffix " cc"
 *  - Volumes (ci): integer, suffix " ci"
 *  - Pressure (inH₂O): 1 decimal place, suffix " inH₂O"
 *  - Percentages: 1 decimal place, suffix "%"
 *  - Degrees (cam): integer, suffix "°"
 *  - Generic integer: no suffix
 *
 * Every formatter returns a string. Undefined/NaN/Infinity → "—".
 */

/** Guard: returns true if value is a usable finite number */
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const DASH = '—';

// ── public formatters ──────────────────────────────────────────────

/** Angle with 1 decimal, e.g. "72.3°" */
export function fmtAngle(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(1)}°` : DASH;
}

/** Dimension in inches, 3 decimals, e.g. "0.550 in" */
export function fmtDim3(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(3)} in` : DASH;
}

/** Dimension in inches, 2 decimals, e.g. "1.69 in" */
export function fmtDim2(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(2)} in` : DASH;
}

/** Area in sq in, 2 decimals, e.g. "2.40 sq in" */
export function fmtArea(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(2)} sq in` : DASH;
}

/** Speed in feet per minute, integer, e.g. "3 842 fpm" (no thousands sep for VB6 compat) */
export function fmtFPM(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)} fpm` : DASH;
}

/** Speed in feet per second, 1 decimal, e.g. "64.0 fps" */
export function fmtFPS(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(1)} fps` : DASH;
}

/** Acceleration in g's, 1 decimal, e.g. "412.3 g" */
export function fmtGs(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(1)} g` : DASH;
}

/** CFM, integer, e.g. "250 CFM" */
export function fmtCFM(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)} CFM` : DASH;
}

/** Volume in cc, integer, e.g. "185 cc" */
export function fmtCC(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)} cc` : DASH;
}

/** Volume in cubic inches, integer, e.g. "45 ci" */
export function fmtCI(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)} ci` : DASH;
}

/** Pressure in inches of water, 1 decimal, e.g. "28.0 inH₂O" */
export function fmtInH2O(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(1)} inH₂O` : DASH;
}

/** Percentage, 1 decimal, e.g. "72.5%" */
export function fmtPct(v: number | undefined): string {
  return isNum(v) ? `${v.toFixed(1)}%` : DASH;
}

/** Cam degrees, integer, e.g. "264°" */
export function fmtCamDeg(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)}°` : DASH;
}

/** Generic integer, no suffix */
export function fmtInt(v: number | undefined): string {
  return isNum(v) ? `${Math.round(v)}` : DASH;
}

/** Dimension with fractional-inch display, e.g. "1.750 in (1-3/4)" */
export function fmtDimFrac(v: number | undefined): string {
  if (!isNum(v)) return DASH;
  // Only add fraction hint for common 1/8" increments
  const eighths = Math.round(v * 8);
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  let frac = '';
  if (rem === 0) frac = '';
  else if (rem === 4) frac = '1/2';
  else if (rem === 2) frac = '1/4';
  else if (rem === 6) frac = '3/4';
  else if (rem === 1) frac = '1/8';
  else if (rem === 3) frac = '3/8';
  else if (rem === 5) frac = '5/8';
  else if (rem === 7) frac = '7/8';
  if (frac) {
    return `${v.toFixed(3)} in (${whole > 0 ? whole + '-' : ''}${frac})`;
  }
  return `${v.toFixed(3)} in`;
}
