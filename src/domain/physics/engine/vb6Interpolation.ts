/**
 * VB6 RSALIB.BAS Interpolation Functions
 * Exact port of BISC, TABY, DTABY, and TAB1 from RSALIB 6.0
 * 
 * These use LAGRANGIAN INTERPOLATION, not linear interpolation!
 * This is the root cause of the dyno curve mismatch.
 */

/**
 * BISC - Binary Search for TABY Interpolation Family
 * VB6 RSALIB.BAS lines 12-62
 */
function BISC(
  X: number[],      // 1-based array
  XVAL: number,
  N: number,
  KBOTM: { value: number },  // Pass by reference
  KTOP: { value: number },   // Pass by reference
  JJ: { value: number }      // Pass by reference
): void {
  JJ.value = 0;
  KBOTM.value = 1;
  KTOP.value = N;
  
  const X1 = X[1];
  const XN = X[N];
  
  // Determine if X vector is ascending or descending
  let S = XN - X1;
  if (S > 0) {
    S = 1;
  } else {
    S = -1;
  }
  
  let SX = S * (XVAL - X1);
  if (SX < 0) {
    // XVAL is below X(1)
    KTOP.value = N;
    if (KTOP.value > 2) KTOP.value = 2;
    JJ.value = 1;
    return;
  }
  if (SX === 0) {
    // XVAL equals X(1)
    KBOTM.value = 1;
    KTOP.value = 1;
    return;
  }
  
  SX = S * (XVAL - XN);
  if (SX < 0) {
    // XVAL is between X(1) and X(N) - do binary search
  } else if (SX === 0) {
    // XVAL equals X(N)
    KBOTM.value = N;
    KTOP.value = N;
    return;
  } else {
    // XVAL is above X(N)
    KBOTM.value = N - 1;
    if (KBOTM.value < 1) KBOTM.value = 1;
    JJ.value = 1;
    return;
  }
  
  // Binary search
  while (KBOTM.value + 1 < KTOP.value) {
    const i = Math.floor((KBOTM.value + KTOP.value) / 2);
    SX = S * (XVAL - X[i]);
    
    if (SX === 0) {
      // XVAL equals X(i)
      KBOTM.value = i;
      KTOP.value = i;
      return;
    }
    
    if (SX > 0) {
      KBOTM.value = i;
    } else {
      KTOP.value = i;
    }
  }
}

/**
 * TABY - 1-D Lagrangian Interpolation
 * VB6 RSALIB.BAS lines 531-573
 */
