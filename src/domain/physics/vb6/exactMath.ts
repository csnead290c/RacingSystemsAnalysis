/**
 * VB6 Exact Math Helpers
 * 
 * Enforce VB6-like Single (Float32) precision and banker's rounding.
 * Use these for bit-for-bit parity with VB6 Quarter Pro calculations.
 * 
 * VB6 used Single precision (32-bit float) for most calculations.
 * JavaScript uses 64-bit doubles, so we must explicitly truncate to Float32
 * after each operation to match VB6's intermediate results.
 */

/**
 * Convert a number to Float32 (VB6 Single precision).
 */
export const f32 = (x: number): number => Math.fround(x);

/**
 * Float32 arithmetic operations.
 * Each operation converts inputs to f32 and returns f32 result.
 * This preserves VB6's associativity and precision behavior.
 */
export const F = {
  /** Add two numbers in Float32 */
  add: (a: number, b: number): number => Math.fround(Math.fround(a) + Math.fround(b)),
  
  /** Subtract two numbers in Float32 */
  sub: (a: number, b: number): number => Math.fround(Math.fround(a) - Math.fround(b)),
  
  /** Multiply two numbers in Float32 */
  mul: (a: number, b: number): number => Math.fround(Math.fround(a) * Math.fround(b)),
  
  /** Divide two numbers in Float32 */
  div: (a: number, b: number): number => Math.fround(Math.fround(a) / Math.fround(b)),
  
  /** Square root in Float32 */
  sqrt: (x: number): number => Math.fround(Math.sqrt(Math.fround(x))),
  
  /** Power in Float32 */
  pow: (x: number, y: number): number => Math.fround(Math.pow(Math.fround(x), Math.fround(y))),
  
  /** Exponential in Float32 */
  exp: (x: number): number => Math.fround(Math.exp(Math.fround(x))),
  
  /** Natural log in Float32 */
  log: (x: number): number => Math.fround(Math.log(Math.fround(x))),
  
  /** Clamp in Float32 */
  clamp: (x: number, lo: number, hi: number): number => 
    Math.fround(Math.min(Math.max(Math.fround(x), Math.fround(lo)), Math.fround(hi))),
  
  /** Absolute value in Float32 */
  abs: (x: number): number => Math.fround(Math.abs(Math.fround(x))),
  
  /** Negate in Float32 */
  neg: (x: number): number => Math.fround(-Math.fround(x)),
};

/**
 * Banker's rounding (half-to-even) like VB/VBA Round function.
 * VB6's Round() uses this rule: when exactly at .5, round to nearest even.
 * 
 * Examples:
 *   vb6Round(2.5, 0) = 2  (rounds to even)
 *   vb6Round(3.5, 0) = 4  (rounds to even)
 *   vb6Round(2.4, 0) = 2
 *   vb6Round(2.6, 0) = 3
 */
export function vb6Round(x: number, places = 0): number {
  const p = Math.pow(10, places);
  const v = Math.fround(x * p);
  const f = Math.floor(v);
  const frac = v - f;
  
  if (frac > 0.5) return (f + 1) / p;
  if (frac < 0.5) return f / p;
  
  // Exactly 0.5: round to even
  return (f % 2 === 0 ? f : f + 1) / p;
}

/**
 * VB6 Int() function - truncates toward negative infinity.
 * Different from JavaScript's Math.floor() for negative numbers.
 */
export function vb6Int(x: number): number {
  return Math.floor(Math.fround(x));
}

/**
 * VB6 Fix() function - truncates toward zero.
 * Same as JavaScript's Math.trunc().
 */
export function vb6Fix(x: number): number {
  return Math.trunc(Math.fround(x));
}

// ============================================================================
// VB6 Constants - EXACT values from Quarter Pro source
// ============================================================================

/** Gravitational constant: lbm*ft/(lbf*s^2) - exact VB6 value */
export const GC = Math.fround(32.174048556);

/** Standard gravity: ft/s^2 */
export const G_FTPS2 = Math.fround(32.174);

/** Conversion: 1 inHg to psf (pounds per square foot) */
export const INHG_TO_PSF = Math.fround(70.7262);

