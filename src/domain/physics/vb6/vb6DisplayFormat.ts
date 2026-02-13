/**
 * VB6 Display Formatting Pipeline for QuarterPro v3.2 Parity
 * 
 * EVIDENCE-BASED IMPLEMENTATION:
 * VB6's Format$() function applies formatting AFTER type conversions.
 * Values stored as Single (Float32) before formatting can cause "rounding cliffs"
 * where our Float64 value rounds differently.
 * 
 * Example rounding cliff:
 * - VB6: 160.953735 (Single) → Format$("0.0") → "161.0"
 * - JS:  160.953735 (Float64) → toFixed(1) → "161.0" (same)
 * - But if VB6 had 160.949999 (Single) and we have 160.950000 (Float64), different!
 * 
 * CAST ORDER (from vb6Exact.ts evidence):
 * 
 * ET (Elapsed Time):
 *   - VB6 stores ET as Double throughout (no Single cast)
 *   - Format$(et, "0.00") applies banker's rounding to 2 decimals
 *   - Evidence: vb6Exact.ts stores t_s as number (Float64)
 * 
 * MPH (Trap Speed):
 *   - VB6 computes trap MPH using Single (Float32) arithmetic
 *   - Evidence: vb6Exact.ts lines 1468-1472, 1508-1513
 *   - Formula: mph = f32(45.0 / dt) where dt = f32(tFin - tSave)
 *   - Result is already Float32 when stored in timeslip.v_mph
 *   - Format$(mph, "0.0") applies banker's rounding to 1 decimal
 * 
 * BANKER'S ROUNDING:
 * VB6's Format$() uses round-half-to-even (banker's rounding):
 * - 0.5 → 0 (round to even)
 * - 1.5 → 2 (round to even)
 * - 2.5 → 2 (round to even)
 * - 3.5 → 4 (round to even)
 */

/**
 * Cast to Float32 (VB6 Single type) to match VB6's precision.
 * This is critical for matching VB6's rounding behavior at boundaries.
 * 
 * EXPORTED for use in vb6Exact trap MPH calculation.
 */
export function f32(value: number): number {
  const f32Array = new Float32Array(1);
  f32Array[0] = value;
  return f32Array[0];
}

/**
 * Banker's rounding (round-half-to-even) matching VB6 Format$() behavior.
 * 
 * VB6's Format$() uses banker's rounding:
 * - 0.5 rounds to nearest even integer
 * - 1.5 rounds to 2
 * - 2.5 rounds to 2
 * - 3.5 rounds to 4
 */
function bankersRound(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const frac = scaled - floor;
  
  // Check if exactly at half (within floating point tolerance)
  const isHalf = Math.abs(frac - 0.5) < 1e-10;
  
  if (isHalf) {
    // Round to nearest even
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  
  // Standard rounding for non-half values
  return Math.round(scaled) / factor;
}

/**
 * Format ET for QuarterPro summary display (2 decimal places).
 * 
 * CAST ORDER (from evidence):
 * 1. ET is stored as Double (Float64) in VB6 - NO Float32 cast
 * 2. Apply banker's rounding to 2 decimals
 * 3. Format to string with toFixed(2)
 * 
 * Evidence: vb6Exact.ts stores timeslip.t_s as number (Float64)
 * VB6 TIMESLIP.FRM keeps ET as Double throughout
 * 
 * @param et_s Elapsed time in seconds (Float64)
 * @returns Formatted string "0.00"
 */
export function formatET_QP(et_s: number): string {
  // NO Float32 cast - VB6 keeps ET as Double
  const rounded = bankersRound(et_s, 2);
  return rounded.toFixed(2);
}

/**
 * Format MPH for QuarterPro summary display (1 decimal place).
 * 
 * CAST ORDER (from evidence and testing):
 * 1. MPH is already Float32 from vb6Exact trap calculation
 * 2. Apply banker's rounding to 1 decimal IN FLOAT64 SPACE
 * 3. Format to string with toFixed(1)
 * 
 * CRITICAL FINDING: Casting to Float32 BEFORE rounding breaks banker's rounding
 * at tie points (x.x5). Example: 160.85 becomes 160.85000610351562 as Float32,
 * which is no longer exactly at 0.5, so banker's rounding fails.
 * 
 * VB6 likely applies Format$() rounding in Double space even though the value
 * came from Single arithmetic. The Single precision affects the VALUE but not
 * the ROUNDING OPERATION itself.
 * 
 * Evidence: vb6Exact.ts lines 1468-1472, 1508-1513 compute trap MPH as Float32,
 * but VB6 Format$() operates in Double precision for the rounding step.
 * 
 * @param mph Speed in miles per hour (already Float32 from vb6Exact)
 * @returns Formatted string "0.0"
 */
export function formatMPH_QP(mph: number): string {
  // Apply banker's rounding in Float64 space (VB6 Format$() behavior)
  // The mph value is already Float32 precision from vb6Exact, but we round
  // in Float64 to preserve exact tie-point behavior
  const rounded = bankersRound(mph, 1);
  return rounded.toFixed(1);
}

/**
 * Parse formatted ET string back to number (for testing).
 */
export function parseET_QP(formatted: string): number {
  return parseFloat(formatted);
}

/**
 * Parse formatted MPH string back to number (for testing).
 */
export function parseMPH_QP(formatted: string): number {
  return parseFloat(formatted);
}
