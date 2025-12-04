/**
 * VB6 EXACT PORT - TABY and DTABY Interpolation Functions
 * 
 * Source: RSALIB.BAS lines 11-141, 471-573
 * 
 * These are the exact VB6 Lagrangian interpolation routines used for:
 * - HP curve interpolation (TABY - 1D)
 * - ENGINE() synthetic curve generation (DTABY - 2D)
 */

/**
 * Binary search for interpolation bracket
 * VB6: RSALIB.BAS lines 11-79 (BISC subroutine)
 * 
 * @param X Array of x values (1-indexed in VB6, 0-indexed here)
 * @param XVAL Value to find
 * @param N Number of points
 * @returns { KBOTM, KTOP, JJ } - bracket indices and boundary flag
 */
export function bisc(
  X: number[],
  XVAL: number,
  N: number
): { KBOTM: number; KTOP: number; JJ: number } {
  let JJ = 0;
  let KBOTM = 0;  // 0-indexed (VB6 uses 1)
  let KTOP = N - 1;  // 0-indexed (VB6 uses N)
  
  const X1 = X[0];
  const XN = X[N - 1];
  
  // Check if XVAL is outside the range
  if (XVAL <= X1) {
    JJ = 1;
    KTOP = 1;
    return { KBOTM, KTOP, JJ };
  }
  
  if (XVAL >= XN) {
    JJ = 1;
    KBOTM = N - 2;
    KTOP = N - 1;
    return { KBOTM, KTOP, JJ };
  }
  
  // Binary search
  while (KTOP - KBOTM > 1) {
    const KMID = Math.floor((KBOTM + KTOP) / 2);
    if (XVAL < X[KMID]) {
      KTOP = KMID;
    } else {
      KBOTM = KMID;
    }
  }
  
  return { KBOTM, KTOP, JJ };
}

/**
 * 1D Lagrangian Interpolation
 * VB6: RSALIB.BAS lines 531-573 (TABY subroutine)
 * 
 * @param XTAB X values array (0-indexed)
 * @param YTAB Y values array (0-indexed)
 * @param N Number of points
 * @param L Interpolation order (1=linear, 2=quadratic, 3=cubic)
 * @param XVAL X value to interpolate
 * @returns Interpolated Y value
 */
export function taby(
  XTAB: number[],
  YTAB: number[],
  N: number,
  L: number,
  XVAL: number
): number {
  // Handle edge cases
  if (N <= 0) return 0;
  if (N === 1) return YTAB[0];
  
  let KBOTM = 0;
  let KTOP = 1;
  
  if (N === 2) {
    // Linear interpolation between two points
    KBOTM = 0;
    KTOP = 1;
  } else {
    // Use binary search for 3+ points
    const result = bisc(XTAB, XVAL, N);
    KBOTM = result.KBOTM;
    KTOP = result.KTOP;
    const JJ = result.JJ;
    
    if (KBOTM === KTOP) {
      return YTAB[KBOTM];
    }
    
    // Expand bracket based on interpolation order
    if (JJ !== 1 && L > 1) {
      KTOP = KTOP + 1;
      if (L >= 3 || KTOP > N - 1) {
        if (KTOP > N - 1) KTOP = N - 1;
        KBOTM = KBOTM - 1;
        if (KBOTM < 0) KBOTM = 0;
      }
    }
  }
  
  // Calculate Lagrange coefficients
  let YVAL = 0;
  for (let j = KBOTM; j <= KTOP; j++) {
    let P = 1;
    const xtabj = XTAB[j];
    for (let i = KBOTM; i <= KTOP; i++) {
      if (i === j) {
        P = P * YTAB[j];
      } else {
        const xtabi = XTAB[i];
        P = P * (XVAL - xtabi) / (xtabj - xtabi);
      }
    }
    YVAL = YVAL + P;
  }
  
  return YVAL;
}

