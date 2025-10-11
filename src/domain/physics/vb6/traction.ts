/**
 * VB6 Traction and Acceleration Clamping
 * 
 * Exact port of VB6 traction force (CRTF) and acceleration limits (AMin/AMax).
 * 
 * Sources:
 * - TIMESLIP.FRM lines 1020-1027 (initial Ags0)
 * - TIMESLIP.FRM lines 1213-1216 (CRTF calculation)
 * - TIMESLIP.FRM lines 1224-1228 (AMax/AMin clamps)
 * - TIMESLIP.FRM lines 1262-1266 (AMax/AMin clamps in HP path)
 * - VB6-LAUNCH-BLOCK-NOTES.md
 */

import { AMin as AMin_CONSTANT, gc } from './constants';

/**
 * VB6 Base Traction Coefficient
 * 
 * TIMESLIP.FRM lines 550-570:
 * ```vb
 * #If Not ISBVPRO Then        'QUARTER jr and QUARTER Pro
 *     Const AX = 10.8         'reduced from 11.2 - 07/23/01
 * #Else                       'Bonneville Pro
 *     Const AX = 9.7          'reduced from 10.0 - 07/23/01
 * #End If
 * ```
 */
export const VB6_AX = 10.8; // Quarter Jr/Pro (default)
export const VB6_AX_BONN = 9.7; // Bonneville Pro

export interface TractionParams {
  /** Vehicle weight in lbf (gc_Weight.Value) */
  weight_lbf: number;
  
  /** Tire diameter in inches (TireDia) */
  tireDia_in: number;
  
  /** Tire width in inches (gc_TireWidth.Value) */
  tireWidth_in: number;
  
  /** Dynamic rear weight transfer in lbf (DynamicRWT) */
  dynamicRWT_lbf: number;
  
  /** Traction index adjustment (CAXI) */
  tractionIndexAdj: number;
  
  /** Tire growth factor (TireGrowth) - typically 1.0 at launch */
  tireGrowth: number;
  
  /** Drag force in lbf (DragForce) */
  dragForce_lbf: number;
  
  /** Body style (gc_BodyStyle.Value) - 8 = motorcycle (halves CRTF) */
  bodyStyle?: number;
}

/**
 * VB6 Traction Force Calculation
 * 
 * TIMESLIP.FRM lines 1213-1214:
 * ```vb
 * CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
 * If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
 * ```
 * 
 * Where AX = 10.8 for Quarter Jr/Pro (TIMESLIP.FRM line 551)
 * 
 * @param params - Traction parameters
 * @returns CRTF (tire traction force) in lbf
 */
export function computeCRTF(params: TractionParams): number {
  const {
    tireDia_in,
    tireWidth_in,
    dynamicRWT_lbf,
    tractionIndexAdj,
    bodyStyle,
  } = params;
  
  // VB6: CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
  // Use VB6_AX = 10.8 (Quarter Jr/Pro constant)
  const weightFactor = 0.92 + 0.08 * Math.pow(dynamicRWT_lbf / 1900, 2.15);
  let CRTF = tractionIndexAdj * VB6_AX * tireDia_in * (tireWidth_in + 1) * weightFactor;
  
  // VB6: If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
  if (bodyStyle === 8) {
    CRTF = 0.5 * CRTF;
  }
  
  return CRTF;
}

/**
 * VB6 Maximum Acceleration Calculation
 * 
 * TIMESLIP.FRM line 1216:
 * ```vb
 * AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
 * ```
 * 
 * Also line 1054:
 * ```vb
 * AMAX = (CRTF - DragForce) / gc_Weight.Value
 * ```
 * (No tire growth at initial calculation)
 * 
 * IMPORTANT: VB6 stores AMAX in g's, NOT ft/s²!
 * VB6 multiplies by gc when integrating velocity.
 * We convert to ft/s² for consistency with our integrator.
 * 
 * @param params - Traction parameters
 * @returns AMax in ft/s²
 */
