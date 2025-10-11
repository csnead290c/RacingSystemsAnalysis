/**
 * VB6 Longitudinal Weight Transfer
 * 
 * VB6 Source: TIMESLIP.FRM:1037-1043, 1196-1211
 * 
 * Weight transfer affects traction by changing the load on the rear tires.
 * VB6 calculates dynamic front weight based on:
 * - Acceleration (AGS in g's)
 * - CG height (YCG)
 * - Wheelbase
 * - Tire radius
 * - Driveline friction (FRCT)
 * - Drag force
 * 
 * Dynamic rear weight = Total weight - Dynamic front weight - Wheelie bar weight
 */

/**
 * Calculate dynamic weight transfer to front axle
 * 
 * VB6: TIMESLIP.FRM:1037, 1199
 * deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
 * 
 * @param AGS_g - Acceleration in g's (VB6 stores AGS in g's, not ft/s²)
 * @param weight_lbf - Total vehicle weight (lb)
 * @param cg_height_in - CG height above ground (inches)
 * @param tire_radius_in - Tire radius (inches)
 * @param wheelbase_in - Wheelbase (inches)
 * @param drag_force_lbf - Drag force (lb)
 * @param frct - Driveline friction coefficient (typically 0.03-0.05)
 * @param driveline_eff - Overall driveline efficiency (typically 0.9-0.97)
 * @returns Weight transfer to front axle (lb)
 */
export function vb6WeightTransferToFront(
  AGS_g: number,
  weight_lbf: number,
  cg_height_in: number,
  tire_radius_in: number,
  wheelbase_in: number,
  drag_force_lbf: number,
  frct: number = 0.04,
  driveline_eff: number = 0.9
): number {
  // VB6: deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
  const accel_term = AGS_g * weight_lbf * ((cg_height_in - tire_radius_in) + (frct / driveline_eff) * tire_radius_in);
  const drag_term = drag_force_lbf * cg_height_in;
  const deltaFWT = (accel_term + drag_term) / wheelbase_in;
  
  return deltaFWT;
}

/**
 * Calculate dynamic rear weight with weight transfer
 * 
 * VB6: TIMESLIP.FRM:1047, 1200-1211
 * 
 * Static rear weight:
 *   StaticRWT = DownForce - gc_StaticFWt.Value
 *   If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
 * 
 * Dynamic calculation:
 *   DynamicFWT = gc_StaticFWt.Value - deltaFWT
 *   WheelBarWT = 0
 *   If DynamicFWT < 0 Then
 *       WheelBarWT = -DynamicFWT * gc_Wheelbase.Value / 64
 *       DynamicFWT = 0
 *   End If
 *   DynamicRWT = DownForce - DynamicFWT - WheelBarWT
 *   If DynamicRWT < 0 Then DynamicRWT = gc_Weight.Value
 * 
 * @param weight_lbf - Total vehicle weight (lb)
 * @param static_front_weight_lbf - Static front weight (lb)
 * @param AGS_g - Acceleration in g's
 * @param cg_height_in - CG height above ground (inches)
 * @param tire_radius_in - Tire radius (inches)
 * @param wheelbase_in - Wheelbase (inches)
 * @param drag_force_lbf - Drag force (lb)
 * @param downforce_lbf - Total downforce (weight + aero, lb)
 * @param frct - Driveline friction coefficient
 * @param driveline_eff - Overall driveline efficiency
 * @returns Dynamic rear weight (lb)
 */
export function vb6RearWeightDynamic(
  weight_lbf: number,
  static_front_weight_lbf: number,
  AGS_g: number,
  cg_height_in: number,
  tire_radius_in: number,
  wheelbase_in: number,
  drag_force_lbf: number,
  downforce_lbf: number,
  frct: number = 0.04,
  driveline_eff: number = 0.9
): { rear_weight_lbf: number; front_weight_lbf: number; wheelie_bar_weight_lbf: number } {
  // VB6: TIMESLIP.FRM:1199
  const deltaFWT = vb6WeightTransferToFront(
    AGS_g,
    weight_lbf,
    cg_height_in,
    tire_radius_in,
    wheelbase_in,
    drag_force_lbf,
    frct,
    driveline_eff
  );
  
  // VB6: TIMESLIP.FRM:1200
  let DynamicFWT = static_front_weight_lbf - deltaFWT;
  
  // VB6: TIMESLIP.FRM:1203-1208
  // Wheelie bar calculation (assumes 64" wheelie bar)
  let WheelBarWT = 0;
  if (DynamicFWT < 0) {
    WheelBarWT = -DynamicFWT * wheelbase_in / 64;
    DynamicFWT = 0;
  }
  
  // VB6: TIMESLIP.FRM:1211
  let DynamicRWT = downforce_lbf - DynamicFWT - WheelBarWT;
  if (DynamicRWT < 0) {
    DynamicRWT = weight_lbf;
  }
  
  return {
    rear_weight_lbf: DynamicRWT,
    front_weight_lbf: DynamicFWT,
    wheelie_bar_weight_lbf: WheelBarWT
  };
}

/**
 * Calculate static rear weight (for initial conditions)
 * 
 * VB6: TIMESLIP.FRM:1047
 * StaticRWT = DownForce - gc_StaticFWt.Value
 * If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
 * 
 * @param weight_lbf - Total vehicle weight (lb)
 * @param static_front_weight_lbf - Static front weight (lb)
 * @param downforce_lbf - Total downforce (weight + aero, lb)
 * @returns Static rear weight (lb)
 */
export function vb6StaticRearWeight(
  weight_lbf: number,
  static_front_weight_lbf: number,
  downforce_lbf: number
): number {
  // VB6: StaticRWT = DownForce - gc_StaticFWt.Value
  let StaticRWT = downforce_lbf - static_front_weight_lbf;
  
  // VB6: If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
  if (StaticRWT < 0) {
    StaticRWT = weight_lbf;
  }
  
  return StaticRWT;
}