/** Conversion: 1 inHg to psi */
export const INHG_TO_PSI = Math.fround(0.491154);

/** Standard atmospheric pressure at sea level: inHg */
export const STD_BARO_INHG = Math.fround(29.921);

/** Standard temperature at sea level: °F */
export const STD_TEMP_F = Math.fround(59.0);

/** Rankine offset from Fahrenheit */
export const RANKINE_OFFSET = Math.fround(459.67);

/** Specific gas constant for dry air: ft*lbf/(lbm*°R) */
export const R_DRY_AIR = Math.fround(53.35);

/** Specific gas constant for water vapor: ft*lbf/(lbm*°R) */
export const R_WATER_VAPOR = Math.fround(85.78);

/** Molecular weight ratio: water/air */
export const MW_RATIO_WATER_AIR = Math.fround(0.62198);

/** Pi in Float32 */
export const PI_F32 = Math.fround(Math.PI);

/** Feet per mile */
export const FT_PER_MILE = Math.fround(5280);

/** Seconds per hour */
export const SEC_PER_HOUR = Math.fround(3600);

// ============================================================================
// VB6 Unit Conversions
// ============================================================================

/** Convert feet per second to miles per hour (Float32) */
export function fpsToMph(fps: number): number {
  // mph = fps * 3600 / 5280 = fps * 0.681818...
  return F.div(F.mul(f32(fps), SEC_PER_HOUR), FT_PER_MILE);
}

/** Convert miles per hour to feet per second (Float32) */
export function mphToFps(mph: number): number {
  // fps = mph * 5280 / 3600
  return F.div(F.mul(f32(mph), FT_PER_MILE), SEC_PER_HOUR);
}

/** Convert Fahrenheit to Rankine (Float32) */
export function fToR(tempF: number): number {
  return F.add(f32(tempF), RANKINE_OFFSET);
}

/** Convert inches to feet (Float32) */
export function inToFt(inches: number): number {
  return F.div(f32(inches), f32(12));
}

/** Convert feet to inches (Float32) */
export function ftToIn(feet: number): number {
  return F.mul(f32(feet), f32(12));
}

// ============================================================================
// VB6 Interpolation
// ============================================================================

/**
 * Linear interpolation in Float32, matching VB6's piecewise linear behavior.
 * 
 * @param x - Input value
 * @param x0 - Lower bound x
 * @param x1 - Upper bound x
 * @param y0 - Value at x0
 * @param y1 - Value at x1
 * @returns Interpolated value in Float32
 */
export function lerpF32(x: number, x0: number, x1: number, y0: number, y1: number): number {
  const xf = f32(x);
  const x0f = f32(x0);
  const x1f = f32(x1);
  const y0f = f32(y0);
  const y1f = f32(y1);
  
  // Avoid division by zero
  if (x1f === x0f) return y0f;
  
  // t = (x - x0) / (x1 - x0)
  const t = F.div(F.sub(xf, x0f), F.sub(x1f, x0f));
  
  // y = y0 + t * (y1 - y0)
  return F.add(y0f, F.mul(t, F.sub(y1f, y0f)));
}

/**
 * Table lookup with linear interpolation in Float32.
 * Matches VB6's typical dyno curve interpolation.
 * 
 * @param x - Input value (e.g., RPM)
 * @param table - Array of [x, y] pairs, sorted by x ascending
 * @returns Interpolated y value in Float32
 */
export function tableLookupF32(x: number, table: [number, number][]): number {
  if (table.length === 0) return f32(0);
  if (table.length === 1) return f32(table[0][1]);
  
  const xf = f32(x);
  
  // Clamp to table bounds (VB6 behavior)
  if (xf <= f32(table[0][0])) return f32(table[0][1]);
  if (xf >= f32(table[table.length - 1][0])) return f32(table[table.length - 1][1]);
  
  // Find bracketing points
  for (let i = 0; i < table.length - 1; i++) {
    const x0 = f32(table[i][0]);
    const x1 = f32(table[i + 1][0]);
    
    if (xf >= x0 && xf <= x1) {
      return lerpF32(xf, x0, x1, table[i][1], table[i + 1][1]);
    }
  }
  
  // Fallback (should not reach here)
  return f32(table[table.length - 1][1]);
}