/**
 * 2D Lagrangian Interpolation
 * VB6: RSALIB.BAS lines 81-141 (DTABY subroutine)
 * 
 * Interpolates a 2D table where:
 * - XTAB is the row variable (e.g., RPM ratio)
 * - ZTAB is the column variable (e.g., HP/CID ratio)
 * - YTAB is a flattened 2D array stored column-major
 * 
 * @param XTAB X values array (row variable, 0-indexed)
 * @param ZTAB Z values array (column variable, 0-indexed)
 * @param YTAB Y values 2D array flattened column-major (0-indexed)
 * @param NX Number of X points
 * @param NZ Number of Z points
 * @param LX X interpolation order
 * @param LZ Z interpolation order
 * @param XVAL X value to interpolate
 * @param ZVAL Z value to interpolate
 * @returns Interpolated Y value
 */
export function dtaby(
  XTAB: number[],
  ZTAB: number[],
  YTAB: number[],  // Flattened 2D array, column-major: YTAB[z * NX + x]
  NX: number,
  NZ: number,
  LX: number,
  LZ: number,
  XVAL: number,
  ZVAL: number
): number {
  // Handle single column case
  if (NZ === 1) {
    // Extract column and interpolate in X
    const YX: number[] = [];
    for (let i = 0; i < NX; i++) {
      YX.push(YTAB[i]);
    }
    return taby(XTAB, YX, NX, LX, XVAL);
  }
  
  // Find Z bracket
  const zResult = bisc(ZTAB, ZVAL, NZ);
  let KBOTM = zResult.KBOTM;
  let KTOP = zResult.KTOP;
  const JJ = zResult.JJ;
  
  // Expand Z bracket based on interpolation order
  if (JJ !== 1 && LZ > 1) {
    KTOP = KTOP + 1;
    if (LZ >= 3 || KTOP > NZ - 1) {
      if (KTOP > NZ - 1) KTOP = NZ - 1;
      KBOTM = KBOTM - 1;
      if (KBOTM < 0) KBOTM = 0;
    }
  }
  
  // For each Z in bracket, interpolate in X direction
  const YY: number[] = [];
  const ZZ: number[] = [];
  
  for (let i = KBOTM; i <= KTOP; i++) {
    // Extract column i
    const YX: number[] = [];
    for (let j = 0; j < NX; j++) {
      YX.push(YTAB[i * NX + j]);
    }
    // Interpolate in X
    const yInterp = taby(XTAB, YX, NX, LX, XVAL);
    YY.push(yInterp);
    ZZ.push(ZTAB[i]);
  }
  
  // Interpolate in Z direction
  const L2 = KTOP - KBOTM + 1;
  const L4 = Math.min(LZ, L2);
  return taby(ZZ, YY, L2, L4, ZVAL);
}

/**
 * Helper to convert VB6 1-indexed 2D array to 0-indexed flattened array
 * VB6 stores: sY(row + (col-1)*NX) where row=1..NX, col=1..NZ
 * We store: YTAB[col * NX + row] where row=0..NX-1, col=0..NZ-1
 */
export function flattenVB6Array(
  sY: number[][],  // sY[row][col] where row=1..NX, col=1..NZ (1-indexed)
  NX: number,
  NZ: number
): number[] {
  const result: number[] = [];
  for (let col = 0; col < NZ; col++) {
    for (let row = 0; row < NX; row++) {
      // VB6 uses 1-indexed, so sY[row+1][col+1]
      result.push(sY[row + 1]?.[col + 1] ?? 0);
    }
  }
  return result;
}

/**
 * Simple linear interpolation (for compatibility with existing code)
 * This is a simplified version that matches the basic TABY behavior
 */
export function tabyLinear(
  xrpm: number[],
  yhp: number[],
  NHP: number,
  _order: number,
  rpm: number
): number {
  // Find bracketing points
  let i = 0;
  for (i = 0; i < NHP - 1; i++) {
    if (rpm <= xrpm[i + 1]) break;
  }
  
  // Clamp to range
  if (i >= NHP - 1) i = NHP - 2;
  if (i < 0) i = 0;
  
  // Linear interpolation
  const x0 = xrpm[i];
  const x1 = xrpm[i + 1];
  const y0 = yhp[i];
  const y1 = yhp[i + 1];
  
  if (x1 === x0) return y0;
  
  const t = (rpm - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}