export function TABY(
  XTAB: number[],   // 1-based array
  YTAB: number[],   // 1-based array
  N: number,
  L: number,
  XVAL: number
): number {
  const KBOTM = { value: 1 };
  const KTOP = { value: 2 };
  
  if (N === 1) {
    return YTAB[KBOTM.value];
  }
  
  if (N === 2) {
    // Will go to T400
  } else {
    // Call BISC if there are at least three points
    const JJ = { value: 0 };
    BISC(XTAB, XVAL, N, KBOTM, KTOP, JJ);
    
    if (KBOTM.value === KTOP.value) {
      return YTAB[KBOTM.value];
    }
    
    // Determine proper values of KBOTM and KTOP
    if (JJ.value !== 1 && L > 1) {
      KTOP.value = KTOP.value + 1;
      if (L >= 3) {
        if (KTOP.value > N) KTOP.value = N;
        KBOTM.value = KBOTM.value - 1;
        if (KBOTM.value < 1) KBOTM.value = 1;
      } else {
        if (KTOP.value > N) {
          // Continue to T400
        }
      }
    }
  }
  
  // T400: Calculate Lagrange coefficients
  let YVAL = 0;
  for (let j = KBOTM.value; j <= KTOP.value; j++) {
    let P = 1;
    const xtabj = XTAB[j];
    
    for (let i = KBOTM.value; i <= KTOP.value; i++) {
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
 * TAB1 - Simultaneous Interpolation of Multi-Line Data Table for DTABY
 * VB6 RSALIB.BAS lines 472-529
 */
function TAB1(
  XTAB: number[],   // 1-based array
  YTAB: number[],   // 1-based array
  XVAL: number,
  Y: number[],      // Output array, 1-based
  L: number[],      // [0, NX, LX] (1-based)
  LZ: number
): void {
  const NX = L[1];
  const LX = L[2];
  const KBOTM = { value: 1 };
  const KTOP = { value: 2 };
  
  if (NX === 1) {
    // TA100
    for (let k = 1; k <= LZ; k++) {
      const j = NX * (k - 1) + KBOTM.value;
      Y[k] = YTAB[j];
    }
    return;
  }
  
  if (NX === 2) {
    // Will go to TA500
  } else {
    // Call BISC if there are at least three points
    const JJ = { value: 0 };
    BISC(XTAB, XVAL, NX, KBOTM, KTOP, JJ);
    
    if (KBOTM.value === KTOP.value) {
      // TA100
      for (let k = 1; k <= LZ; k++) {
        const j = NX * (k - 1) + KBOTM.value;
        Y[k] = YTAB[j];
      }
      return;
    }
    
    // TA300: Determine proper values of KBOTM and KTOP
    if (JJ.value !== 1 && LX > 1) {
      KTOP.value = KTOP.value + 1;
      if (LX >= 3) {
        if (KTOP.value > NX) KTOP.value = NX;
        KBOTM.value = KBOTM.value - 1;
        if (KBOTM.value < 1) KBOTM.value = 1;
      } else {
        if (KTOP.value > NX) {
          // Continue to TA500
        }
      }
    }
  }
  
  // TA500: Calculate Lagrange coefficients
  const P: number[] = [0, 0, 0, 0, 0]; // 1-based, up to 4 points
  let JJ = 0;
  for (let j = KBOTM.value; j <= KTOP.value; j++) {
    JJ++;
    P[JJ] = 1;
    const xtabj = XTAB[j];
    
    for (let i = KBOTM.value; i <= KTOP.value; i++) {
      if (i !== j) {
        const xtabi = XTAB[i];
        P[JJ] = P[JJ] * (XVAL - xtabi) / (xtabj - xtabi);
      }
    }
  }
  
  // Apply Lagrange coefficients to all lines
  let kbotm = KBOTM.value;
  let ktop = KTOP.value;
  for (let k = 1; k <= LZ; k++) {
    Y[k] = 0;
    JJ = 0;
    for (let j = kbotm; j <= ktop; j++) {
      JJ++;
      Y[k] = Y[k] + P[JJ] * YTAB[j];
    }
    kbotm = kbotm + NX;
    ktop = ktop + NX;
  }
}

/**
 * DTABY - 2-D Lagrangian Interpolation
 * VB6 RSALIB.BAS lines 81-141
 */
export function DTABY(
  XTAB: number[],   // 1-based array
  ZTAB: number[],   // 1-based array
  YTAB: number[],   // 1-based array (2D flattened)
  NX: number,
  NZ: number,
  LX: number,
  LZ: number,
  XVAL: number,
  ZVAL: number
): number {
  const ZZ: number[] = [0, 0, 0, 0, 0]; // 1-based, up to 4 points
  const YY: number[] = [0, 0, 0, 0, 0]; // 1-based, up to 4 points
  const L: number[] = [0, 0, 0];        // 1-based
  const YX: number[] = new Array(4 * NX + 1).fill(0); // 1-based
  
  const L3 = NX - 1 > LX ? LX : NX - 1;
  
  const KBOTM = { value: 1 };
  const KTOP = { value: 2 };
  
  if (NZ === 1) {
    // D100
    for (let i = 1; i <= NX; i++) {
      const j = NX * (KBOTM.value - 1) + i;
      YX[i] = YTAB[j];
    }
    return TABY(XTAB, YX, NX, L3, XVAL);
  }
  
  if (NZ === 2) {
    // Will go to D400
  } else {
    // Call BISC if there are at least three lines
    const JJ = { value: 0 };
    BISC(ZTAB, ZVAL, NZ, KBOTM, KTOP, JJ);
    
    if (KBOTM.value === KTOP.value) {
      // D100
      for (let i = 1; i <= NX; i++) {
        const j = NX * (KBOTM.value - 1) + i;
        YX[i] = YTAB[j];
      }
      return TABY(XTAB, YX, NX, L3, XVAL);
    }
    
    // D200: Determine proper values of KBOTM and KTOP
    if (JJ.value !== 1 && LZ > 1) {
      KTOP.value = KTOP.value + 1;
      if (LZ >= 3) {
        if (KTOP.value > NZ) KTOP.value = NZ;
        KBOTM.value = KBOTM.value - 1;
        if (KBOTM.value < 1) KBOTM.value = 1;
      } else {
        if (KTOP.value > NZ) {
          // Continue to D400
        }
      }
    }
  }
  
  // D400
  const l2 = KTOP.value - KBOTM.value + 1;
  const L4 = l2 - 1 > LZ ? LZ : l2 - 1;
  
  // Build vector of line values (YY) at XVAL for each line between KBOTM and KTOP
  L[1] = NX;
  L[2] = L3;
  
  for (let k = KBOTM.value; k <= KTOP.value; k++) {
    for (let i = 1; i <= NX; i++) {
      const M = NX * (k - KBOTM.value) + i;
      const j = NX * (k - 1) + i;
      YX[M] = YTAB[j];
    }
  }
  
  TAB1(XTAB, YX, XVAL, YY, L, l2);
  
  // Interpolate for answer at ZVAL line value
  for (let i = KBOTM.value; i <= KTOP.value; i++) {
    const j = (i - KBOTM.value) + 1;
    ZZ[j] = ZTAB[i];
  }
  
  return TABY(ZZ, YY, l2, L4, ZVAL);
}