export function computeAMaxVB6(params: TractionParams): number {
  const { weight_lbf, tireGrowth, dragForce_lbf } = params;
  
  const CRTF = computeCRTF(params);
  
  // VB6: AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
  // This gives AMax in g's
  const AMax_g = ((CRTF / tireGrowth) - dragForce_lbf) / weight_lbf;
  
  // Convert to ft/s² for our integrator
  const AMax_ftps2 = AMax_g * gc;
  
  return AMax_ftps2;
}

/**
 * VB6 Minimum Acceleration
 * 
 * VB6-LAUNCH-BLOCK-NOTES.md line 14:
 * ```vb
 * Const AMin = 0.004  'reduced from .05 to .004 for Qjr and QPro
 * ```
 * 
 * IMPORTANT: VB6 stores AMin in g's, NOT ft/s²!
 * The constant 0.004 is in g's (0.004g = 0.129 ft/s²).
 * We convert to ft/s² for consistency with our integrator.
 * 
 * @returns AMin in ft/s²
 */
export function computeAMinVB6(): number {
  // VB6 AMin = 0.004 g's
  const AMin_g = AMin_CONSTANT;
  // Convert to ft/s²
  const AMin_ftps2 = AMin_g * gc;
  return AMin_ftps2;
}

/**
 * VB6 Acceleration Clamping with Proportional PQWT Rescaling
 * 
 * TIMESLIP.FRM lines 1224-1228:
 * ```vb
 * If AGS(L) > AMAX Then
 *     SLIP(L) = 1
 *     PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
 * End If
 * If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
 * ```
 * 
 * Also lines 1262-1266 (same logic in HP path).
 * 
 * **AMax Clamp:**
 * - If AGS > AMax: `PQWT_new = PQWT * (2*AMax - AGS) / AGS`, `AGS_new = 2*AMax - AGS`
 * 
 * **AMin Clamp:**
 * - If AGS < AMin: `PQWT_new = PQWT * AMin / AGS`, `AGS_new = AMin`
 * 
 * @param AGS_candidate - Candidate acceleration before clamping (ft/s²)
 * @param PQWT_candidate - Candidate thrust before clamping (ft/s²)
 * @param AMin - Minimum acceleration (ft/s²)
 * @param AMax - Maximum acceleration (ft/s²)
 * @returns { AGS: clamped acceleration, PQWT: rescaled thrust, SLIP: 1 if slipping, 0 otherwise }
 */
export function clampAGSVB6(
  AGS_candidate: number,
  PQWT_candidate: number,
  AMin: number,
  AMax: number
): { AGS: number; PQWT: number; SLIP: number } {
  let AGS = AGS_candidate;
  let PQWT = PQWT_candidate;
  let SLIP = 0;
  
  // VB6: If AGS(L) > AMAX Then
  if (AGS > AMax) {
    SLIP = 1;
    // VB6: PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L)
    // Simplifies to: PQWT = PQWT * (2*AMAX - AGS) / AGS
    PQWT = PQWT * (AMax - (AGS - AMax)) / AGS;
    // VB6: AGS(L) = AMAX - (AGS(L) - AMAX)
    // Simplifies to: AGS = 2*AMAX - AGS
    AGS = AMax - (AGS - AMax);
  }
  
  // VB6: If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):  AGS(L) = AMin
  if (AGS < AMin) {
    PQWT = PQWT * AMin / AGS;
    AGS = AMin;
  }
  
  return { AGS, PQWT, SLIP };
}

/**
 * VB6 Traction Index Adjustment (CAXI)
 * 
 * TIMESLIP.FRM line 1037:
 * ```vb
 * CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
 * ```
 * 
 * Where TrackTempEffect is calculated from track temperature.
 * 
 * @param tractionIndex - VB6 traction index (1-10, typically 3)
 * @param trackTempEffect - Track temperature effect (typically 1.0)
 * @returns CAXI (traction index adjustment factor)
 */
export function computeCAXI(tractionIndex: number, trackTempEffect: number): number {
  // VB6: CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
  const CAXI = (1 - (tractionIndex - 1) * 0.01) / Math.pow(trackTempEffect, 0.25);
  return CAXI;
}

