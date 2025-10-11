/**
 * VB6 Tire Growth Model
 * 
 * VB6 Source: TIMESLIP.FRM:1585-1607 (Tire subroutine)
 * 
 * Tire diameter increases with speed due to centrifugal force.
 * This affects:
 * - Effective gear ratio (higher speed = larger tire = lower effective ratio)
 * - Frontal area for drag (larger tire = more drag)
 * - Traction (CRTF / TireGrowth in AMax calculation)
 * 
 * VB6 also applies "tire squat" under load (reduces effective diameter).
 */

/**
 * Compute effective tire diameter and circumference with growth and squat
 * 
 * VB6: TIMESLIP.FRM:1585-1607
 * 
 * Quarter Jr/Pro formula:
 *   TGK = (TireWidth^1.4 + TireDia - 16) / (0.171 * TireDia^1.7)
 *   TireGrowth = 1 + TGK * 0.0000135 * Vel^1.6
 *   TGLinear = 1 + TGK * 0.00035 * Vel
 *   If TGLinear < TireGrowth Then TireGrowth = TGLinear
 *   TireSQ = TireGrowth - 0.035 * Abs(Ags0)  ' tire squat under load
 *   TireCirFt = TireSQ * TireDia * PI / 12
 * 
 * Units:
 * - tireDia_in: Tire diameter (inches)
 * - tireWidth_in: Tire width (inches)
 * - v_fps: Vehicle velocity (ft/s)
 * - ags_ftps2: Current acceleration (ft/s²) - used for squat
 * 
 * @param tireDia_in Static tire diameter (inches)
 * @param tireWidth_in Tire width (inches)
 * @param v_fps Vehicle velocity (ft/s)
 * @param ags_ftps2 Current acceleration (ft/s²) for squat calculation
 * @returns Effective tire dimensions with growth and squat
 */
export function computeTireGrowth(
  tireDia_in: number,
  tireWidth_in: number,
  v_fps: number,
  ags_ftps2: number
): {
  /** Tire growth factor (1.0 = no growth, 1.05 = 5% growth) */
  growth: number;
  /** Tire squat factor (growth - squat under load) */
  squat: number;
  /** Effective tire diameter with growth and squat (inches) */
  dia_eff_in: number;
  /** Effective tire radius with growth and squat (feet) */
  radius_eff_ft: number;
  /** Effective tire circumference with growth and squat (feet) */
  circumference_eff_ft: number;
} {
  const PI = Math.PI;
  
  // VB6: TGK = (gc_TireWidth.Value ^ 1.4 + TireDia - 16) / (0.171 * TireDia ^ 1.7)
  const TGK = (Math.pow(tireWidth_in, 1.4) + tireDia_in - 16) / (0.171 * Math.pow(tireDia_in, 1.7));
  
  // VB6: TireGrowth = 1 + TGK * 0.0000135 * Vel(L) ^ 1.6
  let tireGrowth = 1 + TGK * 0.0000135 * Math.pow(v_fps, 1.6);
  
  // VB6: TGLinear = 1 + TGK * 0.00035 * Vel(L)
  // '0.00035 works better based on Motown Missile
  const TGLinear = 1 + TGK * 0.00035 * v_fps;
  
  // VB6: If TGLinear < TireGrowth Then TireGrowth = TGLinear
  if (TGLinear < tireGrowth) {
    tireGrowth = TGLinear;
  }
  
  // VB6: TireSQ = TireGrowth - 0.035 * Abs(Ags0)  'tire squat under load
  // Convert ags_ftps2 to g's for squat calculation (VB6 Ags0 is in g's)
  const ags_g = ags_ftps2 / 32.174;
  const tireSQ = tireGrowth - 0.035 * Math.abs(ags_g);
  
  // VB6: TireCirFt = TireSQ * TireDia * PI / 12
  const tireCirFt = tireSQ * tireDia_in * PI / 12;
  
  // Calculate effective diameter and radius
  // VB6: TireRadIn = 12 * TireCirFt / (2 * PI)
  const tireRadIn = 12 * tireCirFt / (2 * PI);
  const dia_eff_in = 2 * tireRadIn;
  const radius_eff_ft = tireRadIn / 12;
  
  return {
    growth: tireGrowth,
    squat: tireSQ,
    dia_eff_in,
    radius_eff_ft,
    circumference_eff_ft: tireCirFt,
  };
}

/**
 * Compute increased frontal area due to tire growth
 * 
 * VB6: TIMESLIP.FRM:1184-1189
 * 
 * If gc_BodyStyle.Value = 8 Then  ' Motorcycle
 *     RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * gc_TireWidth.Value / 144
 * Else  ' Car (2 tires visible)
 *     RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * (2 * gc_TireWidth.Value) / 144
 * End If
 * 
 * @param baseRefArea_ft2 Base frontal area (ft²)
 * @param tireGrowth Tire growth factor (from computeTireGrowth)
 * @param tireDia_in Static tire diameter (inches)
 * @param tireWidth_in Tire width (inches)
 * @param isMotorcycle True for motorcycle (1 tire), false for car (2 tires)
 * @returns Effective frontal area with tire growth (ft²)
 */
export function computeRefAreaWithTireGrowth(
  baseRefArea_ft2: number,
  tireGrowth: number,
  tireDia_in: number,
  tireWidth_in: number,
  isMotorcycle: boolean
): number {
  // VB6: ((TireGrowth - 1) * TireDia / 2) * gc_TireWidth.Value / 144
  const tireGrowthArea_in2 = ((tireGrowth - 1) * tireDia_in / 2) * tireWidth_in;
  
  // Multiply by 2 for cars (both rear tires visible), 1 for motorcycles
  const numTires = isMotorcycle ? 1 : 2;
  const totalGrowthArea_in2 = tireGrowthArea_in2 * numTires;
  
  // Convert to ft² (divide by 144)
  const totalGrowthArea_ft2 = totalGrowthArea_in2 / 144;
  
  // VB6: RefArea2 = gc_RefArea.Value + ...
  return baseRefArea_ft2 + totalGrowthArea_ft2;
}
